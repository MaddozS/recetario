# Review — KitchCalc · landings públicas (`/` y `/pricing`)

**Modo:** `/design review` · **Fecha:** 2026-09-20 · **Alcance:** las dos superficies públicas de marketing (`/` con hero + features + cómo funciona + planes + CTA, y `/pricing`), su layout público, los 10 componentes de `app/components/landing/` y las piezas compartidas que montan (`PlanCard`, `PlanComparison`, `PlanFeatureList`, `PlanPrice`, `BillingIntervalToggle`).

**Referencia:** la pasada del 2026-09-20 sobre el mismo árbol (**Block**, 33/50) y las siete tareas del plan que salió de ella (`~/.commandcode/plans/landing-review-fixes.md`). Esta pasada verifica el cierre, vuelve a medir la superficie completa y pasa además su propio diff por una revisión de dos ejes (estándares del repo + spec).

**Veredicto: Needs changes** — los 15 hallazgos de la pasada anterior están cerrados y verificados con la misma vara. Queda **1 MEDIUM** (el scroller de planes no revela la card enfocada con teclado en móvil) y **4 LOW** (los títulos de card sin la cara de marca, las lanes internas de las cards de la landing, la clase muerta `shadow-accent-tint` y la promesa que esconde "Próximamente" en la comparación).

---

## TL;DR

La superficie cambió de forma, no de piel. La landing dejó de clonar el catálogo: cada card muestra **4 destacados** —lo incluido y disponible que no está en el plan Free— con el precio, el CTA y un enlace al detalle. `/pricing` es ahora la superficie de comparación **real**: una tabla con las **5 filas que cambian** entre planes y las **9 que son iguales** listadas una sola vez, con la columna del plan del visitante marcada. El plan recomendado (Pro) abre la fila en las dos superficies: ya no queda a dos swipes en móvil. Los gates que antes estaban ciegos ahora tienen dientes y están en verde.

Lo que no cierra, en orden de impacto:

1. **El scroller de planes no revela la card enfocada.** A 375px, Tab hasta el CTA de la tercera card (`[data-plan="basic"]`) deja el contenedor donde estaba (`scrollLeft` 331) y el control enfocado mide `x=332..645` en un viewport de 375: se ve su borde y el anillo, no su etiqueta. El mismo control enfocado por código sí se revela (`scrollLeft` 640), así que el contenedor puede mostrarlo — falta que lo haga cuando el foco entra tabulando. Deuda previa al plan (el scroller y su snap vienen del baseline); el reorden de esta pasada no la introduce ni la empeora.
2. **Los títulos de card no usan la cara de marca.** `DESIGN.md` §3 pide `--font-display` para los títulos de card ("Title") en las dos superficies; hoy los nombres de plan computan la pila del sistema (`Pro`/`Free`/`Basic` en `/` y en `/pricing`), mientras los titulares de página y sección de `/pricing` ya resuelven Outfit tras esta pasada.
3. **"Próximamente" esconde una diferencia real.** `plan-feature-state` hace que `coming_soon` mande sobre `included`, así que la fila "Instrucciones de preparación" (Free no la incluye; Basic/Pro sí, cuando llegue) cae en "Igual en todos los planes" y se lee idéntica en las tres. Es el contrato de T2, preexistente, y la matriz lo hereda: el comprador no puede saber si la función futura será suya.
4. **Las cards de la landing no comparten lanes.** A 1024px la card Free (sin badge) tiene su nombre 35px por encima del de Pro/Basic y su CTA/lista 53px; dos causas: la fila del badge existe sólo en dos cards y la línea "Facturado mensualmente" sólo en los planes de pago.
5. **`shadow-accent-tint` sigue declarada y no pinta nada** en `HeroSection` (×2) y `FeaturesSection` (×1): 0 reglas en los cuatro CSS construidos. Misma familia que el hallazgo 14.

