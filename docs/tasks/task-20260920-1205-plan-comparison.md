# Task — T7: relayout de la comparación de planes

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Predecesoras: `.commandcode/design/review-report.md` (review de las superficies públicas, veredicto **Block** 33/50; la deuda de comparación quedó anotada dentro de los hallazgos **4** y **6**), el plan `~/.commandcode/plans/landing-review-fixes.md` (T7) y las seis sesiones cerradas del mismo plan: `task-20260920-2044-accent-text-role.md` (T1), `task-20260920-0907-landing-a11y-semantics.md` (T2), `task-20260920-1017-plan-card-shell.md` (T3, cuyo apartado *Deuda* asigna a esta sesión "el plan Pro a dos swipes en móvil" y "la landing clona el catálogo completo"), `task-20260920-1046-lightbox-zoom.md` (T4), `task-20260920-1132-hero-proof-and-type.md` (T5) y `task-20260920-1159-landing-copy.md` (T6, que también deja al stub e2e con features de juguete para esta tarea).

- **Scope:** `extends-existing` sobre las dos superficies de planes (`/` sección `#pricing` y `/pricing`).
- **Pre-existing:** `features/billing/PlanCard.vue` (shell único de T3: `data-plan`, variantes `featured`/`highlighted`, densidades), `features/billing/PlanFeatureList.vue` (contrato accesible de T2: `ul`/`li` + estado en `sr-only`), `landing/PricingSection.vue` (scroller con snap, `pricing-card-hover*`), `pages/pricing.vue` (banners, estados de sesión, `?plan=`, `buttonClass()`), `features/billing/usePricingPlans.ts` (error expuesto, vacío honesto) y `features/billing/PlanPrice.vue`.
- **Dependencies:** T3 y T5, ambas cerradas. T1–T6 están en `master` local antes de esta sesión.
- **No hizo:** el copy del embudo (T6), los titulares (T5), la semántica del drawer (T2) y las cards de `PlanChangeDialog` (fuera de las superficies públicas, sin dueño en el plan).

## Análisis (paso 1 del plan): qué vive en cada superficie

Las dos superficies montan hoy **el mismo catálogo de 14 filas por card** (3 cards en `/`, 3 cards en `/pricing`): 42 filas de las cuales 9 son idénticas en los tres planes. El comprador que quiere saber qué gana pagando MXN $249 lee dos listas de 14 líneas y las compara de memoria; en móvil el scroller deja el plan destacado (Pro) a dos swipes.

El reparto que se adopta separa las dos preguntas que hoy comparten una sola vista:

| Pregunta del visitante                          | Superficie   | Qué la responde                                                                  |
| ----------------------------------------------- | ------------ | -------------------------------------------------------------------------------- |
| ¿Qué gano si pago? ¿A qué precio?              | `/` `#pricing` | Destacados por plan (3–6 filas incluidas) + precio + CTA + enlace al detalle      |
| ¿Qué cambia exactamente entre dos planes?       | `/pricing`    | Matriz de **sólo las diferencias** (5 filas) + lo común listado una sola vez      |

### `/` — superficie de decisión (sección `#pricing`)

| Elemento                    | Antes                                              | Después                                                                 |
| --------------------------- | -------------------------------------------------- | ----------------------------------------------------------------------- |
| Orden de las cards          | Free, Basic, Pro                                   | **Pro** (destacado) primero; después Free y Basic                        |
| Filas por card              | 14 (incluidas, no incluidas y próximas)            | 3–6 **destacados**: sólo lo incluido y disponible, y además diferente del plan Free (lo que se gana pagando) |
| Recorte                     | —                                                  | Si hay más destacados que el tope (5): "y N funciones más"               |
| Detalle completo            | Duplicado en la card                               | Enlace "Ver todas las funciones" → `/pricing` (uno por card)             |
| Precio, badge, CTA, toggle  | Sí                                                 | Igual (mismo `PlanPrice`, mismo CTA por sesión, mismo `BillingIntervalToggle`) |
| Contenedor                  | Scroller con snap en móvil, 3 columnas en ≥lg       | Igual (el snap sigue siendo la forma de comparar rápido en móvil)        |

Estado de cada fila del destacado: todas son `Incluido:` (el pitch no vende lo que no está); el contrato accesible de T2 (`sr-only` por fila) se conserva.

### `/pricing` — superficie de comparación

