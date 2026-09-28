# Task 3 — Endurecer Hono como autoridad de mutaciones

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 3)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-03-api-authority.md`

- **Scope:** `fix`
- **Pre-existing:** middleware auth Hono, helper CSRF (`packages/auth/src/csrf.ts`), envelope (`apps/api/src/errors.ts`, `envelope.ts`), schemas `@recetario/types`, helpers de plan `@recetario/stripe`, handlers de recetas/ingredientes/preferencias/billing, tests Vitest de api/auth/db/stripe.
- **Dependencies:** Task 1 (completada). Task 2 ya estaba en HEAD y no solapó.
- **Parallel-safe:** sí, con Task 2 (cerrada). Tasks 7 y 8 dependen de ésta.

## Resultado

Hono pasa a ser la autoridad real de CSRF, límites de plan y feature gates. Antes, de ~26 mutaciones solo `checkout`/`portal` validaban token CSRF y los límites se aplicaban **solo en el frontend Astro** (bypassables con una llamada directa). Ahora todo método mutante pasa por un middleware CSRF con excepciones explícitas, los límites/gates se aplican en el handler y los errores plan-specific viajan como códigos diferenciados.

| Elemento | Valor |
|---|---|
| HEAD base de la Task | `92386e2` (rama `worktree-nuxt-rework`, árbol limpio) |
| Entorno | Node `v22.23.1`, pnpm `11.1.2` |
| Códigos nuevos | `PLAN_LIMIT`, `FEATURE_REQUIRED` → HTTP 403 |
| Tests | api **201** (36 archivos) · auth **31** (5) · stripe 66 · db 39 · web 62 |
| Checks | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7 |

## Pasos ejecutados

1. **CSRF autoritativo.** `packages/auth/src/csrf.ts` expone `extractCsrfCookie`, `getTrustedOrigins` y `resolveRequestOrigin`; `validateCsrf` acepta header **o** campo de formulario y compara con `timingSafeEqual`. `packages/auth/src/auth.ts` deriva `trustedOrigins` del mismo helper (una sola fuente de verdad con Better Auth).
2. **Middleware** `apps/api/src/middleware/csrf.ts` (`csrfProtection()`), montado tras `hostAllowlist()`: rechaza `Sec-Fetch-Site: cross-site`, exige origen confiable cuando hay `Origin`/`Referer` y exige doble-submit si la petición viene de navegador y trae cookies. Exentos: `POST /api/stripe/webhook` y `/api/auth/**` (solo de la regla de token). Se retiró el `validateCsrf` manual de `billing/checkout.ts` y `billing/portal.ts`.
3. **Cliente Astro**: los 3 fetch de `/api/account/*` en `SettingsContent.astro` envían `x-csrf-token` (leído de la cookie, como BillingSection).
4. **Límites/gates**: nuevo `apps/api/src/entitlements.ts` — `resolveSubscription` (fail-closed al plan free), `requireRecipeCapacity`, `requireIngredientCapacity`, `requireFeature`. Wiring en `recipes/create.ts`, `ingredients/create.ts` y `recipes/duplicate.ts` (feature **y** capacidad, en una sola resolución de suscripción).
5. **Códigos diferenciados**: `PLAN_LIMIT` y `FEATURE_REQUIRED` añadidos al union TS y al enum Zod de `@recetario/types`; `codeToStatus` los mapea a 403.
6. **Preferencias**: contrato fijado con test — un `PUT` parcial devuelve la fila persistida (no eco del request). Sin cambios de código: la respuesta ya era la fila validada.
7. **Auditoría**: `recordSignInAudit` (`packages/auth/src/session-audit.ts`) corre en `databaseHooks.session.create.after`; se eliminó el detector por path del middleware Astro.
8. **Billing**: `checkout`, `portal` y `sync-session` lanzan `ApiError` (envelope) en vez de `{ error: "string" }`; los 500 loguean el detalle y devuelven mensaje genérico.
9. **Verificación** completa + `git status` acotado a la Task.

## Desviaciones respecto del plan

| # | Desviación | Motivo |
|---|---|---|
| 1 | `validateCsrf` acepta header **o** campo (antes el campo desactivaba el header) y compara en tiempo constante | El middleware necesita el header para JSON y el campo para forms; unificar en una primitiva evita duplicar la comparación |
| 2 | La regla de token exige **cualquier** cookie (no solo `csrf_token`) en peticiones de navegador | Evita el punto ciego de una cookie CSRF caducada con sesión viva; la cookie se re-emite en cada carga autenticada |
| 3 | `resolveSubscription` es exportado y los guards aceptan una suscripción ya resuelta | El duplicado resolvía la suscripción dos veces (detectado por un test que devolvía 404); ahora es una sola lectura |
| 4 | Los fetch de cuenta leen `document.cookie` en vez de usar el prop `csrfToken` | El prop no existe dentro del `<script>` empaquetado de Astro; es el patrón ya usado en `BillingSection`/`PricingModal` |
| 5 | Tests extra a los previstos | Integración del montaje en `index.test.ts` (origen no confiable, token ausente, petición interna), mapeo de `codeToStatus` y caso de suscripción pre-resuelta |
| 6 | `sign_up` no se registra | Decisión aprobada: toda sesión nueva es `sign_in`; el enum `audit_logs.sign_up` sigue sin uso (follow-up) |
| 7 | No se tocó `packages/db` | Los guards reutilizan `countUserRecipes`/`countUserIngredients`; no hizo falta persistencia nueva |

## Verificación

| # | Comando | Resultado |
|---|---|---|
| 1 | `pnpm --filter @recetario/db generate` | Prisma 7.8.0 generado en worktree limpio |
| 2 | `pnpm --filter @recetario/auth test` | 5 archivos, **31 tests verdes** (17 CSRF, 2 auditoría, 2 wiring de auth, 10 preexistentes) |
| 3 | `pnpm --filter @recetario/api test` | 36 archivos, **201 tests verdes** (15 middleware CSRF, 9 entitlements, 15 casos nuevos en handlers/index) |
| 4 | `pnpm lint` (raíz) | 6/6 tareas, 0 errores |
| 5 | `pnpm type-check` (raíz) | 7/7 tareas (`tsc --noEmit` api + `nuxt typecheck`) |
| 6 | `pnpm test` (raíz) | 10/10 tareas: api 201, auth 31, stripe 66, db 39, web 62 |
| 7 | `pnpm build` (raíz) | 7/7 tareas; build Nuxt/Nitro completo |
| 8 | `grep` de los archivos Astro editados | `detectSignInEvent`/`SIGN_IN_PATHS`/`clientIp` ya no existen en `middleware.ts`; `csrfHeaders()` en los 3 fetch de cuenta |
| 9 | `git status` | solo archivos de esta Task (28 modificados, 7 nuevos) |

Evidencia de la política CSRF (tests de tabla en `apps/api/src/middleware/csrf.test.ts`): origen confiable + token válido → pasa; origen confiable + cookie sin token → 403 `FORBIDDEN`; origen no confiable o `null` → 403; `Sec-Fetch-Site: cross-site` → 403; petición sin `Origin` (interna/SSR) → pasa; `/api/auth/sign-in/*` con cookie y sin token → pasa (exento) pero un origen no confiable se rechaza; webhook Stripe exento. La integración con el app real está en `apps/api/src/index.test.ts` (`describe("CSRF authority")`).

## Paridad responsive / QA visual

**No aplica.** No se modificó markup, estilos ni estados de ninguna página: los cambios en `apps/web` son un header HTTP adicional en 3 fetch y el borrado de código muerto (el DOM renderizado no cambia). No se levantó `pnpm dev`; no quedan procesos ni puertos abiertos.

## Riesgos y rollback

| Riesgo | Estado |
|---|---|
| El middleware rompe flujos de navegador | Auditados endpoint por endpoint; solo los 3 fetch de cuenta necesitaban token y se actualizaron. `/api/auth/**` exento de token |
| Trust list mal configurada en prod | Se reutiliza la lista de Better Auth (`getTrustedOrigins`); en tests aplican los defaults dev |
| Cliente estricto rechaza códigos nuevos | Union TS + enum Zod actualizados en el mismo commit; `codeToStatus` probado |
| TOCTOU de límites | Aceptado y documentado: count→create no es atómico (cuota de producto, no frontera de seguridad) |
| Ediciones Astro sin cobertura de checks | Cambios mínimos, verificados por revisión y grep; el árbol Astro sigue fuera de build/lint |
| Test preexistente sensible al entorno | `apps/api/src/billing/portal.test.ts` falla si el shell exporta `WEB_ORIGIN` (el agente carga `.env`); **verificado que falla igual en HEAD** y CI no define esas variables |

**Rollback:** `git revert` de los commits de la Task. Nada toca DB, migraciones ni deploy; el middleware se puede desactivar quitando su `app.use`, y los códigos nuevos son aditivos.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit | Contenido |
|---|---|
| `feat(api): exigir origen y token CSRF en las mutaciones` | `csrf.ts` + middleware + montaje + retiro en billing + headers en `SettingsContent.astro` + tests |
| `feat(types): agregar los códigos PLAN_LIMIT y FEATURE_REQUIRED` | union TS, enum Zod y `codeToStatus` |
| `feat(api): hacer autoritativos los límites de plan y el duplicado` | `entitlements.ts` + wiring en 3 handlers + tests |
| `test(api): fijar el contrato de preferencias persistidas` | test del PUT parcial |
| `refactor(api): normalizar los errores de billing al envelope` | checkout/portal/sync-session + tests |
| `fix(auth): auditar el sign-in desde el hook de sesión` | `session-audit.ts`, `databaseHooks`, retiro del detector por path |
| `docs(api): registrar la task 03 y la autoridad de mutaciones` | este task file, `AGENTS.md`, `apps/api/README.md`, anotación C-01 |

## Follow-ups para las próximas sesiones

1. **Task 4**: el relay debe reenviar verbatim `Origin`/`Cookie`/`x-csrf-token` (el middleware ahora los exige) y las mutaciones de cliente deben implementar cookie+header CSRF.
2. **Tasks 7/8/11**: mapear `PLAN_LIMIT` → CTA de upgrade y `FEATURE_REQUIRED` → error genérico (403) en la UI Nuxt; conservar los textos en español que hoy construye Astro.
3. **Task 11**: normalizar los `c.text(...)` de `/api/account/*` y el `{ ok: false }` de `sync-session` al envelope; consumir preferencias desde `GET/PUT /api/preferences`/`session.preferences`, nunca desde cookies.
4. `sign_up` sigue sin registrarse en `audit_logs`; decidir si `databaseHooks.user.create.after` debe escribirlo.
5. `reason` en `ApiErrorResponse` no valida contra `DOMAIN_ERROR_REASONS` (el comentario de `reasons.ts` es incorrecto): unificar en una sesión de deuda.
6. Gates que siguen siendo UI-only y fuera del alcance de esta Task: `production_planner` y el tope de 3 recetas de Basic en el planificador (Task 12).
7. La cookie `csrf_token` tiene `maxAge` de 1 h re-emitida en cada carga autenticada; si una mutación de cliente se hace con la cookie caducada, el API responde 403 `CSRF validation failed` (recargar re-emite). Evaluar extender el TTL si molesta en uso real.
   - **Deuda CSRF: RESUELTA tras la sesión** (ver `docs/tasks/task-20260919-0945-csrf-token-expiry.md`). El TTL pasó a 7 días (la vida de la sesión) y la web renueva el token a demanda con `GET /api/csrf` antes de mutar: ya no hace falta recargar. La política de la cookie vive en `csrfCookieOptions`/`resolveCsrfToken` de `@recetario/auth`.