**Siguiente acción:** un `/design interaction` corto sobre `landing/PricingSection.vue` (`focusin` → `card.scrollIntoView({ inline: "start" })` + aserto e2e), un `/design typeset` para la cara de marca en los títulos de card y un `/design refine` para la promesa de lo "próximamente"; el resto es `/design finish`.

---

## Scores por lente (/50)

| #   | Lente            | Score | Hallazgo clave                                                                                                                                                         |
| --- | ---------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | First impression | 8/10  | La landing abre con promesa **y** prueba (captura real en el primer viewport, también en móvil) y la sección de planes abre por el recomendado.                        |
| 2   | Hierarchy        | 8/10  | Landing = decidir (destacados + CTA), `/pricing` = comparar (5 filas + lo común, con el plan actual marcado). Lo que resta es la alineación de lanes dentro de las cards de la landing. |
| 3   | Color voice      | 9/10  | Rol de texto del acento medido y en AA en los dos temas; tinte del Pro sólo en oscuro; queda una clase de sombra que no existe en hero/features.                       |
| 4   | Type voice       | 8/10  | Outfit en los titulares de página y sección de las dos superficies (verificado: `font-family` = Outfit) y mono tabular para el dinero; los títulos de card siguen en el sistema. |
| 5   | Interaction feel | 7/10  | Lightbox con zoom real, drawer como diálogo, un solo anillo de foco y estados de plan completos; el foco por teclado no arrastra el scroller.                            |
|     | **Total**        | **40/50** | Sube 7 puntos respecto de la pasada anterior (33/50): el **Block** era un fallo AA real y un gate que no lo veía, los dos cerrados.                                  |

---

## Hallazgos

| #   | Severidad | Disciplina    | Ubicación                                                                  | Antes                                                                                                                                                                                                                                                                                                     | Después                                                                                                                                                                                                    | Por qué                                                                                                                                                              |
| --- | --------- | ------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | MEDIUM    | Accessibility | `landing/PricingSection.vue:117-131`                                       | A 375px, Tab hasta el CTA de `[data-plan="basic"]`: el scroller no se mueve (`scrollLeft` 331) y el control enfocado mide `x=332..645` sobre 375 de viewport (43px visibles; su etiqueta, fuera). `el.focus()` programático sí lo revela (`scrollLeft` 640)                                          | Escuchar `focusin` dentro del scroller y traer la card a la vista (`scrollIntoView({ inline: "start", block: "nearest", behavior: reduced-motion ? "auto" : "smooth" })`), con aserto e2e de que la caja entera cae dentro del viewport | El teclado llega a todos los controles, pero el usuario no puede leer en qué está parado sin arrastrar la fila. Deuda previa al plan (scroller + snap del baseline)     |
| 2   | LOW       | Type          | `landing/PricingSection.vue:133`, `pages/pricing.vue:209`                   | `DESIGN.md` §3 pide `--font-display` para los títulos de card; los nombres de plan computan la pila del sistema en las dos superficies (medido)                                                                                                             | Aplicar `font-display` a los `h3`/`h2` de los nombres de plan (una decisión para las dos superficies, por la paridad de `PlanCard`)                                                                          | Los titulares de página y sección ya van en Outfit: sin la misma cara en el título de la card, la jerarquía tipográfica se corta justo en el objeto que se compara      |
| 3   | LOW       | Writing       | `features/billing/plan-feature-state.ts:44-47`                              | `coming_soon` manda sobre `included`, así que "Instrucciones de preparación" (Free: no incluida; Basic/Pro: incluida cuando llegue) se clasifica como **igual en los tres planes** y sus celdas se leen idénticas ("Próximamente")                            | Distinguir la promesa en el estado (p. ej. etiquetas `Próximamente incluido` / `Próximamente`) y usar `included` en la clave de igualdad de `comparePlans`                                                   | El catálogo ya declara la diferencia (`included`); el vocabulario actual la borra y la matriz la agrupa como si no existiera. Contrato de T2, preexistente                |
| 4   | LOW       | Layout        | `landing/PricingSection.vue:133-146`, `features/billing/PlanPrice.vue`     | A 1024px las cards de la landing no comparten lanes: nombre 283 (Free) vs 318 (Pro/Basic); CTA 411 vs 464; lista 479 vs 532. Causas: la fila del badge existe sólo en dos cards y la línea de facturación sólo en los planes de pago                                                                     | Reservar la fila del badge en el shell (slot con `min-h` cuando el plan no trae badge) y la línea de facturación en `PlanPrice`; o alinear el CTA al fondo de la card (como ya hace `/pricing` con `mt-auto`) | En tres columnas paralelas, cada lane que no alinea obliga a re-anclar el ojo por columna                                                                                |
| 5   | LOW       | Color         | `landing/HeroSection.vue:59,100`, `landing/FeaturesSection.vue:111`        | `shadow-accent-tint` sigue en tres sitios (CTA "Comenzar gratis", marco de la captura del hero y marco de las capturas de features) y el token **no existe**: 0 reglas en los cuatro CSS construidos (`grep -c shadow-accent-tint apps/web/.output/public/_nuxt/*.css` → 0,0,0,0)                          | Quitarla, o apuntarla al token real (`shadow-sm shadow-accent-200`, que existe y se apaga en oscuro)                                                                                                        | Una clase que declara profundidad y no pinta nada: misma familia que el hallazgo 14 (`accent-950`). El uso del CTA de plan se retiró en esta pasada                      |