| Elemento                        | Antes                                             | Después                                                                        |
| ------------------------------- | ------------------------------------------------- | ------------------------------------------------------------------------------ |
| Cards                           | Badge, nombre, descripción, precio, CTA, **14 filas** | Badge, nombre, descripción, precio, CTA y estados de sesión (`Plan actual`, `?plan=`, checkout) |
| Comparación                     | Tres listas de 14 filas para comparar a ojo        | Tabla "Lo que cambia según el plan": **5 filas**, columnas = planes, celda = estado + texto del propio plan |
| Filas idénticas en los tres     | Repetidas 3 veces (9 filas × 3 = 27 celdas)        | Listadas **una sola vez** bajo "Igual en los tres planes" (9 filas)             |
| Orden de columnas               | Free, Basic, Pro                                  | Pro, Free, Basic (el mismo que las cards y que la landing: un solo orden)       |
| Banners, `?plan=`, skeletons    | Sí                                                | Igual                                                                          |
| Estado vacío / error del API    | Sí (T3)                                           | Igual                                                                          |

**Por qué sólo las diferencias y no una matriz de 42 celdas:** el catálogo está escrito por plan, no por dimensión (`"Hasta 10 recetas"` / `"Hasta 75 recetas"` / `"Recetas ilimitadas"` son tres frases, no un valor por columna), así que una matriz completa obligaría a inventar una etiqueta de fila que el dato no tiene. Con la matriz acotada a las 5 filas que cambian, el comprador lee una sola lane por slot y no repite las 9 filas comunes; `PRODUCT.md` además rechaza las tablas densas tipo ERP. La etiqueta de cada fila no se inventa: la dimensión es el texto del propio plan cuando los tres coinciden (`Duplicar recetas`), y son los textos de cada plan cuando difieren (`Hasta 10 recetas` / `Hasta 75 recetas` / `Recetas ilimitadas`), que es exactamente lo que el visitante compara.

### Orden: por qué el recomendado primero en **las dos** superficies

El plan pide que el plan recomendado no quede a dos swipes en móvil. Se resuelve cambiando el **orden del DOM** (no `order` de CSS, que dejaría la tabulación en desacuerdo con lo que se ve): Pro, Free, Basic. Free queda a un swipe del destacado (es la entrada autoservicio del embudo) y Basic al final. `/pricing` usa el mismo orden para que las cards y las columnas de la matriz coincidan con lo que el visitante acaba de ver en la landing (mismo objeto, mismo orden; sólo cambia el trabajo de la superficie).

### Enumeración de estados responsive (obligatoria)

`/` sección `#pricing`:

| Estado                         | Mobile (375)                                                              | Desktop (1280)                                                        |
| ------------------------------ | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Anónimo                        | Pro destacado visible sin swipe, con CTA a `/sign-in?redirect=/pricing`; Free y Basic a un swipe | Pro, Free y Basic en 3 columnas (Pro con `scale(1.05)`), mismo CTA     |
| Autenticado                    | Igual, con CTA directo a `/pricing`                                        | Igual                                                                  |
| Cargando                       | 3 skeletons con la forma final (sin salto de layout)                       | Ídem                                                                   |
| Error del API                  | Aviso verdadero (T3), sin estado vacío falso                               | Ídem                                                                   |
| Catálogo vacío de verdad       | "No hay planes disponibles por ahora"                                      | Ídem                                                                   |

`/pricing`:

| Estado                     | Mobile (375)                                                              | Desktop (1280)                                                        |
| -------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| Anónimo                    | Pro primero; CTA a `/sign-in?redirect=/pricing`; matriz de diferencias con celdas apiladas | 3 columnas + tabla de 5 filas y lista de 9 comunes                    |
| Autenticado, plan free     | "Plan actual" en la card de Free, sin swipe para ver el destacado          | Igual, con la card del plan actual marcada                             |
| Plan con `?plan=pro`       | Card resaltada (`ring-2`) visible sin swipe                                | Card resaltada con anillo y scroll a la card                           |
| Cargando                   | Skeletons con la forma final                                              | Ídem                                                                  |
| Error del API              | Aviso verdadero (T3), sin estado vacío falso                               | Ídem                                                                  |

Paridad móvil/escritorio: la matriz no oculta ninguna fila en móvil (se apila por celda, sin scroll horizontal) y los destacados de la landing son los mismos en ambos anchos.

## Contratos nuevos

