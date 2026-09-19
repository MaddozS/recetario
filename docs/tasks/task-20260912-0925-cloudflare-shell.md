# Task 4 — Relay Cloudflare, bootstrap de sesión y shell autenticado

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 4)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-04-cloudflare-shell.md`

- **Scope:** `extends-existing`
- **Pre-existing:** `apps/web` sobre Nuxt 4.5.2 (Task 2: shell vacío, 15 rutas placeholder, 13 componentes UI, tokens/CSS, Vitest 5 + Playwright, `wrangler.nuxt.jsonc` con binding `API`), Hono autoritativo para CSRF/límites/features (Task 3), árbol Astro de referencia.
- **Dependencies:** Tasks 2 y 3 (completadas). HEAD base de la Task: `e2a582f`, árbol limpio.
- **Parallel-safe:** no. Tasks 5 y 6 dependen de ésta.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`.

## Resultado

`apps/web` es ya un cliente SSR real de Hono: el relay `/api/**` funciona sobre el service binding con fallback HTTP en dev, el bootstrap de sesión resuelve usuario/suscripción/preferencias por request y el shell autenticado (header, breadcrumbs, sidebar, drawer, bottom nav, logout, tema/acento, progreso) está portado a Vue con `private, no-store` + `noindex,nofollow`.

| Elemento | Valor |
|---|---|
| Worktree | `/Users/maddozs/personal-projects/recetario-nuxt-rework` |
| Tests web | **117** (unit 49, nuxt 68) — antes 62 |
| E2E web | **22** (relay 10, shell 10, smoke 2) |
| Checks raíz | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7 |
| Bundle Nitro | `.output/server/index.mjs` + `.output/public`; dry-run 704.98 KiB (175.25 KiB gzip), bindings `API`, `ASSETS`, `NODE_ENV` |
| Bundle cliente | 460 kB; **sin** Prisma, `@recetario/db`, Stripe SDK, `better-auth` ni `node:crypto` |

## Pasos ejecutados

1. **Subpaths aditivos en paquetes compartidos.** `packages/stripe` → `"./subscription"` (módulo puro, sin SDK ni DB). `packages/auth` → `"./csrf"` y `"./csrf-client"` (el barrel `@recetario/auth` arrastra `better-auth/client` y módulos con DOM al grafo del servidor).
2. **Tooling de dev.** `scripts/sync-cloudflare-dev-vars.mjs` limpia `.vite-cache/web` (nuevo `vite.cacheDir`) y vuelve a ejecutarse en `pnpm dev` (había quedado huérfano tras Task 2); `apps/web/package.json` lo encadena antes de `nuxt dev`.
3. **Configuración de Nuxt.** `runtimeConfig.internalApiUrl`, `nitro.cloudflare.dev.configPath = ./wrangler.nuxt.jsonc` (evita que el dev proxy lea el wrangler de Astro), `build.transpile` de los cuatro paquetes workspace.
4. **Relay.** `server/utils/api-transport.ts` (núcleo puro `forwardApiRequest` + resolvedores + `relayApiRequest` + `callApi`) y `server/routes/api/[...path].ts`. Preserva método, URL/host, query, body/stream, `Cookie`, `Origin`, `Referer`, `Sec-Fetch-Site`, `x-csrf-token`, `Content-Type`, status, `Location` y todos los `Set-Cookie`; nunca reconstruye la `Response` del API; responde 502/500 con el envelope compartido + `setSecurityHeaders`.
5. **Bootstrap de sesión.** `server/middleware/10.auth.ts` + `server/utils/session-state.ts`: resuelve `GET /api/auth/session`, aplica preferencias cookie-first, re-emite `kitchcalc-theme`/`kitchcalc-accent`/`csrf_token` y aplica `private, no-store` + `X-Robots-Tag` a las rutas privadas.
6. **Estado y tema en la app.** `useAuth` (con `resolveSession()` idempotente), `useTheme`, `useSocketCollapsed`, `useApi` (cliente tipado universal con CSRF y manejo de 401), `app/utils/api-client.ts`, `api-error.ts`, `cookies.ts`, `app/types/route-meta.d.ts`, plugins `auth.server` + `theme.client`, middlewares de ruta `auth` + `guest`, y `app.vue` como dueño único de los atributos de `<html>`.
7. **Shell.** `AppHeader`, `AppSidebar`, `AppBottomNav`, `AppBreadcrumbs`, `NavProgressBar`, `SignOutButton`, `AppLoadingOverlay`, `layouts/private.vue` y `definePageMeta` en las 6 rutas privadas. El drawer, el colapso y el estado activo son estado Vue; nada de `MutationObserver`, `window.__*`, `data-*-bound` ni listeners `astro:*`.
8. **Tests.** Unit del transporte/sesión/preferencias/navegación/cliente; componentes del shell; e2e del relay con un stub del API (`test/e2e/support/stub-api.mjs` + `globalSetup`) y del shell (SSR, drawer, colapso, login/logout, gating por plan).
9. **Verificación completa** + QA visual 375/1280 claro/oscuro con usuario real.

