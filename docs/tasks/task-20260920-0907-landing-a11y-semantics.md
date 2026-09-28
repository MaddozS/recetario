# Task — T2: semántica de planes, drawer y lenguaje de foco

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `.commandcode/design/review-report.md` (review de las superficies públicas, veredicto **Block** 33/50), el plan `~/.commandcode/plans/landing-review-fixes.md` —que asigna a esta sesión los hallazgos **3** (el estado de cada feature sólo se distingue viéndolo), **12** (drawer sin semántica de diálogo) y **15** (anillos de foco mezclados)— y `docs/tasks/task-20260920-2044-accent-text-role.md` (T1, ya cerrada: rol de texto del acento y gate de axe con scroll).

- **Scope:** `fix` sobre componentes existentes. Sin cambios de copy, de composición ni de tokens.
- **Pre-existing:** `features/billing/PlanFeatureList.vue` (ícono por estado, `aria-hidden` ya correcto), `landing/Navbar.vue` (drawer con `inert` en cerrado, Escape, bloqueo de scroll y `aria-expanded`), `assets/css/global.css:50` (utilidad `.focus-ring`: definida y **sin un solo consumidor** hasta esta sesión).
- **Dependencies:** — . T2 es paralelizable con T3, que no se tocó aquí (ver «Desviaciones»).
- **No hizo:** el anillo de los CTA de plan de `landing/PricingSection.vue` (T3/T5/T7), el del botón de cierre del lightbox (T4) y el de `BillingIntervalToggle` (pieza compartida con `/settings`, fuera del alcance del plan): los tres siguen con el anillo del navegador. Tampoco se tocó la estructura de las cards ni la del catálogo.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, worktree `worktree-nuxt-rework`. Gates en chromium (`firefox-smoke` sigue sin arrancar en esta máquina: `sandbox_extension_issue_file_to_process`).

## Resultado

- **El estado de cada feature es texto, no sólo ícono.** `PlanFeatureList` pasa de `<div>` a `<ul>/<li>` (misma `space-y-3`, mismo espaciado) y cada fila antepone un `<span class="sr-only">` con `Incluido:`, `No incluido:` o `Próximamente:`. Los íconos siguen `aria-hidden`. Los tres consumidores (`PricingSection`, `pages/pricing`, `PlanChangeDialog`) no cambian. El estado se resuelve **una sola vez** (`stateOf()` + cuatro mapas) en vez de re-derivar la cascada en cada helper.
- **El drawer es un diálogo.** `role="dialog"`, `aria-modal="true"`, `aria-label="Menú"` en el overlay; `aria-haspopup="dialog"` y `aria-controls` en el hamburger; al abrir el foco entra al panel (`tabindex="-1"`) y el resto del layout público queda `inert`; al cerrar vuelve al hamburger. Escape, el `inert` en cerrado y el bloqueo de scroll se mantienen.
- **Un solo anillo de foco en el landing.** Los controles crudos pasan a `.focus-ring` (que hasta ahora no usaba nadie): el anillo calculado es `rgb(255,255,255) 0 0 0 1px, rgb(232,79,79) 0 0 0 3px` con `outline: none`, idéntico en claro y oscuro.
- **El inventario de controles queda documentado** (abajo): lo que sigue en el anillo del navegador tiene dueño en otra tarea del plan.

## Enumeración de estados responsive (obligatoria)

El drawer es `md:hidden` y la lista de features cambia de densidad, así que se enumeran los estados discretos:

| Estado                        | Mobile (< md) (375)                                                                 | Desktop (≥ md) (1280)                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| Drawer cerrado                | Panel fuera de pantalla (`translateX(-100%)`), overlay `inert`; hamburger visible    | Overlay `display: none`; enlaces del navbar visibles                       |
| Drawer abierto                | Foco en el panel, hamburger/`nav`/`main`/footer `inert`, scroll del body bloqueado   | Estado no alcanzable (el drawer no existe a este ancho)                    |
| Cierre con Escape             | Foco vuelve al hamburger; `inert` liberado; sin bloqueo de scroll                    | No aplica                                                                 |
| Cierre con backdrop (ratón)   | Igual, pero **sin** mover el foco (no había foco dentro del panel)                   | No aplica                                                                 |
| Lista de features (por fila)  | `Incluido:`/`No incluido:`/`Próximamente:` + texto, en `ul > li`                     | Idéntico (misma fila, mismo estado)                                        |
| Acento distinto (7 familias)  | El anillo de foco toma `accent-500` de la familia activa                             | Ídem                                                                      |

Paridad móvil/escritorio: la información es la misma en los dos anchos (el drawer sólo es una segunda montura de los mismos enlaces del navbar) y ninguno de los dos omite el estado de las features.

## Review de cierre (skill `code-review`)