| Contrato                     | Definición                                                                                                                             |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Estado de una fila de plan   | Extraído a `features/billing/plan-feature-state.ts`: `planFeatureState(feature)` + íconos, clases y etiquetas. Una sola fuente para `PlanFeatureList` y la matriz. |
| Destacado (`planHighlights`) | `features/billing/plan-highlights.ts`: lo **incluido y disponible** (`included` y sin `coming_soon`) que además no está incluido en el plan Free; tope `PLAN_HIGHLIGHT_LIMIT = 5`; devuelve `{ features, remaining }`. |
| Comparación (`comparePlans`) | `features/billing/plan-comparison.ts`: alinea los planes por slot (mismo orden/longitud en `TIER_CONFIG`), parte las filas en `changing` (el texto o el estado no coincide en los tres) y `shared` (idénticos), y conserva el texto de cada plan. |
| Orden de planes              | `features/billing/plan-order.ts`: `RECOMMENDED_PLAN_ID = "pro"` + `displayPlanOrder()` (no muta la entrada). Lo aplican la landing, `/pricing` (cards) y `PlanComparison` (columnas), y es la única fuente del id del plan destacado en los archivos que toca esta sesión. |
| Variante compacta            | `PlanFeatureList` acepta `variant="compact"` y `remaining`: mismas filas y mismo contrato accesible, más "y N funciones más" cuando hay recorte. `full` (por defecto) sigue siendo el que monta `PlanChangeDialog`. |
| Marcas de la matriz          | `PlanComparison` recibe el catálogo **sin ordenar** (ordena él) y `currentPlanId?` para marcar la columna del visitante ("Plan actual"); con menos de dos planes o sin filas no pinta nada (nada de encabezados huérfanos). |
| Fixtures de test             | `test/unit/support/plan-fixture.ts` (`planFixture(tier, features)`): la fábrica que compartían los tres specs unitarios nuevos. |

## Pasos ejecutados

1. `features/billing/plan-feature-state.ts`: `planFeatureState()` + `PLAN_FEATURE_ICONS`, `PLAN_FEATURE_ICON_CLASSES`, `PLAN_FEATURE_TEXT_CLASSES` y `PLAN_FEATURE_STATE_LABELS`; `PlanFeatureList` pasa a importarlos (comportamiento idéntico al de T2).
2. `features/billing/plan-highlights.ts`, `plan-comparison.ts` y `plan-order.ts` (puros, con test unit: 14 tests).
3. `PlanFeatureList.vue`: props `variant` (`full`/`compact`) y `remaining`; en compacto, espaciado menor y la nota de recorte (`remainingLabel`, singular/plural).
4. `features/billing/PlanComparison.vue`: tabla de diferencias (`caption` sr-only, `th scope="col"` por plan, celda con ícono `aria-hidden` + estado `sr-only` + texto del plan, reglas verticales entre columnas) + lista de lo común reutilizando `PlanFeatureList`; el componente ordena los planes y marca la columna de `currentPlanId`.
5. `pages/pricing.vue`: fuera las listas de las cards (el detalle vive en la comparación), orden Pro/Free/Basic, `PlanComparison` con el catálogo sin ordenar y la marca de sesión, `font-display` en el `h1` y CTA al fondo de la card (`mt-auto`).
6. `landing/PricingSection.vue`: planes ordenados (Pro primero), destacados por plan, nota de recorte, enlace "Ver todas las funciones" con nombre accesible por plan y `.focus-ring`; el `featured` de las clases/hover/badge sale de la lista de cards, no del literal `"pro"`.
7. `test/e2e/support/stub-api.mjs`: catálogo de features **espejo de `TIER_CONFIG`** (14 filas por plan, mismo orden), que es lo que permite ejercer la matriz y sus grupos en e2e.
8. Tests: unit (18 nuevos), nuxt (`PlanFeatureList` compacta, `PlanComparison` ×6, `LandingPricingSection` ×2) y e2e (orden en móvil + destacados + enlace; matriz de diferencias; marca del plan actual).
9. QA visual con `pnpm dev` + `agent-browser` en 320/375/768/1024/1280, claro y oscuro (30 capturas) y `/design review` de cierre sobre las dos superficies, con el reporte reescrito.
10. Revisión de dos ejes del propio diff (estándares + spec) y cierre de lo que salió accionable: `font-display` en los titulares de página/sección de `/pricing`, marca del plan actual, guarda de la sección vacía, `break-words` en las celdas, `RECOMMENDED_PLAN_ID` como única fuente del id destacado, fuera el parámetro `limit` de `planHighlights` y fábrica de fixtures compartida.

