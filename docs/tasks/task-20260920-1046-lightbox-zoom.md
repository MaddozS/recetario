# Task — T4: lightbox con zoom real, pista honesta y paso sin duplicar

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `.commandcode/design/review-report.md` (review de las superficies públicas, veredicto **Block** 33/50), el plan `~/.commandcode/plans/landing-review-fixes.md` —que asigna a esta sesión los hallazgos **5** (el lightbox no amplía en móvil), **11** (la pista de zoom es sólo hover) y **10** (el número de paso impreso dos veces)— y las tareas ya cerradas `docs/tasks/task-20260920-2044-accent-text-role.md` (T1), `docs/tasks/task-20260920-0907-landing-a11y-semantics.md` (T2) y `docs/tasks/task-20260920-1017-plan-card-shell.md` (T3).

- **Scope:** `fix` + `extends-existing`: el lightbox ya era un `<dialog>` nativo que funcionaba (animación, Escape, devolución de foco, `inert` en cerrado). Aquí se le añade el encuadre real y la pista honesta, y se quita el número duplicado del paso.
- **Pre-existing:** `landing/ImageLightbox.vue` (cierre animado, Escape, `prefers-reduced-motion`), `landing/FeaturesSection.vue` (botón con `aria-label`, imagen `lazy` con `width`/`height`), `landing/HowItWorksSection.vue` (chip del stat), capturas `public/receta_{light,dark}.webp` (1600×810 / 1600×809).
- **Dependencies:** T2 (cerrada: T2 aplicó `.focus-ring` en el disparador y dejó declarado como deuda con dueño T4 el anillo del botón de cierre).
- **No hizo:** el hero (T5), el copy (T6) y el relayout de planes (T7). Tampoco se tocó el comportamiento del *drawer* ni la composición de las secciones.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, worktree `worktree-nuxt-rework`. Gates en chromium (`firefox-smoke` sigue sin arrancar en esta máquina: `sandbox_extension_issue_file_to_process`).

## Resultado

- **El zoom amplía de verdad.** El lightbox tiene dos encuadres: **ajuste** (la captura entera cabe: `max-h-[85dvh] max-w-[90vw]`) y **tamaño real** (la imagen a su tamaño natural dentro de un contenedor `overflow-auto`). Medido en el navegador: a 375px la captura pasa de **337px** a **1602px** (natural 1600) —el hallazgo era +8%, esto es **×4,75**— y a 1280px de **1152px** a **1602px**, con scroll horizontal y vertical. El zoom aterriza **centrado** en la captura, no en su esquina vacía.
- **El control de zoom es un control de verdad.** Botón "Ver a tamaño real" / "Ajustar" sobre el escenario (no depende de hover), `min-h-11` (44px), alcanzable con Tab, activable con ratón y con teclado, y **por encima del diálogo** en el *hit test* (nadie lo tapa). El doble click/toque sobre la captura también alterna: en ratón lo resuelve el evento `dblclick` nativo (respeta la velocidad configurada en el SO) y en táctil una ventana de 300 ms entre toques.
- **El arrastre y el scroll naturales conviven.** Con ratón, arrastrar sobre la captura ampliada la desplaza (medido: `scrollLeft` 640 → 700 tras un arrastre de 60px); en táctil el pan lo hace el scroll nativo del contenedor.
- **La pista se descubre con teclado y con ratón, y habla del puntero.** "Click para ampliar" en puntero fino, "Toca para ampliar" en puntero grueso (`pointer-fine`/`pointer-coarse`, no el ancho de pantalla). En móvil se ve en reposo; en escritorio aparece al **hover y al foco de teclado**.
- **El paso se imprime una sola vez.** El chip del stat de `#how-it-works` ya no repite el número: sólo queda el cuadrado coral y el mono del stat (medido: una sola ocurrencia de `01` en la sección).
- **El diálogo cubre el viewport y bloquea la página de detrás.** El `<dialog>` arrastraba el `max-width/max-height: calc(100% - 38px)` del UA y medía 322×762 en un viewport de 375×800; ahora ocupa el viewport entero y, mientras está abierto, `document.body.style.overflow` es `hidden` (antes la rueda desplazaba la página de detrás: medido 1337 → 1737).
- **La lógica del encuadre vive en un composable.** `useLightboxFraming` (estado del encuadre, arrastre, doble activación, centrado) deja al SFC el ciclo de vida del diálogo: 346 → **241** líneas el componente, 142 el composable.

