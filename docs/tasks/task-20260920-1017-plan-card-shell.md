# Task — T3: shell único de card de plan + estados de error/vacío

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `.commandcode/design/review-report.md` (review de las superficies públicas, veredicto **Block** 33/50), el plan `~/.commandcode/plans/landing-review-fixes.md` —que asigna a esta sesión los hallazgos **4** (la misma card con dos tratamientos) y **13** (el error del API disfrazado de "no hay planes")—, `docs/tasks/task-20260920-2044-accent-text-role.md` (T1, cerrada) y `docs/tasks/task-20260920-0907-landing-a11y-semantics.md` (T2, cerrada).

- **Scope:** `extends-existing`: se extrae un shell compartido; el contenido interno de cada superficie queda igual.
- **Pre-existing:** `landing/PricingSection.vue` (card sin borde, con `plan-pro` y `pricing-card-hover-pro`), `pages/pricing.vue` (misma card con `border-border` y un `cardClasses()` con los estados `highlighted`/`current`), `features/billing/PlanPrice.vue`, `PlanFeatureList.vue` (ya con el estado accesible de T2) y `usePricingPlans.ts`, que capturaba el error y devolvía `[]`.
- **Dependencies:** ninguna. T2 ∥ T3 era la pareja paralelizable del plan; T2 ya había cerrado cuando arrancó esta sesión.
- **No hizo:** el relayout de la comparación de planes y el orden móvil del scroller (T7), el copy del catálogo (T6) y los titulares (T5). `PlanChangeDialog` sigue montando su propia card (no es una superficie pública de compra, es un diálogo de `/settings`).
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, worktree `worktree-nuxt-rework`. Gates en chromium (`firefox-smoke` sigue sin arrancar en esta máquina: `sandbox_extension_issue_file_to_process`).

## Resultado

- **Una sola card de plan.** `features/billing/PlanCard.vue` es el shell: `bg-card border-border rounded-2xl border shadow-sm` + padding por densidad (`compact` = `p-6`, `roomy` = `p-7 md:p-8 xl:p-10`) + las variantes `featured` (plan recomendado) y `highlighted` (`?plan=<tier>`). La landing y `/pricing` montan el mismo componente: medido por computed style, el mismo plan tiene **el mismo borde, el mismo fondo y el mismo radio** en las dos superficies, en claro y en oscuro.
- **El borde se decide en un solo sitio por variante.** `border-border` nunca convive con `border-accent-*` (Tailwind resuelve los conflictos de la misma propiedad por orden de CSS, no por orden del atributo: el `cardClasses()` anterior era mutuamente excluyente por el mismo motivo). Hay un test que lo fija.
- **Un solo tratamiento para el plan recomendado.** `featured` se aplica en las dos superficies: borde `accent-300`, halo `plan-pro` y tinte `dark:bg-accent-800/10`. El movimiento propio de la landing (`pricing-card-hover-pro`: `scale(1.05)` en ≥1024 y lift al hover) se queda en la landing, porque es una decisión de superficie, no del objeto (regla dura del plan: hover/foco/deshabilitado en el consumidor).
- **Los skeletons usan el mismo shell** (antes: el de la landing "a mano" y el de `/pricing` un `<Card>` con `p-5` contra los `p-6` de la card real): el estado de carga tiene la forma final.
- **El error del API ya no se disfraza de vacío.** `usePricingPlans` deja que `useAsyncData` exponga `error` y `showEmptyState` exige que no haya error: con el API caído la sección dice "No pudimos cargar los planes" (el `FeedbackAlert` que era código muerto) y **no** "No hay planes disponibles por ahora".
- **Los 3 CTA de plan de la landing y los de `/pricing`** (eran deuda declarada de T2, con "dueño propuesto: T3") pasan a `.focus-ring`: medido con Tab, `rgb(255,255,255) 0 0 0 1px, rgb(248,104,101) 0 0 0 3px` y `outline: none`, el mismo anillo de marca que el resto del landing.

## Enumeración de estados responsive (obligatoria)

| Estado                            | Mobile (375)                                                                | Desktop (1280)                                                        |
| --------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Card por defecto (free, basic)    | Card a ancho de scroller (`min-w-[260px]`, `320px` desde `sm`) con snap      | 3 columnas (`flex-1` en la landing, `md:grid-cols-3` en `/pricing`)    |
| Card destacada (pro)              | Mismo borde de acento + halo pulsante, **sin** escala                        | Igual + `scale(1.05)` (sólo landing: `pricing-card-hover-pro` ≥1024)   |
| Card resaltada (`?plan=pro`)      | Anillo `ring-2` de `accent-500` con offset, sin pulso (el resaltado manda)   | Igual + scroll a la card                                              |
| Cargando                          | 3 `PlanCard` con la forma final (`p-7/8/10` landing, `p-6` pricing)          | Idéntico (mismo componente; sólo cambia el layout del contenedor)      |
| Error del API                     | Aviso "No pudimos cargar los planes", sin cards y sin estado vacío           | Idéntico                                                              |
| Catálogo vacío de verdad          | "No hay planes disponibles por ahora" (sólo la landing)                      | Idéntico                                                              |