Dos ejes en paralelo sobre el diff. Lo que salió y lo que se hizo:

| Eje       | Hallazgo                                                                                              | Acción                                                                                     |
| --------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Spec      | El criterio de aceptación "los 9 controles del landing" **no se cumple**: quedan 6 controles con el anillo del navegador y el plan no los asigna a nadie | No se amplía el alcance (los archivos son de T3/T4): se documenta abajo con dueño propuesto |
| Spec      | `ThemeToggle.vue` no estaba en la lista de archivos del plan y afecta también a `layouts/auth.vue:24`   | Se mantiene (es un control del navbar) y se corrige la justificación de la desviación        |
| Spec      | Las preservaciones del paso 3 (Escape, `inert` en cerrado, bloqueo de scroll) no se asertaban en ningún test | Añadidos al spec e2e: `inert` en cerrado, `overflow: hidden` abierto y `""` cerrado     |
| Spec      | Carrera abierto→cerrado en el mismo tick podía dejar la página inerte con el drawer cerrado             | Guarda `if (!menuOpen.value) return` tras el `nextTick()`                                   |
| Spec      | El fixture del test usaba `text: "Próximamente"` para el estado `Próximamente` (assert auto-cumplido)   | Fixture renombrado y assert nuevo del ícono por fila                                        |
| Standards | `statusLabel` sumaba una cuarta cascada sobre los mismos dos campos (`Repeated Switches`/`Primitive Obsession`) | `stateOf()` + mapas: una sola resolución de estado por fila                          |
| Standards | El task file no llevaba la tabla de enumeración de estados responsive que exige `AGENTS.md`              | Sección nueva (arriba)                                                                      |
| Standards | Churn de Prettier en bloques ajenos de `public.spec.ts`                                                  | Revertido: el diff del spec es un solo hunk, el del drawer                                  |
| Standards | `setBackgroundInert` recorre `parentElement.children` (DOM fuera de Vue)                                 | Se mantiene: es el patrón del `<dialog>` sin `<dialog>` (el propio reference del skill lo hace así) y evita mantener una lista de selectores; queda declarado en la desviación 1 |

## Contratos nuevos

| Contrato                                                    | Definición                                                                                                                                                                                                                                  |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estado por fila en `PlanFeatureList`                        | `ul > li` por feature; el `li` contiene el `Icon` (`aria-hidden`), un `span.sr-only` con el estado **y** el `span` con el texto. Cualquier fila nueva hereda el estado del `status`/`included` de `PlanFeature`.                              |
| Drawer = diálogo                                            | El overlay (`#landing-mobile-menu`) lleva el rol y el nombre; el panel (`#landing-mobile-panel`) es el destino de foco y el **único** subárbol no `inert`. El `inert` cubre a los hermanos del overlay en el layout público, sin lista de selectores que mantener. |
| Devolución del foco                                         | Al cerrar, el foco vuelve al hamburger **sólo si** venía de dentro del overlay (se consulta `document.activeElement` antes de liberar el `inert`); cerrar con el ratón no roba el foco.                                                       |
| `.focus-ring`                                               | `focus-visible:ring-2` con `accent-500`, `ring-offset-1` y `outline-none`. Primer consumidor: los controles del landing.                                                                                                                      |

## Diagnóstico

### Hallazgo 3 — el precio se distinguía viéndolo

`PlanFeatureList` montaba filas `<div>` con un `<svg aria-hidden="true">` y el estado repartido entre el nombre del ícono (`check`/`x`/`clock`) y su color. En el árbol de accesibilidad cada fila era un `StaticText` con el texto de la feature y nada más: lo que separa "Hasta 10 recetas" de "Recetas ilimitadas" —es decir, lo que se compra con MXN $249— no existía. Después del cambio, el árbol muestra `list > listitem` con `StaticText "Incluido:"` + `StaticText "Hasta 10 recetas"` (16 filas con estado en `/`, medido con `agent-browser snapshot`).

### Hallazgo 12 — el drawer no se anunciaba

El overlay existía como `<div>` con `inert`, Escape y bloqueo de scroll, pero sin rol, sin nombre y sin mover el foco: al abrir, `document.activeElement` seguía siendo el hamburger, así que un lector de pantalla no anunciaba nada y el teclado seguía recorriendo la página de detrás. Ahora el foco entra al panel (que se anuncia como "Menú, diálogo, modal") y los hermanos del overlay —skip link, `nav`, `#main-content` y `footer`— quedan `inert`, que es el trap sin interceptar Tab: fuera del panel no hay nada enfocable.

Medido en el navegador (375px, claro y oscuro): abrir con Enter → `activeElement = #landing-mobile-panel`, `#main-content.inert = true`, `footer.inert = true`, `nav.inert = true`; Tab → `#landing-mobile-menu-close`; Escape → `activeElement = #landing-mobile-menu-btn` y `#main-content.inert = false`.