---

## Estado de los 15 hallazgos de la pasada anterior

| #   | Hallazgo (2026-09-20)                       | Estado       | Evidencia de esta pasada                                                                                                                             |
| --- | ------------------------------------------- | ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | AA roto del acento como texto (claro)       | **Cerrado**  | Rol `--color-accent-text`; la sonda de contraste mide AA en las dos superficies, dos temas y dos anchos (8/8 verde)                                   |
| 2   | Gate de a11y ciego (sin scroll, sólo claro) | **Cerrado**  | `scan()` recorre por tramos y el barrido público corre claro y oscuro: 15/15 verde, con `a[data-spy-active]` ya sin violación al scrollear             |
| 3   | Estado de cada feature sólo por ícono       | **Cerrado**  | `ul`/`li` + `sr-only` por fila, y las celdas de la matriz repiten el contrato (asertado en nuxt y e2e)                                                |
| 4   | La misma card con dos tratamientos          | **Cerrado**  | `PlanCard` único + e2e de paridad por computed style en los 3 planes y los 2 temas                                                                    |
| 5   | El lightbox no amplía en móvil              | **Cerrado**  | e2e: el ancho ampliado supera el viewport a 375 y triplica la miniatura inline                                                                        |
| 6   | El hero gasta media pantalla en el logo     | **Cerrado**  | Captura real en el hero: entera en el primer viewport a 1280 y >50% a 375 (e2e)                                                                       |
| 7   | Outfit se pide y no se usa                  | **Cerrado**  | Titulares de página y sección en Outfit en las dos superficies (medido); lo que falta son los títulos de card → hallazgo 2 de esta pasada              |
| 8   | El cierre repite el hero / "Prueba gratis"  | **Cerrado**  | Copy nuevo de hero y cierre; el e2e no encuentra "prueba" en el landing                                                                                |
| 9   | Tildes del catálogo                         | **Cerrado**  | "Categorías", "Información nutricional", "Más popular" en la config y en las dos superficies                                                           |
| 10  | Número de paso impreso dos veces            | **Cerrado**  | e2e: una sola aparición de "01" en `#how-it-works`                                                                                                     |
| 11  | Pista de zoom sólo con hover                | **Cerrado**  | La pista se revela con foco de teclado y su texto lo decide el puntero (dos e2e)                                                                      |
| 12  | Drawer sin semántica de diálogo             | **Cerrado**  | `role="dialog"`, `aria-modal`, foco al panel, `inert` detrás y foco devuelto al hamburger (e2e)                                                        |
| 13  | El error del API disfrazado de vacío        | **Cerrado**  | Con el API caído la sección avisa y no dice que no hay planes (unit, nuxt y SSR)                                                                      |
| 14  | `accent-950` inexistente                    | **Cerrado**  | La card Pro en oscuro usa `accent-800/10` (computed style); quedó un hermano en hero/features → hallazgo 4 de esta pasada                            |
| 15  | Anillos de foco mezclados                   | **Cerrado**  | `.focus-ring` en los controles del landing y en los enlaces nuevos: medido `rgb(255,255,255) 0 0 0 1px, rgb(248,104,101) 0 0 0 3px`                     |