Paridad móvil/escritorio: el sustrato de la card es el mismo componente en los dos anchos y ninguna superficie omite información al cambiar de breakpoint (lo que cambia es el contenedor: scroller con snap vs grid/flex de 3 columnas).

## Contratos nuevos

| Contrato                                          | Definición                                                                                                                                                                                       |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `PlanCard`                                        | Root con `data-plan` (cuando hay `planId`) y `data-highlighted="1"`; props `planId?`, `featured?`, `highlighted?`, `density?` (`"compact"` por defecto) y un slot para el contenido.                |
| Sustrato de plan                                  | `bg-card border-border rounded-2xl border shadow-sm` + padding por densidad. Cualquier superficie nueva que muestre planes lo hereda; no se re-declara en el consumidor.                          |
| Color del borde                                   | Una variante = una clase de color: `plain → border-border`, `featured → border-accent-300`, `highlighted → border-accent-500`. Nunca conviven dos.                                                |
| Precedencia de variantes                          | `highlighted` (transitorio, de `?plan=`) gana sobre `featured` (permanente): el resaltado quita el pulso mientras dura.                                                                            |
| Estado vacío vs error (catálogo público)          | El vacío exige `!pending && !error && plans.length === 0`. Con error se muestra el aviso; el error lo expone `usePricingPlans` (nunca se convierte en `[]`).                                      |
| Lo que **no** vive en el shell                    | Layout del contenedor (scroller/grid), `reveal-item`, hover (`pricing-card-hover*`), foco, `cursor-not-allowed` y deshabilitado.                                                                  |

## Diagnóstico

### Hallazgo 4 — el mismo plan se veía como dos componentes

Antes (medido en el review): la card del landing medía `border-width: 0px` —blanco sobre `#f8fafc`, definida sólo por una sombra al 5%— mientras la misma card en `/pricing` medía `1px solid #e2e8f0`, y el propio skeleton del landing sí llevaba `border-border`. El tratamiento estaba duplicado en dos archivos con dos criterios.

Después, medido en el navegador (`pnpm dev`, computed style, anónimo):

| Plan                    | Claro (idéntico en `/` y `/pricing`)                                              | Oscuro (idéntico en `/` y `/pricing`)                                  |
| ----------------------- | --------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| free / basic            | `border-top: 1px rgb(226, 232, 240)` · `background: rgb(255, 255, 255)` · radio 16px | `border-top: 1px oklch(0.31 0.008 258)` · `background: oklch(0.208 0.008 258)` |
| pro (`featured`)        | `border-top: 1px rgb(250, 167, 161)` (accent-300) + halo pulsante                  | `border-top: 1px rgb(201, 68, 69)` (accent-500) + `background: oklab(0.807904 0.0906622 0.0404466 / 0.1)` (tinte `accent-800/10`) |

En la landing el plan Pro además conserva lo suyo: `transform: scale(1.05)` a ≥1024 y el lift al hover (`pricing-card-hover-pro`, consumidor). La card resaltada por `?plan=pro` mide `border-top: 1px rgb(248, 104, 101)` (accent-500) + `ring-2` con offset y pierde `plan-pro`, como antes.

### Hallazgo 13 — una caída del API se contaba como "no hay planes"

`usePricingPlans` envolvía el fetch en `try/catch`, registraba `console.error` y devolvía `[]`. La consecuencia era doble: el `FeedbackAlert` de "No pudimos cargar los planes" (renderizado por `v-if="error"` en las dos superficies) era **código muerto**, y el estado vacío —que sólo debe hablar de un catálogo sin planes— afirmaba algo falso sobre el producto.

Ahora el error sube. Evidencia de la ruta real (SSR, no cliente), con el worker del API matado a mano y la landing pedida con `curl`:

| Medición (SSR de `/` con el API caído)             | Resultado |
| -------------------------------------------------- | --------- |
| `HTTP status`                                      | `200` (el render público no revienta)      |
| `"No pudimos cargar los planes"` en el HTML        | 1 ocurrencia                                |
| `"No hay planes disponibles por ahora"` en el HTML | 0 ocurrencias                              |
| `[data-plan]` en el DOM hidratado                  | 0 (no se inventan cards)                    |

Captura del estado: `apps/web/test-results/qa-t3/home-1280-light-api-caido.png`.

### Hallazgo nuevo — `shadow-accent-tint` no existe (sibling del hallazgo 14)

