# Task — Fix: `csrf_token` duraba 1 h (403 `CSRF validation failed` al guardar)

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `docs/tasks/task-20260911-1823-api-authority.md` (autoridad CSRF del API; aquí nació el TTL de 1 h) y `docs/tasks/task-20260912-0925-cloudflare-shell.md` (bootstrap de sesión, cookies y relay).
Plan de sesión: `~/.commandcode/plans/csrf-token-expiry-fix.md`

- **Scope:** `fix` (bug de producción) + `extends-existing` de `@recetario/auth`, del API y del cliente de la web. Sin features nuevas ni cambios de UI.
- **Pre-existing:** cadena de doble-submit (`apps/api/src/middleware/csrf.ts` + `packages/auth/src/csrf.ts`), mint y renovación de cookies en `apps/web/server/middleware/10.auth.ts`, transporte unificado `useApi()`/`apiFetch`, infra e2e con stub (`test/e2e/support/stub-api.mjs` + fixtures `__qa/*`), y la deuda registrada en `task-20260911-1823` §104 y `task-20260912-0925` §145.
- **Dependencies:** — (las predecesoras ya estaban hechas).
- **No hizo:** reintento automático tras un 403 CSRF, código de error `CSRF_INVALID`, renovación deslizante del token en el relay de `/api/**` ni token atado a sesión (ver «Decisiones»).
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, worktree `worktree-nuxt-rework`. Los e2e corren con un build real de Nuxt (`preset: node-server`) contra el stub en `:8788`.

## Resultado

Guardar una receta ya no depende de recargar la pestaña:

- **El token vive lo que la sesión:** `CSRF_COOKIE_MAX_AGE` pasa de 1 h a **7 días** (el `expiresIn` de la sesión de Better Auth), definido una sola vez en `packages/auth/src/csrf.ts` y consumido por los dos emisores de la cookie.
- **Emisión a demanda:** `GET /api/csrf` (Hono, auth requerida) reemite la cookie **conservando el valor** existente cuando el cliente se lo pide. El valor no viaja en el JSON: el cliente lo relee de `document.cookie`.
- **Pre-flight en el cliente:** `useApi()` llama a `ensureCsrfToken()` antes de toda mutación; si el token ya está, no hay red. La renovación es **single-flight a nivel de módulo** (varias instancias de `useApi()` de la misma página comparten una sola petición) y **sólo en cliente** (en SSR no hay cookie jar y el API exime las peticiones sin `Origin`).
- **Política única:** atributos (`Path=/`, `SameSite=Strict`, sin `HttpOnly`, `Secure` según el protocolo del request) y regla de valor compartidos por el middleware de Nitro y por el endpoint, así que no pueden divergir. Se retira `setCsrfCookieHeader` (código muerto, con su propio `Max-Age=3600` y `Secure` por `NODE_ENV`).
- **El stub de e2e deja de ser permisivo** en recetas e ingredientes: compara `x-csrf-token` con la cookie (paridad con `validateCsrf`) y emite `csrf_token` en `GET /api/csrf`, así que la regresión queda cubierta de verdad.

## Diagnóstico

Cadena causal del 403 reportado (receta visible y correcta, guardado rechazado, arreglo temporal al recargar):

1. `apps/api/src/middleware/csrf.ts:78-95` — toda mutación de navegador con cookies exige doble-submit: `x-csrf-token` debe coincidir con la cookie `csrf_token`. El mensaje `CSRF validation failed` sólo sale de `validateCsrf()`, luego el `Origin` era de confianza y la sesión válida: lo que faltaba era el token.
2. `apps/web/app/composables/useApi.ts:27` + `apps/web/app/utils/api-client.ts:35-41` — el header se armaba leyendo `document.cookie` en el momento de la llamada: sin cookie, la mutación salía sin header y sin señal.
3. `apps/web/server/middleware/10.auth.ts:32` — `CSRF_COOKIE_MAX_AGE = 3600` (1 hora) frente a los 7 días de la sesión.
4. `apps/web/server/utils/session-state.ts:13-20` (`isDocumentRequest`) — la cookie sólo se emite o renueva en documentos HTML con sesión; `/api/**` y las navegaciones SPA no la tocaban.

Consecuencia: cualquier documento de más de 1 hora (edición larga, pestaña restaurada del bfcache, portátil cerrado y reabierto) fallaba **todas** las mutaciones y los reintentos seguían fallando, porque el token no se regeneraba solo. Coincide con la evidencia del reporte: `Actualizado` con fecha vieja mientras la página se veía completa (la sesión sobrevive al token).

## Contratos nuevos