Deuda de los hallazgos 4 y 6 que el plan asignó a la séptima tarea: **cerrada**.

- La landing ya no clona el catálogo: 4 destacados por plan + "Ver todas las funciones" (3 enlaces, uno por card, con nombre accesible por plan) → `/pricing`.
- `/pricing` compara de verdad: 5 filas que cambian (celda = estado + texto del propio plan) y 9 comunes listadas una vez (medido en DOM y asertado en e2e).
- El recomendado abre la fila: a 375px el scroller arranca en `scrollLeft` 0 y la caja del Pro cae entera dentro del viewport; el orden (Pro, Free, Basic) es el mismo en las cards y en las columnas de la tabla.

---

## Qué funciona

- **Dos superficies con dos trabajos.** La landing decide (destacados = lo que se gana pagando, con el precio y el CTA) y `/pricing` compara (matriz de diferencias + detalle completo). La misma card (`PlanCard`) sigue siendo el mismo objeto en las dos.
- **La comparación se lee sin memorizar.** Columnas = cards (Pro/Free/Basic), celdas con el estado en texto (`sr-only`) y reglas verticales que separan las columnas; a 320px las celdas se envuelven en sus tres columnas sin esconder filas ni desbordar la página (`overflow` 0 en las dos superficies).
- **La comparación sabe quién mira.** Con sesión, la columna del plan del visitante lleva "Plan actual" (asertado en nuxt y e2e); sin sesión no se marca nada (el anónimo no tiene plan).
- **Los CTAs de `/pricing` comparten lane** aunque un plan traiga badge y otro no (medido: `y=486..488` en las tres cards), y los enlaces "Ver todas las funciones" cierran las cards de la landing en la misma línea (`y=726` en las tres).
- **El foco tiene un solo anillo de marca**, también en los controles nuevos: alcanzado con Tab (4 pulsaciones) y medido sobre el enlace.
- **Los gates tienen dientes.** axe con recorrido completo por tramos en claro y oscuro (15/15), sonda de contraste por píxeles sobre degradados compuestos (8/8) y la suite de chromium en verde, incluidos los asertos nuevos del orden móvil, los destacados, la matriz y la marca del plan actual.
- **Estados completos en las cards.** Cargando con la forma final, error verdadero (nunca vacío falso), `Plan actual` y `?plan=` con anillo, y CTA en `aria-busy` mientras redirige.

---

## Considerado y descartado

