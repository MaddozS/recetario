# Task 11 — Settings, preferencias y billing

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 11)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-11-settings-billing.md`

- **Scope:** `extends-existing`
- **Pre-existing:** placeholders de `/settings` y `/settings/billing`; shell privado con breadcrumbs (Task 4); tema unificado `useTheme` + cookies (Tasks 4–5); feature `app/features/billing/**` de Task 5; `@recetario/auth/password` y `PasswordRules` (Task 6); `@recetario/stripe/formatters` y `@recetario/stripe/subscription` (Tasks 5/8); endpoints de cuenta, preferencias y billing (Tasks 3/5); stub e infraestructura de tests.
- **Dependencies:** Tasks 3, 4, 5 y 6 (completadas, HEAD base `ae70617`).
- **Parallel-safe:** sí con Task 12, pero esta sesión implementó **solo** Task 11.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`, HEAD base `ae70617`, árbol limpio (solo `.commandcode/taste/*`).

## Resultado

`/settings` deja de ser un placeholder: tabs sincronizadas con la URL, perfil (nombre y contraseña) con mutaciones JSON al API, preferencias con preview local y persistencia autoritativa en Hono (cookies sólo desde la respuesta confirmada, rollback en error y persistencia inmediata en cualquier cambio autenticado, incluido el toggle del landing) y facturación completa (plan actual, trial, cancelación, cambio programado, uso, funciones, portal de Stripe y cambio de plan con confirmación). `/settings/billing` es un 301 de Nitro que preserva la query y `/pricing?plan=<tier>` resalta la card objetivo.

Se eliminó del camino portado: el `pushState` + `classList` de las tabs, los `fetch` con `FormData` y `showFeedback()` mutando `className`, el preview que reescribía `html.style.cssText`/`classList`, el `setButtonLoading` con `innerHTML`, los `data-*-bound`, el POST-redirect de preferencias con `?type=&message=`, el `window.alert` de precios, el toast del portal con `setTimeout`, `bindDialogBackdrop` y los listeners `astro:page-load`/`astro:after-swap`.

| Elemento       | Valor                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Tests web      | **545** (unit 309, nuxt 236) — antes 471                                                        |
| E2E web        | **120/120** (settings 16) — antes 104                                                           |
| Tests API      | **213** (account 11 nuevos) — antes 202                                                         |
| Checks raíz    | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7 (entorno limpio, `env -u WEB_ORIGIN`)         |
| Bundle Nitro   | build **1.16 MB** (366 kB gzip) · dry-run **1160.42 KiB** (270.37 KiB gzip) — antes 1.06 MB / 1089.90 KiB |
| Bundle cliente | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto` ni `@stripe/` (sólo el campo Zod `stripePriceId`) |
| QA visual      | 15 capturas 375/1280 × claro/oscuro en `apps/web/test-results/qa/` (gitignored)                  |

## Decisiones aprobadas en la sesión

1. **`/api/account/*` a JSON + envelope + Zod** (respuesta del usuario). Los handlers leen JSON validado con schemas nuevos en `@recetario/types`, lanzan `ApiError` y responden JSON shapeado (`{firstName,lastName}` / `{ok:true}`); se retiran `c.text(...)` y el 200 vacío. El árbol Astro es referencia y no se despliega desde esta rama.
2. **Política real de contraseña** (respuesta del usuario). `change-password` valida con `validatePassword` — 8+, mayúscula, minúscula, número y especial, la misma de sign-up/reset — en vez del `< 6` suelto; el formulario reutiliza `PasswordRules` con las 5 reglas en vivo y el subtítulo pasa a «Usa al menos 8 caracteres…».
3. **`?plan=<tier>` en `/pricing`** (respuesta del usuario): resaltado con anillo + scroll a la card (`basic|pro`), sin POST automático. El baseline ignoraba el parámetro.
4. **Toda cambio de apariencia autenticado persiste** (respuesta del usuario): además del guardado explícito de Settings, el toggle del landing hace `PUT /api/preferences` con rollback si falla; el anónimo sigue sólo con cookie.
5. **Copy con tildes normalizadas** («Sesión de Google», «Suscripción cancelada», «No se realizó ningún cargo», «Tu suscripción ha sido activada», «Planificador de producción»), mismo criterio que Tasks 7/9/10. Se retiran los contratos `?type=`/`?message=`.
6. **Cambio de email sin UI** (mandato del roadmap): el endpoint se normaliza, la UI inactiva no se porta (en Astro sólo había JS muerto sin markup).
7. **Error del portal visible** hasta reintentar (el baseline lo auto-ocultaba a los 6 s).
8. **La caja de cambio programado usa `effectiveDate`** para «a partir del …» (el baseline usaba `currentPeriodEnd`).
9. **Sin overlay global**: sólo `loading`/`aria-busy` por botón, como el baseline.
10. **Las secciones se alternan con `v-show`** (no `v-if`), como los `data-tab-content` ocultos del baseline: no se pierden borradores al cambiar de pestaña.

## Hallazgos del baseline que se corrigen

| #   | Baseline                                                                                     | Task 11                                                                            |
| --- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 1   | Tabs con `preventDefault` + `history.pushState` + `classList` (back/forward no re-renderiza)  | `<NuxtLink>` con `?tab=`; router, deep links y back/forward                        |
| 2   | Live preview reescribía `html.style.cssText`, `dataset` y `classList`                        | `useTheme` + `app.vue` (dueño único de `<html>`)                                    |
| 3   | Preferencias por POST a la página + redirect con `?type=&message=`                            | `PUT /api/preferences` con respuesta validada; feedback inline                      |
| 4   | Cookies escritas antes de confirmar                                                          | Cookies desde la respuesta persistida (o directo si es anónimo)                     |
| 5   | Errores de cuenta en inglés/texto crudo (`Missing fields`, `Invalid password`)                | Envelope + copy en español (`resolve*Error`)                                        |
| 6   | `window.alert("Precio no configurado…")`                                                     | Alerta inline del dialog                                                            |
| 7   | Error del portal con auto-ocultado a los 6 s                                                 | Alerta persistente                                                                  |
| 8   | JS muerto de `change-email` sin markup                                                       | No se porta (endpoint normalizado)                                                  |
| 9   | `/settings/billing` como página con redirect                                                 | Ruta Nitro 301 que preserva la query                                                |
| 10  | Fechas espurias del seed pasaban el filtro por año en algunos puntos                          | Guarda de año ≥ 2025 centralizada en `billing-format.ts`                            |

## Hallazgos de la sesión (infraestructura y diagnóstico)

| #   | Hallazgo                                                                                                                                                     | Estado / dueño                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| 1   | El stub exigía CSRF también a las peticiones del SSR (sin `Origin`), así que el `POST /api/stripe/sync-session` interno devolvía 403 y `?session_id=` no sincronizaba | **Arreglado**: `csrfAllowed()` exime las peticiones sin `Origin`, como Hono                                   |
| 2   | Al reescribir `sessionPayload` se perdieron los campos base de la suscripción (`status`, `currency`, `billingInterval`, `currentPeriodEnd`…): Zod la rechazaba y los e2e veían la sesión anónima (14 rojos) | **Arreglado**: se conserva `...SESSION_PAYLOAD.subscription`                                                  |
| 3   | `subscriptionResponse()` ignoraba su parámetro `plan` y devolvía el plan de la cookie                                                                         | **Arreglado**: la suscripción sincronizada se construye con el plan recibido                                  |
| 4   | Los dialogs están siempre montados: `getByText` de Playwright choca en strict mode con el contenido del dialog oculto                                          | **Arreglado**: hooks `data-plan-summary`, `data-usage-cards`, `data-plan-features` y aserciones acotadas      |
| 5   | Prettier y ESLint chocan en el párrafo del cambio programado (`</strong` + `>`)                                                                               | **Arreglado**: `<!-- prettier-ignore -->` en el bloque + computed `scheduledTargetName`                        |
| 6   | `es-MX` no rellena con cero los días (`1/10/2026`)                                                                                                            | **Documentado** en los tests                                                                                  |
| 7   | En 375 el header del plan apretaba nombre y precio en la misma fila                                                                                           | **Arreglado** en el QA: se apila el precio bajo el nombre en móvil (`sm:flex-row`)                             |

## Pasos ejecutados

1. **API:** `packages/types/src/api/account.ts` (schemas), `apps/api/src/account/handlers.ts` (JSON + Zod + envelope + política real + auditoría), montaje en `index.ts`, envelope en `sync-session` y tests nuevos/ajustados.
2. **Lógica pura:** `settings-tabs.ts`, `account-form.ts`, `settings-messages.ts` (settings) y `billing-plan-state.ts`, `billing-format.ts`, `billing-messages.ts` (billing).
3. **Persistencia de apariencia:** `useAuth.applyPreferences/applyProfile`, `useAppearancePersistence`, `ThemeToggle` y `useCheckout` con URLs por superficie.
4. **Composables de la página:** `useAccountSettings` (validación pura antes de llamar) y `useSettingsOverview` (sync del checkout, contadores y suscripción fresca).
5. **Componentes:** `SettingsTabs`, `ProfileSection`, `AccountNameForm`, `AccountPasswordForm`, `PreferencesSection`, `BillingSection`, `BillingUsageCard`, `PlanChangeDialog`, `ConfirmPlanChangeDialog` y el tamaño `5xl` del `Dialog` del kit.
6. **Páginas y rutas:** `/settings` real, borrado del placeholder de `/settings/billing`, `server/routes/settings/billing.ts` (301) y `?plan=` en `/pricing`.
7. **Tests:** 5 specs unit + 2 nuxt + `settings.spec.ts` (16 e2e) + ampliación del stub y ajustes de `shell`/`public`.
8. **Verificación completa, QA visual (15 capturas) y limpieza de procesos.**

## Desviaciones respecto del plan

| #   | Desviación                                                                                   | Motivo                                                                                                             |
| --- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | `useCheckout.clearError()` además de `startCheckout`                                         | El error del checkout persiste entre aperturas del dialog; se limpia al elegir/cambiar de plan                       |
| 2   | El formulario de preferencias revierte el preview a lo **persistido** en error               | Mandato del usuario (rollback visual); el baseline lo dejaba aplicado pero sin guardar                                |
| 3   | `billing-messages.ts` traduce el 404 del portal y descarta mensajes de 5xx                    | Evita exponer `No subscription found` / `Internal server error`                                                      |
| 4   | El párrafo del cambio programado lleva `prettier-ignore`                                     | Prettier rompe el `</strong>` y ESLint lo prohíbe; el copy queda textual al baseline y ambos pasan                    |
| 5   | `useSettingsOverview` degrada con `failed` + reintento en vez de tumbar la página             | El baseline hacía fallar la página entera si el API de contadores caía                                                |
| 6   | Se apila el precio del plan en móvil                                                         | Mejora de legibilidad detectada en QA; misma información                                                             |

## Verificación

| #   | Comando                                                                | Resultado                                                                        |
| --- | ---------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `pnpm --filter @recetario/web lint`                                    | 0 errores, 0 warnings                                                             |
| 2   | `pnpm --filter @recetario/web type-check`                              | `nuxt typecheck` sin errores                                                      |
| 3   | `pnpm --filter @recetario/web test`                                    | 43 archivos, **545 tests verdes** (unit 309, nuxt 236)                            |
| 4   | `env -u WEB_ORIGIN pnpm --filter @recetario/api test`                  | 37 archivos, **213 verdes** (37 archivos)                                          |
| 5   | `pnpm --filter @recetario/web test:e2e`                                | **120/120** (settings 16)                                                          |
| 6   | `pnpm --filter @recetario/web build`                                   | 1.16 MB (366 kB gzip)                                                             |
| 7   | `pnpm --filter @recetario/web wrangler:dry-run`                        | 1160.42 KiB (270.37 KiB gzip); bindings `API`, `ASSETS`, `NODE_ENV`; ruta `settings/billing.mjs` |
| 8   | `env -u WEB_ORIGIN … pnpm lint && type-check && test && build` (raíz)  | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7                                |
| 9   | `grep` del bundle cliente                                              | sin `better-auth`, Prisma, `@recetario/db` ni `node:crypto`                        |
| 10  | `pnpm --filter @recetario/web exec prettier --write <paths>`           | Formato aplicado (con el `prettier-ignore` documentado)                            |
| 11  | QA visual (agent-browser 0.27.0, dev contra el stub en 8787)           | 15 capturas 375/1280 × claro/oscuro, Free/Pro/trial/cancelado/programado           |
| 12  | Puertos y procesos                                                     | 4321 y 8787/8788 libres; `agent-browser close --all`; sin `nuxt`/`stub-api` vivos  |
| 13  | `git status`                                                           | solo archivos de esta Task (+ `.commandcode/taste/*`, gestionado por el sistema)    |

### Evidencia e2e (`settings.spec.ts`)

- **301:** `/settings/billing?success=1&extra=2` → 301 con `Location: /settings?tab=billing&success=1&extra=2` (`maxRedirects: 0`).
- **Tabs:** SSR en Perfil por defecto; clic a Preferencias/Facturación con `?tab=`; back/forward restaura cada pestaña sin recargar el documento (marcador vivo).
- **Perfil:** nombre actualizado en la card sin recarga; la sentinela `Fallo` deja el error inline («Error al actualizar el nombre.») y conserva lo escrito; la contraseña correcta confirma y limpia, la incorrecta muestra «La contraseña actual es incorrecta.» y la inválida no llega al API (0 requests).
- **Preferencias:** el clic cambia `html[data-theme]` al instante; guardar escribe la cookie **desde** la respuesta (`kitchcalc-theme=light`), muestra «Preferencias guardadas correctamente.» y oculta el botón; con `qa-prefs=error` revierte el preview (vuelve a `dark`), conserva la cookie anterior y muestra el error. El toggle del landing autenticado hace `PUT` (1) y el anónimo no (0).
- **Billing:** Free (`KitchCalc Free`, `Gratis para siempre`, avisos `Te quedan 1 recetas./1 ingredientes.` con `qa-usage=low`), Pro (`MXN $19.99 /mes`, `Se renueva el 15/10/2026`, portal visible); trial (`Periodo de prueba activo`, `Prueba hasta el 1/10/2026`), cancelado (`Se cancelará el 15/10/2026`) y programado (badge + caja con `KitchCalc Basic Mensual` y `a partir del 15/10/2026`).
- **Cambio de plan:** el selector respeta el plan/intervalo actual (`Plan actual` deshabilitado, `Actualizar a Pro`, precios por periodo); el upgrade confirma «Cambio inmediato (Upgrade)» y manda `priceId: price_pro_yearly` con `successUrl`/`cancelUrl` de Settings; el downgrade confirma «Cambio programado (Downgrade)» y cancelar no dispara checkout; el portal navega a su URL y su error queda inline; `?session_id=` sincroniza (`syncAttempts: 1`) y la suscripción pasa a Basic.

## Paridad responsive / QA visual

Dev server contra el stub del API (`STUB_API_PORT=8787`), `agent-browser` 0.27.0, capturas en `apps/web/test-results/qa/` (gitignored). Tema fijado con la cookie `kitchcalc-theme`.

| Condición                      | Mobile (375)                                                            | Desktop (1280)                                                      | Evidencia                                          |
| ------------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| Tabs                           | 3 etiquetas en fila, sin iconos (`hidden sm:block`), activa en acento    | igual + iconos                                                      | `375-billing-pro-light.png`, `1280-profile-dark.png` |
| Perfil                         | card de avatar a ancho completo; formularios apilados; 5 reglas visibles | misma información, formularios `max-w-sm`                            | `375-profile-light.png`, `1280-profile-dark.png`    |
| Preferencias (preview + guardar) | botones de tema envueltos; acento en 2 columnas; guardar a lo ancho      | acento en 4 columnas; guardar a la izquierda                        | `375-preferences-light.png`, `1280-preferences-preview-light.png` |
| Preferencias (error)           | alerta arriba y preview revertido                                        | igual                                                               | `1280-preferences-error-light.png`                  |
| Billing (plan)                 | nombre/estado y **precio apilado debajo**; acciones en fila              | precio a la derecha de la fila; mismas frases y badges               | `375-billing-pro-light.png`, `1280-billing-pro-dark.png` |
| Trial / cancelado / programado | banner + badge + caja con la misma información                            | igual                                                               | `1280-billing-trial-dark.png`, `1280-billing-scheduled-dark.png` |
| Uso con avisos                 | tarjetas apiladas con barra y «Te quedan N …»                            | 2 columnas                                                          | `1280-billing-free-low-dark.png`                     |
| Dialog de planes               | ancho completo (343), 1 columna, scroll interno                          | `max-w-5xl` (1024), 3 columnas                                      | `375-plan-dialog-light.png`, `1280-plan-dialog-dark.png` |
| Confirmación                   | `max-w-md` con el copy completo                                          | igual, apilado sobre el selector                                    | `1280-confirm-downgrade-dark.png`                    |
| Retorno de Stripe              | banner «Pago exitoso» en el tab de facturación                            | igual                                                               | e2e `settings.spec.ts`                                |
| `?plan=` en /pricing           | —                                                                        | card objetivo con anillo doble + scroll centrado                    | `1280-pricing-plan-highlight-dark.png`                |

Móvil no omite información: cambia la composición, no el contenido (plan, fechas, precios, límites, funciones y avisos están en ambos breakpoints).

## Riesgos y rollback

| Riesgo                                                                        | Estado                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Cambio de contrato de `/api/account/*` (FormData → JSON)                        | El árbol Astro no se despliega desde esta rama; el stub y los tests nuevos cubren el consumidor real       |
| `sync-session` cambia 200 `{ok:false}` → 404/409/500 del envelope               | El front lo trata como best-effort (loguea y sigue con la suscripción de sesión); tests actualizados       |
| La ruta 301 compite con la página                                              | La página se eliminó; el e2e con `maxRedirects: 0` la verifica y no hay enlaces internos al path viejo      |
| Cookies escritas antes de confirmar                                            | Escritura sólo desde la respuesta persistida; el e2e con `qa-prefs=error` verifica que no cambie            |
| Persistencia inmediata con clics rápidos                                       | Guarda de `saving` en `saveAppearance`; un solo PUT                                                         |
| Regresión en Tasks 5/6 (pricing, auth)                                         | Suites completas verdes (545 web, 120 e2e, 213 API); el stub sólo se amplió                                |
| El stub es un único proceso para toda la suite                                  | `__qa/settings/reset` por test y escenarios por cookie; la suite completa pasa                             |

**Rollback:** `git revert` de los commits de la Task. Sin migraciones, deploy ni estado persistente nuevo (las cookies ya existían). El árbol Astro queda intacto como referencia.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit                                                             | Contenido                                                                                          |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `bec8357 feat(api): normalizar la cuenta y sync-session al envelope` | `packages/types/src/api/account.ts`, `apps/api/src/account/handlers*.ts`, `index.ts`, `sync-session.ts` y tests |
| `ab21d33 feat(web): agregar la lógica pura de settings y facturación` | 6 módulos puros (tabs, cuenta, mensajes, plan, formato)                                            |
| `5f0305b feat(web): persistir la apariencia desde la respuesta confirmada` | `useAuth`, `useAppearancePersistence`, `ThemeToggle`, `useCheckout`                                |
| `bf63fae feat(web): portar settings, preferencias y facturación`    | 17 archivos: componentes, composables, páginas, 301 y `?plan=`                                      |
| `42fa9df test(web): cubrir settings, preferencias y billing (unit, nuxt y e2e)` | 5 specs unit, 2 nuxt, `settings.spec.ts`, stub y ajustes de `shell`/`public`                        |
| `docs(nuxt): registrar la task 11`                                  | Este task file + banner en `AGENTS.md`                                                              |

## Hallazgos abiertos y quién los atiende

| #   | Hallazgo                                                                 | Dónde se manifiesta            | Dueño            | Cómo se cierra                                                              |
| --- | ------------------------------------------------------------------------ | ------------------------------ | ---------------- | --------------------------------------------------------------------------- |
| 1   | El soporte de `_csrf` como campo de formulario queda sin consumidores    | `apps/api/src/middleware/csrf.ts` | Task 13       | **Explícito**: limpiar junto con la retirada de Astro                        |
| 2   | `change-email` normalizado pero sin UI                                   | API + Settings                 | Producto         | **Explícito**: decidir si vuelve la UI                                      |
| 3   | El árbol Astro de referencia conserva la validación de 6 y el POST-redirect | `SettingsContent.astro`       | Task 13          | **De paso**: desaparece con la retirada                                     |
| 4   | Migas de pan con «Receta» en vez del nombre                              | `layouts/private.vue`          | Task 13 / shell  | **Explícito** (hallazgo de Tasks 9/10)                                       |
| 5   | `pnpm format` de la raíz roto                                            | `package.json` (raíz)          | Task 13          | **Explícito**: usar `pnpm --filter @recetario/web exec prettier --write`     |
| 6   | Componentes de `app/features/**` sin auto-registro                       | cualquier slice nuevo          | Task 13          | **De paso**: imports explícitos por sesión                                   |
| 7   | El selector de planes del dialog y el de `/pricing` son layouts distintos | `PlanChangeDialog` / `/pricing` | Task 12/13     | **De paso**: comparten `PlanPrice`/`PlanFeatureList`/toggle; no se unifica sin segundo consumidor real |
| 8   | No hay downgrade a Free desde la UI                                      | `PlanChangeDialog`             | Producto         | **Paridad** con el baseline (el CTA de Free siempre fue «Plan actual»)       |

`graphify` no se usó (la preferencia vigente lo prohíbe); la Task 13 decide si sigue omitiéndose.