## Verificación

| Comando / medición | Resultado |
| ------------------ | --------- |
| `pnpm --filter @recetario/web test` | **700 pasan** (53 archivos; +18 unit y +9 nuxt de esta sesión) |
| `pnpm --filter @recetario/web type-check` / `lint` | limpios |
| `playwright test --project=chromium` (suite completa) | **164 pasan** (2.7m) |
| `a11y.spec.ts` + `contrast.spec.ts` + `public.spec.ts` | **42 pasan** (axe con recorrido por tramos en claro/oscuro, sonda de contraste por píxeles y los asertos nuevos) |
| `wrangler:dry-run` | OK (warnings preexistentes de `duplicate-object-key` en el chunk de producción, ajenos a estas superficies) |
| Matriz en el DOM (`agent-browser`, /pricing) | 5 filas que cambian, 9 comunes listadas una vez, columnas Pro/Free/Basic; `overflow` de página 0 a 320 en las dos superficies |
| Orden y alcance en móvil (375) | `scrollLeft` 0 y la card Pro entera dentro del viewport; destacados = 4 por plan (unit + duplicar + planificador en los de pago) |
| Lane de CTAs (`/pricing`, 1280) | `y=486..488` en las tres cards (antes Free a 428) |
| Lane de enlaces ("Ver todas las funciones", 1024) | `y=726` en las tres cards |
| Tipografía | `/` h1 y h2 en `Outfit`; `/pricing` h1, h2 de comparación y h3 en `Outfit`; nombres de plan en la pila del sistema (deuda declarada, hallazgo 2 del review) |
| Foco del enlace nuevo | 4 Tab; anillo `rgb(255,255,255) 0 0 0 1px, rgb(248,104,101) 0 0 0 3px` |
| Errores de consola | vacío en `/` y `/pricing` (`agent-browser errors`) |
| Capturas | 30 en `apps/web/test-results/qa-t7/` (gitignored) |

## Decisiones

| # | Decisión | Origen |
| - | -------- | ------- |
| 1 | El corte es **por función de superficie**: la landing decide (destacados), `/pricing` compara (matriz + detalle). Ninguna de las dos duplica a la otra. | Plan (paso 1) + review (deuda de 4 y 6) |
| 2 | Destacado = lo **incluido y disponible que no está en el plan Free**: repetir lo que ya es gratis no es un argumento, y no se vende lo que todavía no existe (`coming_soon` fuera). | Esta sesión (el plan pedía "diferenciadores") |
| 3 | "y N funciones más" cuenta **sólo destacados incluidos sin mostrar**, no filas ocultas del catálogo: decir "y 10 funciones más" en el plan Free (donde 10 filas no están incluidas) sería mentir. Con el catálogo actual no se dispara (4 ≤ 5) y está cubierto por unit + nuxt para cuando crezca. | Review (eje spec) + honestidad del dato |
| 4 | La matriz lleva **sólo las filas que cambian**, con el texto de cada plan por celda: el catálogo no declara una etiqueta de fila ("Hasta 10 recetas" / "Hasta 75" / "ilimitadas" son tres frases), inventarla sería publicar un dato inexistente. | Plan (paso 4) + `PRODUCT.md` (nada de tablas densas) |
| 5 | Orden **Pro, Free, Basic en el DOM** de las dos superficies (nada de `order` de CSS, que dejaría la tabulación desacuerdo con lo que se ve). Free queda a un swipe del destacado. | Plan (paso 3) + a11y |
| 6 | El **recorte** se dice en el componente de lista (`variant="compact"` + `remaining`), pero *qué* es destacado lo decide el módulo puro: la lista no sabe de planes. | Plan (paso 2) |
| 7 | `PlanComparison` **ordena él** (y por eso recibe el catálogo sin ordenar) y marca la columna de `currentPlanId`: las columnas y las cards no pueden desincronizarse, y el anónimo no marca nada. | Review (ejes estándares y spec) |
| 8 | Los **CTAs de `/pricing` se alinean al fondo** (`mt-auto`): al quitarles la lista, las cards dejaron a la vista un desfase de 50px que antes absorbía el catálogo. | QA visual de esta sesión |
| 9 | Los **títulos de card** de las dos superficies se quedan en la pila del sistema y se reportan como hallazgo: aplicar la cara de marca ahí toca superficies de T3/T5/T6 y es una decisión de tipografía, no del relayout. | Review (eje estándares, `DESIGN.md` §3) |
| 10 | `planHighlights` no expone `limit`: nadie lo pasaba salvo un test; el tope es una constante del módulo. | Review (eje estándares, speculative generality) |