| Contrato | Definición |
|---|---|
| `GET /api/csrf` | 200 `{ ok: true }` + `Set-Cookie: csrf_token=<64 hex>; Path=/; Max-Age=604800; SameSite=Strict` (sin `HttpOnly`, `Secure` sólo en https). 401 `UNAUTHENTICATED` sin sesión. Conserva el token que ya venía. |
| `CSRF_COOKIE_MAX_AGE`, `csrfCookieOptions(secure)`, `resolveCsrfToken(existing)` | `packages/auth/src/csrf.ts`, exportados por los barrels `@recetario/auth` y `@recetario/auth/server`. |
| `createCsrfEnsurer({ getToken, refresh })` → `ensureCsrfToken()` | `apps/web/app/utils/csrf.ts`; estado single-flight a nivel de módulo, errores del refresh propagados (los mapea el `resolve*Error` de cada feature). |

## Decisiones

| # | Decisión | Origen |
|---|---|---|
| 1 | El endpoint va en **Hono** (relayado) y no en Nitro: `/api/**` es del API por contrato y en la web se haría shadowing al relay. | Plan aprobado |
| 2 | **Sin** reintento automático tras 403 CSRF ni código `CSRF_INVALID`: con el pre-flight no existe el caso «header ausente», y «cookie presente pero rechazada» no puede ocurrir porque el mint siempre conserva el valor (no hay rotación). Habría sido tocar contrato público para un estado imposible. | Plan aprobado |
| 3 | **Sin** renovación deslizante en el relay: el middleware de Nitro no controla los headers de la `Response` que devuelve el relay (depende de la emulación de h3/workerd). El `Set-Cookie` **del API** sí viaja por el relay — así funcionan ya las cookies de sesión. | Plan aprobado |
| 4 | El pre-flight corre **antes** de la mutación y el token se relee después; si tras el refresh sigue sin haber cookie, la petición sale igual y responde el 403 del API (no se inventan errores en cliente). | Plan aprobado |

## Pasos ejecutados

1. `packages/auth/src/csrf.ts`: `CSRF_COOKIE_MAX_AGE` (7 días), `csrfCookieOptions(secure)`, `resolveCsrfToken(existing)`; fuera `setCsrfCookieHeader`; barrels `server.ts`/`index.ts` y `README.md` al día; 4 tests nuevos.
2. `apps/api/src/csrf/handler.ts` (nuevo) + montaje en `apps/api/src/index.ts` (`app.use("/api/csrf", requireAuth())` y `app.get(...)` **después** de los middleware); 4 tests de integración en `index.test.ts`; bloque CSRF e inventario de endpoints en `apps/api/README.md`.
3. `apps/web/app/utils/csrf.ts` (nuevo) y `useApi()` con el pre-flight client-only; `10.auth.ts` consumiendo el helper compartido (y por tanto el TTL nuevo); 4 tests unitarios en `test/unit/csrf.spec.ts`.
4. Stub e2e: `GET /api/csrf`, fixtures `POST /api/__qa/csrf/reset` + `GET /api/__qa/csrf/state` con contador `mintAttempts`, `csrfAllowed` comparando header y cookie, y guard único antes de los handlers de recetas e ingredientes (paridad con el middleware global de Hono).
5. e2e: dos tests nuevos en `recipe-detail.spec.ts` (cookie borrada → guarda renovando el token; token presente → no se pide uno nuevo) y assert del `Max-Age`/atributos en `shell.spec.ts`.
6. Documentación: este task file, cierre de las dos deudas y bloque CSRF de `AGENTS.md`.

## Desviaciones respecto del plan

| # | Desviación | Motivo |
|---|---|---|
| 1 | El `app.get("/api/csrf", ...)` se registra después de los bloques `app.use(..., requireAuth())`, no junto a `GET /api/auth/session`. | En Hono el middleware debe registrarse antes que el handler; en el primer intento la ruta quedaba fuera del `requireAuth()` y el 401 sin sesión no se cumplía. |
| 2 | El guard del stub es **uno solo** antes de las secciones de recetas e ingredientes, en vez de un `csrfAllowed` por handler. | El middleware de Hono es global; un punto de control único da la misma cobertura sin repetir el mismo `if` en 12 handlers. |
| 3 | El stub compara el token con la cookie, no sólo su presencia. | Sin la comparación el test de regresión pasaba en falso: el bug era de sincronización, no de cabecera ausente. |
| 4 | El test de regresión se validó con una **prueba de mutación**: con el pre-flight desactivado a mano, el e2e nuevo falla (no aparece «Receta guardada correctamente.»). | Acredita que el test cubre el bug y no el camino feliz por casualidad. |
| 5 | `firefox-smoke` no se pudo validar en esta máquina. | `browserType.launch` agota 180 s con `sandbox_extension_issue_file_to_process failed`: el navegador no arranca en este entorno. El fallo es previo a cualquier test y queda para CI. |