### Hallazgo 15 — dos anillos a la vez

Los controles crudos caían al anillo del navegador. Pero además, tres de ellos (`a` del navbar, en el propio `Navbar.vue`) declaraban `focus-visible:ring-2` + `focus-visible:ring-accent-500` **sin** `outline-none`: medido por computed style mostraban `outline: 1px auto` **y** el anillo de marca, es decir el doble indicador que el hallazgo describe como "mezclado". Los tres entran en esta tarea porque el archivo ya estaba abierto: pasan a `.focus-ring` y quedan con un solo anillo.

Inventario final de controles del landing (medido por clase, `/` a 1280):

| Control                                                                  | Foco                                                    |
| ------------------------------------------------------------------------ | ------------------------------------------------------- |
| Hamburguesa, marca del navbar, tema, enlaces del navbar y del drawer      | `.focus-ring` (nuevo)                                   |
| Enlaces del footer (marca, privacidad, términos, producto, acceso)        | `.focus-ring` (nuevo)                                   |
| "Conocer más" del hero y los 3 botones de captura de features             | `.focus-ring` (nuevo)                                   |
| CTA del navbar y de las cards (`Button`), CTA final de la banda coral     | sin cambios (anillo de marca y anillo blanco, ya correctos) |
| 3 CTA de plan, botón de cierre del lightbox, 2 radios del periodo         | anillo del navegador (archivos de T3/T4 y pieza compartida) |

## Decisiones

| # | Decisión | Origen |
| - | -------- | ------ |
| 1 | El `inert` se aplica a **los hermanos del overlay** (`parentElement.children` menos el propio overlay) en vez de a una lista de selectores: cubre igual el skip link, el `nav`, `#main-content` y el `footer`, y no se rompe si el layout público suma nodos. | Desviación #1 |
| 2 | El rol vive en el **overlay** (`#landing-mobile-menu`), no en el panel: es lo que hace un `<dialog>` nativo (el backdrop queda dentro) y el panel sigue siendo el destino de foco. | Esta sesión |
| 3 | El foco se devuelve al hamburger **condicionado** a que el foco estuviera dentro del overlay al cerrar. Devolverlo siempre robaría el foco al cerrar con el backdrop o al navegar. | Esta sesión |
| 4 | El `outline` del panel se apaga (`outline-none`): es destino de foco, no un control, y el navegador pintaba su anillo azul sobre todo el borde de la pantalla (medido: `1px auto rgb(0,95,204)`). El primer Tab entra al botón de cierre, que sí lleva el anillo de marca. Mismo criterio que el `tabindex="-1" + outline-none` de `PreferencesSection.vue:96`. | Medición de esta sesión |
| 5 | Los enlaces del navbar/drawer se migran a `.focus-ring` aunque el plan sólo pedía aplicarla a Features/Footer/Hero: tenían el doble anillo (outline del navegador **+** anillo de marca) y el archivo ya estaba en esta tarea. | Desviación #2 |
| 6 | No se inventa un trap de Tab con listener: con todo lo demás `inert`, el ciclo del documento queda cerrado por construcción. | Plan (paso 3) |
| 7 | `aria-haspopup="dialog"` en el hamburger (no lo pedía el plan): es el compañero estándar de un disparador que abre un diálogo y refuerza "se anuncia como diálogo". | Review de cierre |

## Pasos ejecutados

1. `PlanFeatureList.vue`: `stateOf()` + cuatro mapas (`STATE_ICONS`, `STATE_ICON_CLASSES`, `STATE_TEXT_CLASSES`, `STATE_LABELS`) y `<ul>/<li>` + `span.sr-only` por fila; los íconos siguen `aria-hidden`. Clases emitidas idénticas a las de antes.
2. `test/nuxt/public-ui.spec.ts`: segundo test del `describe("PlanFeatureList")` — contenedor `ul`, 3 `li`, estado oculto y texto visible por fila, ícono por estado y `svg[aria-hidden=true]`. Los asserts previos (`.lucide-check` ×1, `.lucide-x` ×1, `.lucide-clock` ×1) siguen verdes.
3. `Navbar.vue`: refs `menuButton`/`menuOverlay`/`menuPanel`, `setBackgroundInert()`, foco al panel al abrir (con guarda contra un cierre en el mismo tick) y devolución condicionada al cerrar; `role`/`aria-modal`/`aria-label` en el overlay, `aria-haspopup`/`aria-controls` en el hamburger y `tabindex="-1"` en el panel.
4. `test/e2e/public.spec.ts`: el bloque del drawer comprueba rol, nombre, `aria-modal`, `aria-controls`/`aria-expanded`, el `inert` en cerrado, el bloqueo de scroll (abierto y cerrado), el foco en el panel, el orden interno (Tab → cierre), el `inert` de los tres bloques de detrás y la devolución del foco tras Escape.
5. `.focus-ring` en hamburguesa, marca del navbar, tema, enlaces del navbar y del drawer, "Conocer más", botones de captura y los 8 enlaces del footer.
6. QA con `agent-browser` (1280 y 375, claro y oscuro): anillo por computed style, recorrido de teclado del drawer, árbol de accesibilidad del catálogo y capturas en `apps/web/test-results/qa-t2/` (gitignored, 10 PNG).
7. Review de cierre (`code-review`, dos ejes) y los arreglos de la tabla correspondiente.