Buscando el shell apareció una clase **muerta** que el review no había listado: `shadow-accent-tint` se usa en 5 sitios (`HeroSection.vue:48,138`, `FeaturesSection.vue:110`, y dos veces en `PricingSection.vue`) pero no hay `--shadow-accent-tint` en `@theme` ni en `tokens.css` ni existe `--color-accent-tint`, así que Tailwind no genera ninguna regla. Verificado en el navegador vivo (barrido de `document.styleSheets` → **0 reglas**) y en el CSS construido de `.output` (la cadena no aparece). Es el mismo patrón que `dark:bg-accent-950/10` del hallazgo 14: una clase prevista que nunca pintó nada.

En esta tarea se quitó al mover la card Pro a la variante `featured` (no se traslada código muerto a un componente nuevo). Los otros cuatro usos quedan con dueño (ver Deuda).

## Decisiones

| # | Decisión | Origen |
| - | -------- | ------ |
| 1 | `featured` se aplica en **las dos** superficies: el plan recomendado es un solo objeto, no dos tratamientos (la aceptación del plan pide "mismo borde, mismo fondo" para `[data-plan]`, no sólo para el básico). | Plan (paso 1) + review (hallazgo 4) |
| 2 | El **movimiento** de la landing (`scale(1.05)` a ≥1024, lift al hover) se queda en el consumidor y no entra al shell: `/pricing` no lo pide y la regla dura del plan deja hover/estado fuera del shell. | Regla dura del plan (paso 2) |
| 3 | El color del borde se resuelve con clases mutuamente excluyentes (una por variante) en vez de apilar `border-border` + `border-accent-*`: Tailwind no garantiza el orden del atributo. | Medición de esta sesión (mismo motivo por el que `cardClasses()` era excluyente) |
| 4 | `highlighted` ignora `featured` por completo (mantiene el comportamiento anterior): el resaltado es transitorio y un pulso dentro de un anillo `ring-2` es ruido. | Comportamiento previo de `cardClasses()` |
| 5 | Los **skeletons** montan el mismo shell (y `/pricing` deja de usar `<Card>` para el estado de carga): el `p-5` de `Card` contra el `p-6` de la card real hacía saltar el layout al llegar los datos. | Plan (paso 2, forma final) |
| 6 | `usePricingPlans` **no** reañade un `console.error`: el aviso visible es la superficie del fallo y el relay/API ya registran el suyo en servidor (`[/api relay] upstream request failed`). Antes el `console.error` era la única traza porque el fallo no llegaba a la UI. | Esta sesión |
| 7 | Se cierra aquí la deuda de T2 (anillo de foco de los CTA de plan): el archivo ya estaba abierto y T2 la había dejado con "dueño propuesto: T3". | Task file de T2 |
| 8 | No se toca el `FeedbackAlert` ni el copy del catálogo (T6) ni el orden móvil del scroller (T7). | Límites del plan |

## Pasos ejecutados

1. `features/billing/PlanCard.vue`: props `planId?`/`featured?`/`highlighted?`/`density?`, mapas `DENSITY_CLASSES` y `VARIANT_CLASSES`, `variant` computada (`highlighted` → `featured` → `plain`) y slot. Emite `data-plan` y `data-highlighted`.
2. `landing/PricingSection.vue`: card y skeleton pasan a `PlanCard` (con `CARD_LAYOUT_CLASSES` para el scroller y `pricing-card-hover*` en el consumidor); `showEmptyState` suma `!props.error`; `.focus-ring` en el CTA.
3. `pages/pricing.vue`: se elimina `cardClasses()` (su contenido vive ahora en el shell), card y skeleton pasan a `PlanCard` con `featured`/`highlighted`; `.focus-ring` en `buttonClass`.
4. `features/billing/usePricingPlans.ts`: fuera el `try/catch`; el handler es el `api()` pelado y `useAsyncData` expone `error` (con `default: () => []` intacto).
5. `test/nuxt/public-ui.spec.ts`: `describe("PlanCard")` (sustrato, densidad, destacado y precedencia del resaltado), el caso "con el catálogo caído avisa y no dice que no hay planes" y un `describe("usePricingPlans")` que monta la sección real sobre el composable real con `useApi` que falla (y el contraste: catálogo vacío de verdad → estado vacío). `enableAutoUnmount(afterEach)` para que el caché por clave de `useAsyncData` no contamine entre tests.
6. `test/e2e/public.spec.ts`: test nuevo de paridad —recorre `/` y `/pricing` en claro y oscuro y compara borde, fondo y radio de los 3 planes por computed style—.
7. QA visual y de teclado con `agent-browser` (1280 y 375, claro y oscuro) + el caso del API caído.

## Verificación