## Enumeración de estados responsive (obligatoria)

| Estado                              | Mobile (375, puntero grueso)                                        | Desktop (1280, hover)                                                       |
| ----------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Lightbox cerrado                    | Pista "Toca para ampliar" visible en reposo bajo la captura          | Pista "Click para ampliar" visible **al hover y al foco**; invisible en reposo |
| Lightbox abierto, ajuste            | Imagen al ancho del viewport (337px), `data-zoomed="0"`               | Imagen contenida (1152px), `data-zoomed="0"`                                  |
| Lightbox abierto, 100%              | 1602px con pan horizontal (arrastre no aplica: scroll táctil)         | 1602px con pan horizontal **y** vertical (arrastre con ratón y rueda)         |
| Cierre (Escape)                     | No aplica (sin teclado físico): botón de cierre de 44px               | Escape cierra en los dos encuadres; el foco vuelve al disparador              |
| Página de detrás (abierto)          | `body.style.overflow = "hidden"`; sin scroll de fondo                 | Ídem                                                                          |
| Cargando / error                    | No aplica: la captura ya está en el DOM (el lightbox reusa el `src`)  | No aplica                                                                     |

Paridad móvil/escritorio: la captura ampliada, el control de zoom, el cierre y el bloqueo de fondo existen en los dos anchos; la única diferencia es el mecanismo de pan (arrastre vs scroll nativo) y el texto de la pista, que depende del **puntero** y no del ancho (verificado con `hasTouch` en Playwright: 375 con puntero grueso muestra "Toca para ampliar").

## Contratos nuevos

| Contrato                        | Definición                                                                                                                                                                                                |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Encuadre del lightbox           | `[data-lightbox-stage][data-zoomed="0"\|"1"]`; en `1` el escenario lleva el marco de ajuste (`max-h-[85dvh] max-w-[90vw]`, constante `FIT_FRAME`) con `overflow-auto` y la imagen `max-w-none` (tamaño natural). |
| Control de zoom                 | `[data-lightbox-zoom]`, texto = la acción ("Ver a tamaño real" / "Ajustar"), `min-h-11`, `.focus-ring`; **debe** ser el `elementFromPoint` de su propio centro (el `fixed` bajo un `<dialog>` top-layer quedaba por debajo de la caja del diálogo). |
| Doble activación                | Ratón: `dblclick` nativo en el escenario. Táctil: dos `click` con `pointerType === "touch"` en ≤300 ms. El listener vive en el escenario porque con captura de puntero los eventos de ratón se re-dirigen al elemento que captura. |
| Pista de zoom                   | `[data-zoom-hint]`: base `opacity-0`, revelada por `group-hover`/`group-focus-visible`, visible siempre en `max-md` y `pointer-coarse`. Texto en `[data-zoom-hint-fine]` (`hidden pointer-fine:inline`) y `[data-zoom-hint-touch]` (`pointer-fine:hidden`). |
| Disparador                      | `[data-lightbox-trigger]` en el botón de cada feature: selector estable para los tests (antes `#features button`, que también matcheaba los botones del diálogo).                                            |
| Bloqueo del fondo               | Mientras el diálogo está abierto: `document.body.style.overflow = "hidden"`; se libera al cerrar (incluido el cierre sin animación) y al desmontar.                                                        |
| `useLightboxFraming(stage)`     | Expone `zoomed`, `dragging`, `setZoom`, `toggleZoom`, `reset`, `handleTap`, `handlePointerDown/Move/End`. El componente no reimplementa gesto alguno; el diálogo no sabe nada de scroll.                    |

## Diagnóstico

### Hallazgo 5 — el lightbox no ampliaba en móvil

La imagen estaba limitada por `max-h-[85dvh] max-w-[90vw]`: a 375px el lightbox renderizaba **337px** contra **312px** de la miniatura inline (**+8%**), así que la promesa "Click para ampliar" no se cumplía donde la captura es menos legible. Ahora, en tamaño real, la imagen se renderiza a su tamaño natural (1600px) dentro de un contenedor desplazable, con el scroll centrado al entrar.

Medido con `agent-browser` (`pnpm dev`, claro y oscuro):

| Superficie        | Ajuste  | Tamaño real | Escala vs. miniatura inline |
| ----------------- | ------- | ----------- | --------------------------- |
| 375px (móvil)     | 337px   | 1602px      | ×4,75 (antes ×1,08)          |
| 1280px (escritorio) | 1152px | 1602px      | ×3,58                        |