## Verificación

| Comando | Resultado |
| ------- | --------- |
| `pnpm --filter @recetario/web test` | 671 pasan (base 670 + el test nuevo de `PlanFeatureList`) |
| `pnpm --filter @recetario/web type-check` | limpio |
| `pnpm --filter @recetario/web lint` | limpio (los 8 archivos tocados) |
| `playwright test test/e2e/public.spec.ts test/e2e/a11y.spec.ts --project=chromium` | 27 pasan (incluye `pública /` con scroll en 375/1280 y claro/oscuro) |

QA visual y de teclado (paso 6 del plan): navbar en claro y oscuro a 1280; drawer a 375 en claro y oscuro (abierto con Enter, Tab al cierre, Escape); catálogo en ambos temas. El anillo es el mismo en los dos temas y el `ul` no movió nada del layout del catálogo.

## Desviaciones respecto del plan

| # | Plan decía | Se hizo | Por qué |
| - | ---------- | ------- | ------- |
| 1 | `inert` sobre `#main-content`, el footer y el contenedor interno del header | `inert` sobre los hermanos del overlay en el layout público | Cubre lo mismo **y** el skip link, sin mantener una lista de selectores ni añadir ids al header |
| 2 | `.focus-ring` en `FeaturesSection`, `Footer` y "Conocer más" | Además: hamburguesa, marca del navbar, tema, enlaces del navbar y del drawer | Eran controles del navbar con el anillo del navegador (dos con doble anillo) y el archivo ya estaba abierto. **Corrección del review:** `ThemeToggle.vue` no estaba en la lista del plan y además se monta en `layouts/auth.vue:24`, así que el cambio también aplica ahí (mismo anillo de marca, sin regresión) |
| 3 | — | `outline-none` en el panel del drawer | No estaba previsto; el outline azul del navegador se pintaba sobre el borde de la pantalla (ver Decisión 4) |
| 4 | — | `aria-haspopup="dialog"` en el hamburger | Atributo no pedido; estándar para un disparador de diálogo (Decisión 7) |

## Deuda / follow-ups

**El criterio de aceptación "los 9 controles del landing muestran el mismo anillo de foco" NO se cumple del todo.** Después de esta tarea quedan 6 controles del landing con el anillo del navegador, y el plan no asigna `focus-ring` a ninguno de ellos (T3 dice lo contrario: las clases de estado, foco incluido, se quedan en cada consumidor):

| Control | Archivo | Dueño propuesto |
| ------- | ------- | --------------- |
| 3 CTA de plan ("Comenzar gratis", "Elegir Basic", "Elegir Pro") | `landing/PricingSection.vue:120-131` y `pages/pricing.vue` | T3 (los migra al shell de card) — añadir `.focus-ring` al extraer el shell |
| Botón de cierre del lightbox | `landing/ImageLightbox.vue:100-108` | T4 (reescribe el lightbox) |
| 2 radios del periodo (Mensual/Anual) | `features/billing/BillingIntervalToggle.vue` | Sin dueño: pieza compartida con `/settings?tab=billing` |
| Skip link | `layouts/public.vue:5-11`, `layouts/private.vue:65-71` | Sin dueño: tiene tratamiento propio (`focus:bg-card focus:border-border`) |

Ninguno de los seis está en un hallazgo del review: el hallazgo 15 se cierra con los que sí entran (el plan enumeró tres ubicaciones y esta tarea cubrió esas y las del navbar). Si se quiere la regla "un solo anillo" en todo el landing, la propuesta es **añadir una línea a T3 y T4** en el plan antes de que arranquen.

- **Lector de pantalla real** (VoiceOver/NVDA) no se usó: la evidencia es el árbol de accesibilidad de Chromium, no una sesión con lector.
- **El panel del drawer no atrapa el Tab con un listener**: con el resto `inert`, Tab desde el último control sale al chrome del navegador y vuelve al panel. Es el comportamiento estándar de un modal con background inerte, pero no es un ciclo cerrado dentro del panel.