## Hallazgos (2 bugs reales encontrados por los tests)

| # | Hallazgo | Estado |
|---|---|---|
| 1 | **Sidebar fuera de pantalla en escritorio**: el `-translate-x-full` del drawer móvil no se neutralizaba en `md`, así que la sidebar 220px quedaba en `x = -64..-220` en desktop. Lo detectó el e2e de colapso (el botón quedaba "outside of the viewport"). | **Arreglado** en esta Task (`md:translate-x-0` + `md:max-w-none`) |
| 2 | **Primer render SSR tras arrancar el proceso fallaba**: `Cannot destructure property 'size' of 'useLucideProps(...)'`. Los componentes de `@lucide/vue` son componentes funcionales que leen su contexto con `inject()`; cuando el ícono se renderiza dentro del `Suspense` de un **layout**, esa primera pasada no encuentra la instancia de Vue y devuelve 500. Se reprodujo de forma determinista (primer request a una ruta con layout) y se acotó por bisección: ícono en página → 200; ícono en layout → 500; cualquier otro componente funcional con `inject` en el layout → 200. | **Arreglado**: los íconos se componen desde los datos de lucide (`__iconData`) con un renderer propio, sin componentes ni `inject` (ver Desviación 13). El e2e corre en frío sin warm-up |

## Desviaciones respecto del plan