El test e2e lo fija con tres asserts encadenados: `zoomWidth > fitWidth`, `zoomWidth > viewport.width` y `zoomWidth > inlineWidth * 3` (este último es el que mide la regresión del hallazgo, no el ancho de ajuste).

### Hallazgo 11 — la pista era indistinguible sin ratón (y en producción tampoco con ratón)

Dos fallos superpuestos:

1. Sólo existía `group-hover/lightbox:opacity-100`: con foco de teclado la pista seguía invisible.
2. **El hover tampoco funcionaba en el build de producción.** `md:opacity-0` es un variante de *media query*, y Tailwind v4 emite los variantes de media **después** de los variantes de grupo: en el CSS de `pnpm build` los offsets medidos eran `\.opacity-0` en 39041, `group-hover/lightbox:opacity-100` en 46222, `group-focus-visible/...` en 47008 y `md:opacity-0` en **61737** (último ⇒ gana siempre a ≥768px). El hover sólo funcionaba en `dev`.

Ahora el estado de reposo es la utilidad sin variante (`opacity-0`, que por construcción se emite antes de cualquier variante) y los estados visibles no compiten entre sí: `group-hover`/`group-focus-visible` (opacidad 1) + `max-md:opacity-100` y `pointer-coarse:opacity-100` (opacidad 1). Verificado en el CSS de producción (offsets 39041 → 46222/47008 → 55519) y en el navegador: en reposo `0`, al hover `1`, con foco de teclado `1`, en móvil `1`.

El texto de la pista pasa a depender del **puntero** (`pointer-fine`), no del ancho: un tablet de 1024px con dedo ve "Toca para ampliar" y un portátil de 375px ve "Click para ampliar". Ese caso (puntero grueso ≥768) es el que motivó una corrección de la revisión de cierre: la visibilidad original sólo cubría `max-md`, así que la pista quedaba invisible en tablet.

### Hallazgo 10 — el número del paso se imprimía dos veces

El chip del stat repetía el número del paso (cuadrado coral "01" + "01" dentro del chip, a 20px). Se eliminó el número del chip: el cuadrado coral se queda con el número y el chip con el mono del stat. Test: `#how-it-works` contiene `01` exactamente una vez y el primer chip (`Harina: $15.00/kg …`) no empieza por número.

### Hallazgos nuevos (encontrados en el QA y cerrados en esta sesión)

1. **El `<dialog>` no cubría el viewport y sus controles `fixed` quedaban debajo en el *hit test*.** El UA aplica `max-width/max-height: calc(100% - 38px)`; con `w-screen h-dvh` el diálogo medía **322×762** en un viewport de 375×800. En `dev`, `document.elementFromPoint` sobre el centro del control de zoom devolvía el **diálogo** por encima del botón (`DIALOG > BUTTON[zoom]`), así que un click real cerraba el lightbox en vez de ampliar. Arreglado haciendo que el diálogo ocupe el viewport (`open:max-h-none open:max-w-none`) y pasando los dos controles de `fixed` a `absolute`. El e2e lo fija con `elementFromPoint(centro) === el botón` **y** un `click()` real de Playwright. Nota honesta: en el build de producción el fallo no se reproducía (Playwright hacía click sin problema antes del arreglo); la causa raíz —el clamp del UA y controles fuera de la caja del diálogo— es la misma en ambos entornos y se corrigió igual.
2. **La página de detrás se desplazaba con el lightbox abierto** (rueda sobre el backdrop: `scrollTop` 1337 → 1737). El *drawer* del navbar ya bloquea el scroll del `body`; el lightbox no. Se añadió el mismo bloqueo, con assert en el e2e (abierto `hidden`, cerrado `""`).
3. **El estado del gesto sobrevivía a una apertura.** `lastTap`/`drag` no se reiniciaban al abrir: un click de la sesión anterior podía contar como la primera mitad del siguiente doble click y revertir el "al abrir, siempre en ajuste". Se reinician en la rama de apertura (`reset()` del composable).

## Review de cierre (skill `code-review`)

Dos ejes en paralelo sobre el diff. Lo que salió y lo que se hizo:

| Eje       | Hallazgo                                                                                                                     | Acción                                                                                                       |
| --------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Spec      | Faltaba el task file (y con él la tabla de estados obligatoria)                                                                | Este documento                                                                                                |
| Spec      | El criterio "el paso 01 aparece una sola vez" no tenía test                                                                    | Añadido al spec de la landing (ocurrencias + chip sin número)                                                  |
| Spec      | Estados de la tabla sin test: hover, arrastre, puntero grueso, botón de cierre                                                | Añadidos los cuatro (hover con `toHaveCSS`, arrastre con `scrollLeft`, contexto con `hasTouch`, caja del cierre) |
| Spec      | `fitWidth <= viewport.width` es casi tautológico; no medía la regresión del +8%                                                | Añadido `zoomWidth > inlineWidth * 3` contra la miniatura inline                                               |
| Spec      | El estado del gesto no se reiniciaba al abrir                                                                                  | `reset()` en la rama de apertura (hallazgo nuevo 3)                                                            |
| Standards | **Mayor:** la visibilidad de la pista usaba el eje del ancho y el texto el del puntero → invisible en tablet (≥768 con puntero grueso) | `pointer-coarse:opacity-100` en la pista                                                                       |
| Standards | **Mayor:** el SFC acumulaba diálogo + animación + encuadre + gestos                                                            | Extraído `useLightboxFraming` (346 → 241 líneas el componente)                                                 |
| Standards | `data-zoomed` era un hook sin consumidor                                                                                       | Los tests lo asertan en los dos encuadres (mismo patrón que `data-open` del drawer)                            |
| Standards | Geometría de ajuste duplicada en escenario e imagen                                                                            | Constante `FIT_FRAME` única                                                                                    |
| Standards | Doble activación reinventada con `Date.now()`                                                                                  | Ratón → `dblclick` nativo (respeta la velocidad del SO); táctil → ventana de 300 ms; desaparece `suppressActivation` |
| Standards | `closeAnimated` podía re-armar el timer sin limpiar                                                                            | Guarda `closingTimer !== null`                                                                                 |
| Standards | Selector e2e frágil `#features button` (también matchea el diálogo)                                                            | `data-lightbox-trigger` en el botón y en los tests (incluido el preexistente)                                  |
| Standards | Valor mágico `40` en el bucle de Tab                                                                                           | Constante `MAX_TABS`                                                                                           |
| Standards | Comentario obsoleto "(hoy, +8% en móvil)" en un assert que no lo medía                                                          | Reescrito con la constraint real                                                                               |

## Verificación

| Comando                                                                                            | Resultado                                             |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| `pnpm --filter @recetario/web test` (base, antes de tocar nada)                                      | 677 tests / 50 ficheros en verde                      |
| `pnpm --filter @recetario/web type-check`                                                           | limpio                                                |
| `pnpm --filter @recetario/web lint`                                                                 | limpio (sin imports huérfanos tras el refactor)        |
| `pnpm --filter @recetario/web exec vitest run`                                                       | 677 en verde                                          |
| `env -u WEB_ORIGIN … playwright test test/e2e/public.spec.ts test/e2e/a11y.spec.ts test/e2e/contrast.spec.ts --project=chromium` | **39/39** (18 de `public`, 15 de a11y, 8 de contraste) |
| `pnpm --filter @recetario/web build`                                                                 | build completo + offsets de CSS verificados            |
| QA con `agent-browser` (1280 y 375, claro y oscuro)                                                   | capturas y evals de DOM (abajo)                        |

QA visual (evidencia en `apps/web/test-results/qa-t4/`, gitignored): móvil con la captura ampliada y legible (porciones "30% / 50% / BASE 200 G"), escritorio en oscuro con `/receta_dark.webp`, los dos controles encima del contenido y el anillo de marca en el control de zoom (`rgb(255,255,255) 0 0 0 1px, rgb(232,79,79) 0 0 0 3px`, `outline: none`).

## Desviaciones

1. **La pista no usa el par `md:opacity-0` + `group-focus-visible` que sugería el plan**, porque en el CSS de producción el variante de media gana por orden y el hover nunca revelaba la pista (diagnóstico del hallazgo 11).
2. **El `<dialog>` ocupa el viewport y los controles son `absolute`** (no estaba en el plan): es la causa raíz del *hit test* descrito en los hallazgos nuevos.
3. **El zoom aterriza centrado** en la captura (el plan sólo pedía `overflow-auto` con pan): sin eso, el primer encuadre a 375px mostraba la esquina vacía de la captura.
4. **El botón de cierre pasó a 44px y `.focus-ring`**, deuda que T2 dejó declarada con dueño T4.
5. **Se añadió el bloqueo del scroll del fondo**, que el plan no pedía pero que el *drawer* del navbar ya aplicaba al mismo tipo de overlay.