## Desviaciones respecto del plan

| # | Plan decía | Se hizo | Por qué |
| - | ---------- | ------- | ------- |
| 1 | "Create: `PlanComparison.vue` (o el nombre que salga del análisis)" | Se creó `PlanComparison.vue` **y tres módulos puros** (`plan-highlights`, `plan-comparison`, `plan-order`) + `plan-feature-state` | La lógica de "qué cambia", "qué se gana" y "en qué orden" es testeable sin DOM; los componentes quedan de pintura. |
| 2 | El plan no pedía tocar la alineación de las cards de `/pricing` | Los CTAs pasaron a `mt-auto` (lane compartida) | Consecuencia directa de quitar la lista de las cards: el desfase quedaba a la vista (Free a 428, el resto a 477). |
| 3 | El plan no pedía tocar el stub más allá del catálogo | El stub gana el espejo de `TIER_CONFIG` completo y el badge "Más popular" | Sin un catálogo con la forma real no se pueden ejercer los grupos de la matriz ("5 cambian / 9 iguales") ni el recorte; T6 ya había dejado el stub como deuda para T7. |
| 4 | El plan no pedía marca de sesión en la matriz | `currentPlanId` + "Plan actual" en la columna | `/pricing` conserva "los estados de sesión": sin la marca, el autenticado no sabe cuál de las tres columnas es la suya. |
| 5 | El plan no pedía `font-display` en `/pricing` | El `h1` y los `h2`/`h3` de la comparación pasan a la cara de marca | `DESIGN.md` §3 la pide para titulares de página y sección; los de card quedan como hallazgo reportado. |
| 6 | El plan no pedía limpiar clases muertas | Se retiró `shadow-accent-tint` del CTA de plan | Deuda que T3 asignó a T7; los usos de hero/features quedan reportados (no son de esta superficie). |

## Deuda / follow-ups

Los cinco hallazgos abiertos del reporte (`.commandcode/design/review-report.md`, veredicto **Needs changes**) tienen modo y FIX escritos:

| # | Severidad | Hallazgo | Modo propuesto |
| - | --------- | -------- | -------------- |
| 1 | MEDIUM | El scroller de planes no revela la card enfocada con teclado en móvil (`focusin` → `scrollIntoView`) | `/design interaction` |
| 2 | LOW | Los títulos de card no usan la cara de marca (`DESIGN.md` §3, las dos superficies) | `/design typeset` |
| 3 | LOW | "Próximamente" esconde si la función futura estará incluida (`plan-feature-state` + clave de igualdad de la matriz) | `/design refine` |
| 4 | LOW | Las lanes internas de las cards de la landing (fila del badge + línea de facturación) | `/design finish` |
| 5 | LOW | `shadow-accent-tint` sin pintar en `HeroSection` y `FeaturesSection` | `/design finish` |

Heredado, sin dueño nuevo:

| Hallazgo | Ubicación | Nota |
| -------- | --------- | ---- |
| El id `"free"` literal en ~15 sitios del feature de billing | `features/billing/**` | El arreglo real es un `PLAN_IDS` compartido; T7 sólo unificó el id del plan destacado |
| `PlanChangeDialog` monta sus propias cards (no usa `PlanCard`) y su lista sigue en `variant="full"` | `features/billing/PlanChangeDialog.vue` | Es un diálogo de `/settings`, no una superficie pública; la variante compacta no aplica ahí |
| `BillingSection` descarta el `error` de `usePricingPlans` | `features/billing/BillingSection.vue:61` | Sin dueño en el plan; el estado vacío del selector quedaría mudo si el catálogo falla |
| El catálogo de prueba vive en tres sitios (stub e2e, fixture nuxt y fixtures unit) | `test/e2e/support/stub-api.mjs`, `test/nuxt/public-ui.spec.ts` | El stub es un proceso aparte (`.mjs`) y el fixture nuxt necesita la forma real; la fábrica de planes sí es compartida |