| # | Desviación | Motivo |
|---|---|---|
| 1 | Las cabeceras privadas se aplican en `server/middleware/10.auth.ts` con `setHeaders`, no con `routeRules` | `routeRules.headers` no llegan al server que usa el fixture e2e (mismo build, sin cabeceras); `setHeaders` es el mismo mecanismo que las cookies, ya verificado en dev, e2e y build real |
| 2 | El estado de sesión no viaja sólo por `event.context.auth`: `useAuth.resolveSession()` lo resuelve por sí mismo | En el build servido por el fixture el evento que ve la app **no comparte `context`** con el middleware de Nitro (`ctxKeys` sin `auth`), así que el guard lee el contexto y, si no está, llama a `/api/auth/session` con `useRequestFetch()`/`$fetch` + Zod (idempotente por request) |
| 3 | Cookies de preferencias y de sidebar se leen de la cabecera `Cookie`/`document.cookie` (`app/utils/cookies.ts`), no con `useCookie` | `useCookie` no ve el request original en este runtime: el SSR pintaba `data-collapsed="0"` con la cookie presente y las preferencias se quedaban sin cookie-first |
| 4 | El e2e configura `process.env.INTERNAL_API_URL` y `env: { NODE_ENV: "production" }`, y `getTransportOptions` lee `process.env` | El `nuxtConfig` del fixture no sobrevive al build (quedaba `http://localhost:8787` horneado) y el default `NODE_ENV=test` hace que Vue resuelva su build de desarrollo (SSR inestable) |
| 5 | `useSidebarCollapsed` escribe la cookie con `document.cookie` (sin espejo en `localStorage`) | Fuente única SSR-visible; el espejo de Astro provocaba parpadeo al hidratar |
| 6 | Logout con `POST /api/auth/sign-out` vía `useApi` en lugar de `authClient.signOut()` | Evita `better-auth/client` en el bundle, reutiliza el relay y limpia el estado (`expire()`) antes de navegar |
| 7 | El estado de la app no expone `csrfToken` | No hay consumidor: las mutaciones leen la cookie con `getCsrfToken()` (subpath `@recetario/auth/csrf-client`) y el SSR está exento por diseño |
| 8 | `guest.ts` se entrega sin adjuntar a ninguna página | Las páginas de auth son de la Task 6; el archivo queda listo con su contrato documentado |
| 9 | `eslint.config.mjs` gana un bloque con globales de Node para `test/e2e/support/**` y `playwright.config.ts` | El stub y el setup global corren en Node y `no-undef` los marcaba |
| 10 | Ids/`data-variant` nuevos en componentes del shell (`#sidebar-nav`, `#bottom-nav`, `data-variant` en breadcrumbs) | Anclas estables para los e2e; no cambian el render visible |
| 13 | Los íconos se renderizan desde los **datos** de lucide (`@lucide/vue/dist/esm/icons/*.mjs` → `__iconData`) con un renderer propio en `Icon.vue`, no desde sus componentes | Es el arreglo del hallazgo 2: elimina la dependencia de `inject()` en el render (el `Suspense` del layout perdía la instancia de Vue en el primer render). Mantiene clases `lucide lucide-<nombre>`, atributos y `aria-hidden` de lucide, con test de paridad de markup en `test/nuxt/icon-parity.spec.ts`; de paso el bundle del worker baja de 789.87 KiB a 704.98 KiB |
| 11 | Se probó `nitro.experimental.asyncContext: true` y `externals.inline: ["@lucide/vue"]` | Ninguno arregló el hallazgo 2; se revirtieron para no cargar un flag experimental (documentado en Nitro como "might be broken on non-Node.js environments") ni engordar el bundle servidor |
| 12 | El smoke workerd corrió con `INTERNAL_API_HOST=127.0.0.1:4322` (el host público del worker web) | El service binding **conserva el `Host` original**: con el valor por defecto (`localhost:8787`) el API responde `FORBIDDEN: Host not allowed: 127.0.0.1:4322`. Es comportamiento de plataforma y aplica igual en producción: `INTERNAL_API_HOST` debe coincidir con el host público del worker web en cada entorno (o quedar sin definir). Se documenta como nota operativa, no se cambia el código |

## Verificación

| # | Comando | Resultado |
|---|---|---|
| 1 | `pnpm --filter @recetario/web lint` | 0 errores, 0 warnings |
| 2 | `pnpm --filter @recetario/web type-check` | `nuxt typecheck` sin errores |
| 3 | `pnpm --filter @recetario/web test` | 10 archivos, **117 tests verdes** (unit 49, nuxt 68), incluida la paridad de markup de íconos |
| 4 | `pnpm --filter @recetario/web test:e2e` | **22/22** (relay 10, shell 10, smoke 2) sobre build de nodo con stub del API, **en frío y sin warm-up** |
| 5 | `pnpm --filter @recetario/web build` | `.output/server/index.mjs` + `.output/public` |
| 6 | `pnpm --filter @recetario/web wrangler:dry-run` | 704.98 KiB (175.25 KiB gzip), bindings `API`, `ASSETS`, `NODE_ENV` |
| 7 | `grep` del bundle cliente | sin `prisma`, `@prisma`, Stripe SDK, `better-auth` ni `node:crypto` (única coincidencia `stripePriceId`, campo de un schema Zod) |
| 8 | `pnpm lint && pnpm type-check && pnpm test && pnpm build` (raíz) | lint 6/6 · type-check 7/7 · test 10/10 (web 112, api 201, auth 31, stripe 66, db 39) · build 7/7 |
| 9 | Smoke workerd: `pnpm --filter @recetario/web build` + API `wrangler dev` + web `wrangler dev --config wrangler.nuxt.jsonc --port 4322` | Binding `API` `local [connected]`; `/api/billing/plans` relaya la respuesta real del API (200); `/api/auth/session` llega al API desde el worker (`[API] GET /api/auth/session -> 200`); ruta privada anónima 302 con `cache-control: private, no-store` y `x-robots-tag: noindex, nofollow`. Procesos detenidos y puertos liberados |
| 10 | `git status` | sólo archivos de esta Task; `.output/`, `.nuxt/`, `.wrangler/`, `test-results/` ignorados |