## Verificación

| # | Comando | Esperado | Resultado |
|---|---|---|---|
| 1 | `pnpm --filter @recetario/auth test` | Tests del helper nuevo | ✅ 35 tests / 5 ficheros |
| 2 | `pnpm --filter @recetario/auth build` | Sin errores de tipos | ✅ |
| 3 | `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test` | 401/200 de `/api/csrf` y suite del API | ✅ 220 tests / 37 ficheros (4 nuevos) |
| 4 | `pnpm --filter @recetario/api type-check` | Sin errores de tipos | ✅ |
| 5 | `pnpm --filter @recetario/web test` | `unit` + `nuxt` en verde | ✅ 668 tests / 50 ficheros (4 nuevos) |
| 6 | `pnpm --filter @recetario/web type-check` | Sin errores de tipos | ✅ |
| 7 | `pnpm --filter @recetario/web test:e2e` | Suite completa con el stub endurecido | ✅ chromium y webkit-smoke en verde (151) · ❌ 2 `firefox-smoke` por arranque del navegador (desviación #5) |
| 8 | `pnpm --filter @recetario/web exec playwright test test/e2e/recipe-detail.spec.ts --project=chromium` | Tests nuevos en verde | ✅ 16 tests (2 nuevos) |
| 9 | Prueba de mutación (pre-flight desactivado) | El test de regresión debe fallar | ✅ falla sin guardado |
| 10 | `pnpm lint` | Sin errores | ✅ 6/6 tasks |
| 11 | `pnpm --filter @recetario/web build` + `wrangler:dry-run` | El worker sigue construyendo | ✅ dry-run con binding `API` y assets |

## Riesgos y rollback

| Riesgo | Mitigación |
|---|---|
| El stub endurecido rompe specs existentes de recetas/ingredientes | Suite completa corrida: sólo cayeron los `firefox-smoke` por arranque del navegador. Un endurecimiento así se vería en los 5 specs que mutan esos dominios. |
| Dos escritores de la misma cookie (middleware y API) con políticas divergentes | Ambos usan `csrfCookieOptions`/`resolveCsrfToken` de `@recetario/auth`; el test del endpoint fija atributos y TTL. |
| Una llamada extra por mutación | Sólo cuando falta el token; con el TTL de 7 días es residual. |
| Rollback | Revertir el commit del cliente devuelve el comportamiento anterior; el TTL largo por sí solo es inocuo (la cookie sigue siendo de doble-submit y `SameSite=Strict`). |

## Commits

| Commit | Contenido |
|---|---|
| `fix(auth): cookie CSRF con la vida de la sesión y emisión compartida` | `packages/auth/src/{csrf,server,index}.ts`, `csrf.test.ts`, `README.md` |
| `feat(api): reemitir la cookie CSRF a demanda` | `apps/api/src/csrf/handler.ts`, `index.ts`, `index.test.ts`, `README.md` |
| `fix(web): renovar el token CSRF antes de mutar` | `apps/web/app/utils/csrf.ts`, `useApi.ts`, `server/middleware/10.auth.ts`, `test/unit/csrf.spec.ts` |
| `test(web): stub e2e con doble-submit real y regresión del token` | `test/e2e/support/stub-api.mjs`, `recipe-detail.spec.ts`, `shell.spec.ts` |
| `docs(nuxt): registrar la task del fix CSRF y cerrar la deuda` | este task file, las dos deudas y `AGENTS.md` |

## Hallazgos abiertos y quién los atiende

| # | Hallazgo | Dónde se manifiesta | Dueño | Cómo se cierra |
|---|---|---|---|---|
| 1 | `firefox-smoke` no arranca en la máquina de la sesión | `playwright test --project=firefox-smoke` (timeout de `browserType.launch`) | CI | **Explícito**: el job `e2e` de `ci.yml` instala navegadores con `--with-deps` y ya cubre los tres projects |
| 2 | El relay no renueva el token por su cuenta | Una edición de días en una pestaña sin llamadas de mutación | — | **Aceptado**: el pre-flight lo cubre; sin coste mientras la cookie viva la sesión |
| 3 | Aviso de esbuild (`failed` duplicado) al hacer `wrangler:dry-run` | `.output/server/chunks/build/produccion-*.mjs` | — | **De paso**: es un aviso, no un error, y viene del árbol de producción ajeno a esta task |