| Ubicación                                       | Candidato                                                                          | Por qué se descarta                                                                                                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/pricing` cards                                | Devolver los destacados a las cards para que el detalle no quede a un scroll        | Reconstruiría la duplicación que esta pasada elimina; en 1280 la comparación entra en el primer viewport y el reparto pitch/comparación es la decisión del plan                                |
| `PlanComparison.vue` — "Igual en todos los planes" | Colapsar las 9 filas comunes en una línea ("y 9 más iguales en los tres")          | `/pricing` es la superficie que conserva el catálogo completo; colapsarlo escondería el detalle que debe dar                                                                                  |
| `landing/PricingSection.vue` — destacados        | Mostrar también "Próximamente" y lo no incluido                                     | El pitch vende lo disponible de hoy; lo futuro y lo excluido viven en el catálogo, a un click, con el mismo contrato de estado                                                                 |
| `plan-highlights.ts` — "y N funciones más"       | El recorte no se dispara con el catálogo actual (4 destacados ≤ 5)                  | Es un guardarraíl para cuando el catálogo crezca: cubierto por unit y nuxt; no hay nada que arreglar hoy                                                                                       |
| `PlanComparison.vue` — filas de cantidades       | Etiqueta sintética ("Recetas: 10 / 75 / ∞") en vez de las tres frases del catálogo  | El catálogo no declara una etiqueta de fila: inventarla sería publicar un dato que la config no tiene (`PRODUCT.md` rechaza además la tabla densa tipo ERP)                                     |
| `plan-highlights.ts` / `plan-order.ts`           | `"free"` literal (`FREE_PLAN_ID`) y el `plan()` duplicado en los tres specs unitarios | El id "free" vive en ~15 sitios del feature de billing: el arreglo real es un `PLAN_IDS` compartido, no dos constantes a medias. La fábrica de fixtures sí se extrajo a `test/unit/support/plan-fixture.ts` |

---

## Verificación

**Pasada**

- `pnpm --filter @recetario/web test` → **700 pasan** (53 archivos; incluye 14 unit y 9 nuxt nuevos de esta pasada).
- `pnpm --filter @recetario/web type-check` y `pnpm --filter @recetario/web lint` → limpios.
- `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL … playwright test --project=chromium` → **164 pasan** (2.7m).
- `public.spec.ts` + `a11y.spec.ts` + `contrast.spec.ts` tras la revisión de dos ejes → **42 pasan** (axe con recorrido por tramos en dos temas, sonda de contraste por píxeles y los asertos nuevos de la matriz y la marca del plan actual).
- `pnpm --filter @recetario/web wrangler:dry-run` → OK, con warnings preexistentes de `duplicate-object-key` en el chunk de producción (ajenos a estas superficies).
- Medidas en vivo (`agent-browser`, `/` y `/pricing`, 320/375/768/1024/1280, claro y oscuro): CTAs de `/pricing` en `y=486..488`, enlaces de la landing en `y=726`, matriz de 5 filas × 3 columnas con reglas verticales, `overflow` de página 0 a 320 en las dos superficies, anillo de foco del enlace nuevo, y el flujo landing → `/pricing` → `/sign-in?redirect=/pricing` caminado a mano.
- Sin errores de consola ni de página en las dos superficies (`agent-browser errors`, vacío).
- Evidencia visual: 30 capturas en `apps/web/test-results/qa-t7/` (gitignored).

**No verificado**

- **Firefox/WebKit:** los smokes no cubren las landings en esta máquina (`firefox-smoke` falla al lanzar con `sandbox_extension_issue_file_to_process`).
- **Lector de pantalla real** (VoiceOver/NVDA): el estado por celda y fila se sostiene sobre el DOM (`sr-only`, `th[scope]`, `caption`), no sobre una sesión con lector.
- **Mecanismo del scroll por foco:** está medido el efecto (Tab no revela la card, `focus()` sí), no la razón interna de Chromium.
- **Lector de pantalla + "Próximamente":** la conclusión del hallazgo 3 sale del código y de la config (`included` distinto con el mismo estado), no de una sesión con lector.

---

## Siguientes modos

- `/design interaction` — revelar la card enfocada dentro del scroller de planes (hallazgo 1, MEDIUM) con su aserto e2e.
- `/design typeset` — `font-display` en los títulos de card de las dos superficies (hallazgo 2, LOW).
- `/design refine` — decir la promesa de lo "próximamente" (hallazgo 3, LOW): etiqueta por `included` y clave de igualdad de la matriz.
- `/design finish` — lanes internas de las cards de la landing (hallazgo 4, LOW) y la clase muerta `shadow-accent-tint` (hallazgo 5, LOW).