### Casos bloqueantes del roadmap

| Caso | Dónde se prueba |
|---|---|
| binding/fallback | `test/unit/api-transport.spec.ts` (precedencia y `useBinding`) + smoke workerd (abajo) |
| concurrencia con dos cookies | `test/e2e/relay.spec.ts` (dos GET en paralelo, cada uno ve su cookie) |
| múltiples `Set-Cookie` | `test/e2e/relay.spec.ts` (`alpha`+`beta`) y `shell.spec.ts` (theme+accent+csrf en un documento) |
| sign-in / sign-out | `test/e2e/shell.spec.ts` (stub y API real en QA) |
| body raw | `test/e2e/relay.spec.ts` (POST con JSON y unicode reenviado byte a byte) |
| host allowlist | `test/e2e/relay.spec.ts` (el stub asserta `Host` = `127.0.0.1:8788`) |
| CSRF | `test/e2e/relay.spec.ts` (`Origin`/`Referer`/`x-csrf-token` llegan) + `test/unit/api-client.spec.ts` (header sólo en mutaciones) + QA (cookie legible por JS) |
| sesión anónima `200 null` | `test/e2e/relay.spec.ts` + `test/e2e/shell.spec.ts` (anónimo redirige sin 500) |

## Paridad responsive / QA visual

Usuario real (`qa@example.com`, plan `pro`) contra el API en dev y `agent-browser`; capturas en `apps/web/test-results/qa/` (gitignored).

| Condición | Mobile (375) | Desktop (1280) | Evidencia |
|---|---|---|---|
| shell privado | header + contenido + bottom nav fija; sidebar fuera de pantalla (`-translate-x-full`) | sidebar 220px en `x=0`, sin bottom nav (`display:none`) | capturas + `eval` (`sidebar.x=0`, `bottomNav=none`) |
| drawer | abre con botón de menú, overlay visible, `body.overflow=hidden`; cierra con Escape y restaura | no aplica | `eval` + captura `375-drawer-dark.png` |
| navegación | 4 items con icono y activo en color de acento (`grid-cols-4` por `production_planner`) | 4 secciones con etiqueta, activo `bg-accent-600` | capturas + `eval` |
| breadcrumbs | etiqueta actual (padre enlazado en rutas anidadas) | icono de carpeta + recorrido completo | capturas (`/recipes`, `/settings/billing` en e2e) |
| plan | badge en la cabecera del drawer | badge "Pro" en el footer, oculto al colapsar | capturas |
| logout | icono sólo (`span.hidden sm:inline`) | icono + "Cerrar sesión" | captura 1280 + `eval` |
| colapso | no aplica | 220↔64px persistido en cookie, SSR-correcto | e2e de colapso + captura |
| tema claro/oscuro | `dark=false/true` con tokens light/oklch-oscuro; media query cambia **en runtime** sin recargar | idéntico | `eval` + capturas `1280-{light,dark}.png` |
| acento | `data-accent` + `--color-accent-600` reactivos (coral 600 `#e84d5a` en claro → `#ff5f6d` en oscuro; cookie `emerald` → `#059669` y el activo pinta `rgb(5,150,105)`) | idéntico | `eval` + capturas |
| anónimo | 302 a `/sign-in?redirect=…&reason=auth_required` sin render | idéntico | e2e + `curl` |