| Comando | Resultado |
| ------- | --------- |
| `pnpm --filter @recetario/web test` | **677 pasan** (base 671 + 6 nuevos) |
| `pnpm --filter @recetario/web type-check` | limpio |
| `pnpm --filter @recetario/web lint` | limpio |
| `playwright test test/e2e/public.spec.ts test/e2e/settings.spec.ts test/e2e/a11y.spec.ts --project=chromium` | **45 pasan** (13 public + 17 settings + 15 a11y, 1.4m) |
| Computed style de `[data-plan]` en `/` vs `/pricing` (claro y oscuro) | idénticos en los 3 planes |
| Barrido de `document.styleSheets` buscando `.shadow-accent-tint` | 0 reglas (clase muerta, confirmada en vivo) |
| SSR de `/` con el API caído | 200 + aviso; 0 estados vacíos |
| `focus-ring` por Tab en los CTA de plan | `rgb(255,255,255) 0 0 0 1px, rgb(248,104,101) 0 0 0 3px`, `outline: none` |

QA visual (1280 y 375, claro y oscuro, más `?plan=pro` y el estado de error) en `apps/web/test-results/qa-t3/` (gitignored, 10 PNG): borde y fondo de las tres cards coherentes entre superficies, Pro con su borde de acento y su halo, y el aviso de error ocupando el lugar de la grilla. El web no perdió ninguna información en móvil (la card sigue mostrando badge, precio, CTA y las 15 filas).

## Desviaciones respecto del plan

| # | Plan decía | Se hizo | Por qué |
| - | ---------- | ------- | ------- |
| 1 | `featured` = anillo de acento + pulso Pro en desktop | `featured` = borde `accent-300` + halo pulsante + tinte en oscuro; el `scale(1.05)` de desktop se quedó en la landing | Evita meter hover/movimiento de una superficie en un shell compartido (regla dura del propio plan) y mantiene intacto el comportamiento de `/pricing` |
| 2 | Los skeletons no estaban en el alcance del paso 2 | Landing y `/pricing` montan el shell también en estado de carga | El skeleton del landing duplicaba el sustrato ("prueba" del hallazgo 4) y el de `/pricing` medía distinto que su card; el estado de carga pasa a tener la forma final |
| 3 | — | `.focus-ring` en los CTA de plan (7 controles) | Deuda declarada de T2 con dueño propuesto T3; el hallazgo 15 pedía un solo anillo en el landing |
| 4 | — | Se quitó `shadow-accent-tint` de la card Pro al pasar a `featured` | Clase muerta (ver diagnóstico); no se traslada a un componente nuevo |
| 5 | — | Test e2e de paridad sobre los 3 planes, no sólo `basic` | El paso 4 del plan pedía `basic`; comprobar los tres fija la unificación completa (incluido el Pro destacado) sin coste |
| 6 | — | `test/nuxt/public-ui.spec.ts` gana `enableAutoUnmount(afterEach)` y un mock de `useApi` | Necesario para probar el composable sin que el caché por clave de `useAsyncData` contamine tests; es el patrón ya usado en `production-planner.spec.ts` |

## Deuda / follow-ups

| Hallazgo | Ubicación | Dueño propuesto |
| -------- | --------- | --------------- |
| `shadow-accent-tint` es una clase muerta (no existe el token) | `HeroSection.vue:48,138`, `FeaturesSection.vue:110`, `PricingSection.vue:131` (CTA de Pro) | T5 (hero y features) y T7 (CTA de la card) — sustituir por un token real (`shadow-accent-200`, que sí existe y se apaga en oscuro) o quitarla |
| El plan Pro queda a dos swipes en móvil y la landing clona el catálogo completo de `/pricing` (15 filas por card) | `landing/PricingSection.vue`, `pages/pricing.vue` | T7 |
| `PlanChangeDialog` monta sus propias cards (no usa `PlanCard`) | `features/billing/PlanChangeDialog.vue` | Sin dueño: es un diálogo de `/settings`, no una superficie pública; si T7 unifica la comparación, conviene revisar si el diálogo debe heredar el shell |
| El estado vacío sólo existe en la landing (`/pricing` no dice nada si el catálogo viene vacío sin error) | `pages/pricing.vue` | Sin dueño: el catálogo es config estática y no puede venir vacío en producción; añadirlo sería el código muerto que precisamente denunciaba el hallazgo 13 |
| `BillingSection` (tab de facturación) es el tercer consumidor de `usePricingPlans` y **descarta** `error`: si el catálogo falla, el selector de cambio de plan queda vacío y sin aviso (antes al menos quedaba el `console.error`, que esta tarea retiró del composable) | `features/billing/BillingSection.vue:61` | Sin dueño en el plan: es `/settings`, no una superficie pública del review. Arreglo propuesto: un `FeedbackAlert` en el diálogo cuando `error` es truthy (2 líneas + test) |
