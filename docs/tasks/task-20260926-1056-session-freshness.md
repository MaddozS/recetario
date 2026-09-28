# Task — Frescura de sesión y suscripción sin reload

## Resultado

Cancelar la suscripción en Stripe mientras la app está abierta ya no exige un F5: el snapshot de sesión del documento se revalida cuando la página se restaura de bfcache o vuelve a primer plano, y la pestaña de Facturación pide siempre la suscripción reconciliada al activarse o al detectar esa revalidación.

## Diagnóstico

Síntoma reportado: tras cancelar en Stripe, entrar de nuevo a la página (sin dejarla en otra pestaña) no mostraba la alerta de "Suscripción cancelada"; con F5 aparecía.

1. **El snapshot de sesión se resuelve una sola vez por documento.** `server/middleware/10.auth.ts` → `GET /api/auth/session` → `event.context.auth` → `app/plugins/auth.server.ts` → `useState("auth")`. En cliente, `useAuth()` sólo lo mutaba por `applyPreferences`, `applyProfile` y `expire`: ningún camino revalidaba. Un webhook de Stripe no puede empujar nada al navegador.
2. **La suscripción fresca sólo se pedía si el resolver de `/settings` arrancaba con query de billing** (`tab=billing`, `session_id`, `success=1`, `canceled=1`). Las tabs son `NuxtLink` a la misma ruta alternadas con `v-show`, así que activar Facturación no re-ejecutaba el resolver y la alerta se pintaba con el fallback de sesión (`freshSubscription ?? sessionSubscription`), congelado.
3. **Sólo `/api/billing/subscription` reconcilia en vivo contra Stripe**; el payload de sesión (`getSubscriptionInfo`) sale de la DB y además fija `scheduledChange: null`. El snapshot nunca podía mostrar un cambio programado.
4. **El reload funcionaba** porque la URL ya tenía `?tab=billing` → SSR → resolver con contexto de facturación → fetch fresco.
5. **Deuda documental:** `AGENTS.md` documentaba `useAuth().resolveSession()`, método que no existía (se diseñó en `docs/tasks/task-20260912-0925-cloudflare-shell.md:51` pero la implementación final sólo usó `event.context.auth`).

### Mecanismo exacto del caso reportado

Las privadas llevan `Cache-Control: private, no-store`, así que no hay caché HTTP. El portal de Stripe se abre con `window.location.href` (`useBillingPortal.ts`) y su `return_url` es `/settings?tab=billing` (`apps/api/src/billing/portal.ts:17`). Chrome (≥116) admite páginas `no-store` en bfcache y sólo las invalida si cambian las cookies —cancelar en Stripe no las cambia—, así que volver con el botón atrás restaura el documento **sin request ni SSR**: lo único que faltaba era revalidar al restaurar.

### Por qué los tests no lo cazaban

Todos los tests de billing entraban con `goto("/settings?tab=billing")`, el único camino que sí refrescaba.

## Contratos nuevos

- **`useAuth().refresh()`**: revalida contra `GET /api/auth/session` y reemplaza el snapshot. Nunca lanza (un fallo de red se registra y conserva el estado); `null` (sesión cerrada en otra pestaña) expira. Preserva las preferencias locales y sólo las siembra cookie-first en la transición anónimo→autenticado. Sigue siendo síncrono en setup.
- **`useAuth().revision`**: contador reactivo que sube tras cada revalidación confirmada; lo observan los datos derivados.
- **`createRefreshScheduler`** (`app/utils/session-revalidation.ts`): TTL de 30 s, `force` para bfcache, dedupe de disparos en vuelo y `timestamp` fijado al iniciar (un API caído no amplifica los `focus`).
- **Disparadores** (`app/plugins/auth-revalidation.client.ts`): `pageshow` sólo cuando `persisted === true`, `visibilitychange` a visible y `focus`. La carga inicial no dispara nada (el SSR ya sembró) y los listeners se liberan en `app.onUnmount`.
- **Facturación fresca**: la pestaña pide `GET /api/billing/subscription` al montar con contexto de facturación, al activarse y cuando `revision` cambia con la pestaña activa; el snapshot de sesión queda como primer pintado o degradación si el API falla.
- **Builder compartido**: `buildAuthenticatedAuthState` vive en `shared/types/auth.ts` y lo usan el SSR y el cliente.

## Cambios por archivo

| Archivo | Cambio |
| --- | --- |
| `apps/web/shared/types/auth.ts` | `buildAuthenticatedAuthState` movido desde el servidor. |
| `apps/web/server/utils/session-state.ts` | Sin el builder; `fetchSession`/`isDocumentRequest` intactos. |
| `apps/web/server/middleware/10.auth.ts` | Importa los dos builders desde `#shared/types/auth`. |
| `apps/web/app/composables/useAuth.ts` | `refresh()` + `revision`; `fetchImpl` por `useRequestFetch()` (sin ciclo con `useApi()`). |
| `apps/web/app/utils/session-revalidation.ts` | Nuevo: scheduler puro. |
| `apps/web/app/plugins/auth-revalidation.client.ts` | Nuevo: listeners y limpieza. |
| `apps/web/app/features/settings/useSettingsOverview.ts` | Contadores y suscripción separados; watcher de pestaña/revisión; `sync-session` seguido de `refresh()` de sesión. |
| `apps/web/app/layouts/private.vue` | Comentario rancio de `routeRules` corregido. |
| `AGENTS.md` | Contrato real de sesión (notas operativas y sección Auth). |
| Tests | `test/unit/session-revalidation.spec.ts`, `test/nuxt/auth-session-refresh.spec.ts`, `test/nuxt/settings-overview.spec.ts` (nuevos); `test/unit/session-state.spec.ts` (import) y `test/e2e/settings.spec.ts` (3 tests). |