Móvil no omite información: las 4 secciones, el estado activo, el plan (en el drawer) y el breadcrumb completo están disponibles en ambos breakpoints.

## Riesgos y rollback

| Riesgo | Estado |
|---|---|
| Dev proxy de Nitro apuntando al wrangler de Astro | Resuelto con `nitro.cloudflare.dev.configPath`; el fallback HTTP no depende del proxy |
| h3 colapsando múltiples `Set-Cookie` | No ocurre: se devuelve la `Response` del API sin tocar y el e2e lo verifica |
| Mismatch de hidratación en `<html>` | Un solo dueño (`useHead` en `app.vue`); e2e sin errores de consola y HTML SSR con tokens |
| Relay silenciosamente roto en prod | Unit tests de la rama binding + smoke workerd + dry-run con el binding `API` |
| `useCookie` no leyendo el request | Sustituido por lectura de cabecera/`document.cookie` con tests |
| Escritura en la BD de dev (usuario de QA) | Aprobado; sólo el usuario `qa@example.com` con `pro_monthly` |

**Rollback:** `git revert` de los commits de la Task. No hay migraciones ni despliegue; el árbol Astro sigue intacto (su middleware conserva su propio relay hasta la Task 13).

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit | Contenido |
|---|---|
| `feat(web): relay /api/** sobre el binding API con fallback HTTP` | `server/utils/api-transport.ts`, `server/routes/api/[...path].ts`, `runtimeConfig`, `nitro.cloudflare.dev` |
| `feat(web): bootstrap de sesión y preferencias en SSR` | `server/middleware/10.auth.ts`, `server/utils/session-state.ts`, `shared/**`, subpaths de `packages/auth` y `packages/stripe` |
| `feat(web): portar el shell autenticado a Vue` | componentes del shell, `layouts/private.vue`, `app.vue`, composables, plugins, middlewares, páginas privadas |
| `test(web): cubrir el relay, el shell y el arranque` | unit, nuxt, e2e + stub + config de Playwright + warm-up |
| `chore(web): dev tooling y lint para la etapa Nuxt` | `scripts/sync-cloudflare-dev-vars.mjs`, `package.json`, `eslint.config.mjs` |
| `fix(web): componer los íconos desde los datos de lucide` | `icon-registry.ts`, `Icon.vue`, `app/types/{icons.ts,lucide-icon.d.ts}`, test de paridad, retiro del warm-up |
| `docs(nuxt): registrar la task 04` | este task file, `AGENTS.md`, `apps/api/README.md`, `docs/qa-agent-browser.md` |

## Follow-ups para las próximas sesiones

1. **Task 5**: layout público y SEO; debe consumir `useTheme`/`useAuth` sin duplicar el mecanismo de tema/acento. Ojo: el `noindex` de `/` (Task 2) se retira ahí.
3. **Task 6**: renderizar `?reason=auth_required|session_expired` en `/sign-in`, validar `redirect` con `getSafeRedirect` y adjuntar `app/middleware/guest.ts` a las rutas de auth.
4. **Task 9**: breadcrumb dinámico con el nombre de la receta. Extensión prevista: resolverlo en un middleware de ruta de Nitro y sembrarlo en `event.context`/`useState` (el payload transporta estado SSR sin mismatch).
5. **Task 11**: `setTheme`/`setAccent` de `useTheme` + `PUT /api/preferences`; las cookies se escriben sólo desde la respuesta confirmada (patrón de `useSidebarCollapsed` para escritura cliente).
6. **Tasks 7/8/11/12**: usar `useApi()` y `@recetario/stripe/subscription` (nunca el barrel de Stripe) y mapear `PLAN_LIMIT` → CTA de upgrade y `FEATURE_REQUIRED` → error genérico.
7. **Deuda registrada:** TTL de 1 h de `csrf_token` en navegación SPA larga; los placeholders privados mantienen su `robots` propio (se retiran en su slice).