`apps/api` y el stub e2e no cambiaron: el stub ya lee `qa-plan`/`qa-subscription` por request, lo que permite mutar el estado a mitad de test.

## Pasos ejecutados

1. Builder a `#shared` + `useAuth().refresh()`/`revision`.
2. Scheduler puro + plugin cliente.
3. `useSettingsOverview`: frescura desligada de la query de montaje y `refresh()` tras `sync-session`.
4. Tests unit/nuxt/e2e y verificación negativa.
5. Documentación y task file.

## Verificación

| Check | Resultado |
| --- | --- |
| `pnpm --filter @recetario/web type-check` | verde (2 iteraciones: 1 error de narrowing en un spec, corregido) |
| `pnpm --filter @recetario/web test` (unit + nuxt) | verde: 56 archivos / 725 tests |
| `pnpm --filter @recetario/web test:e2e` | chromium completo verde (20/20 en settings, incl. los 3 nuevos) + smoke WebKit verde. Los 2 smokes de Firefox **no llegan a lanzar el navegador** en este entorno (`browserType.launch: Timeout ... sandbox_extension_issue_file_to_process`), ajeno a este cambio |
| `pnpm --filter @recetario/web lint` | verde |
| QA manual (`pnpm dev` + Stripe test) | no ejecutada: el stub e2e reproduce los tres flujos de forma determinista (cambio de suscripción a mitad de documento, `pageshow` restaurado, vuelta del portal con Back), que es lo que se quería comprobar |
| Visual QA 1280/375 | sin cambios de markup: la alerta y el badge son los mismos componentes. El estado nuevo se asertó por e2e en desktop y el test responsive ya cubre 375. Se evitó el parpadeo del skeleton al revalidar (ver Decisiones) |

## Verificación negativa (los tests muerden)

Con el plugin desactivado (`isEligible: () => false`) y el watcher de la pestaña neutralizado:

- `billing: activar la pestaña revalida la suscripción sin recargar` → **falla** (sin el fix no hay fetch al activar).
- `billing: una página restaurada de bfcache revalida sesión y suscripción` → **falla**.
- `billing: volver del portal con Back actualiza el estado sin recargar` → **pasa**: en este harness el navegador recarga el documento al volver, así que el SSR ya trae el dato. Queda como cobertura del flujo real, no del camino de bfcache (ese lo fija el test sintético de `pageshow`).

## Decisiones

- **Sin refresh por navegación SPA**: una petición por navegación no aporta valor; los disparadores reales son la restauración y el regreso a la pestaña. El scheduler ya soporta `force` si algún día se quiere.
- **`pageshow` sólo con `persisted`**: un `pageshow` sin bfcache significa documento recién creado, ya sembrado por el SSR; actuar ahí duplicaría el bootstrap.
- **Preferencias cookie-first al revalidar**: reemplazarlas con las de la sesión pisaría la réplica local (y el guardado pendiente de `PUT /api/preferences`).
- **No se toca `Cache-Control` ni se desactiva bfcache**: se revalida al restaurar en vez de penalizar la navegación.
- **`useRequestFetch()` + `apiFetch` en lugar de `useApi()` dentro de `useAuth()`**: evita el ciclo de imports `useAuth ⇄ useApi` y el ensurer de CSRF (el GET no lo necesita).
- **Skeleton sólo sin dato fresco** (`pending = countsPending || (subscriptionPending && freshSubscription === null)`): revalidar una suscripción ya visible no debe parpadear; el esqueleto queda para la primera carga de la pestaña.

## Desviaciones respecto del plan

- El plan proponía `useApi()` para el refresh; se cambió por `useRequestFetch()` + `apiFetch` por el ciclo de módulos (mismo contrato y normalización de errores).
- `app:unmount` no existe como hook en Nuxt 4.5; la limpieza va por `nuxtApp.vueApp.onUnmount` (Vue 3.5).

## Hallazgos

- **Bug detectado por los tests**: `onRevalidated?.(await refresh())` cortocircuitaba la llamada entera cuando no había callback, de modo que `refresh()` nunca se ejecutaba en producción (el plugin no pasa `onRevalidated`). Corregido separando la evaluación en dos pasos.
- **Riesgo aceptado**: cada regreso a la pestaña (tras el TTL de 30 s) suma un `GET /api/auth/session` (lectura de DB sin caché, por diseño). El TTL y el dedupe acotan ráfagas.
- **Follow-up posible**: refrescar también en `router.afterEach` si algún día se quiere estado al día por navegación (hoy se descartó a propósito).
