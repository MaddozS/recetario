# Task 10 — Presentaciones, costos fijos y finanzas

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 10)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-10-recipe-financials.md`

- **Scope:** `extends-existing`
- **Pre-existing:** Task 9 (`app/pages/recipes/[recipe].vue` con los dos placeholders «Pendiente: Task 10», `useRecipeDetail`, `FinancialSummary` y `recipe-financials.ts`), endpoints y schemas de presentaciones/costos fijos de las Tasks 3/9, shell Nuxt (Tasks 2–4) e infraestructura de tests (Vitest `unit`/`nuxt`, Playwright + stub del API).
- **Dependencies:** Task 9 (completada, HEAD base `ebaa894`).
- **Parallel-safe:** **no**. El roadmap prohíbe paralelizar Tasks 9 y 10: comparten `FinancialSummary` y el detalle.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`, HEAD base `ebaa894`, árbol limpio (solo `.commandcode/taste/*`).

## Resultado

Las tabs **Costos Fijos** y **Presentaciones** dejan de ser placeholders: CRUD autónomo de costos fijos (card en modo creación, edición en línea, borrado con confirmación) y de presentaciones (alta por dialog, edición en línea, borrado), CRUD independiente del modo de edición de la receta, y finanzas recalculadas en sitio (resumen, costo de mezcla, precio sugerido, costo unitario, ganancia y margen) sin ninguna recarga.

Se eliminó la maquinaria imperativa del baseline en este camino: los custom elements `presentation-card` y `fixed-cost-card` (≈500 líneas de `textContent`/`className`/`style` mutados a mano), la inyección de cards con `innerHTML` + `document.createElement`, el borrado manual del empty state, `history.replaceState` + `window.location.reload()` al crear un costo fijo, el `POST`-redirect al crear una presentación, el parche del resumen por DOM (`applyFinancialSummary` sobre `[data-financial-row]`), el toast flotante con estilos inline en `document.body`, el listener global de `keydown` por card y los eventos `astro:*`.

| Elemento       | Valor                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------ |
| Tests web      | **471** (unit 261, nuxt 210) — antes 385                                                                     |
| E2E web        | **104/104** (finanzas 14) — antes 90                                                                         |
| Tests API      | **202** — sin cambios                                                                                        |
| Checks raíz    | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7 (entorno limpio, `env -u WEB_ORIGIN`)                      |
| Bundle Nitro   | build **1.06 MB** (337 kB gzip) · dry-run **1089.90 KiB** (256.25 KiB gzip) — antes 980 kB / 1023.35 KiB    |
| Bundle cliente | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto` ni `@stripe/`                                      |
| QA visual      | 16 capturas 375/1280 × claro/oscuro en `apps/web/test-results/qa/` (gitignored)                              |

## Decisiones aprobadas en la sesión

1. **Los costos fijos por presentación siguen sin UI** (respuesta del usuario). `PresentationFixedCosts.astro` queda sin portar: la UI no crea ni edita FCs por presentación. El cálculo puro sí los soporta (`computePresentationFixedCostsTotal`) porque el detalle del API los devuelve, igual que hacía `computePresentationBatchCost` en Astro.
2. **Estados vacíos sí** (respuesta del usuario). Las presentaciones sin filas muestran `EmptyState` con mensaje y CTA; los costos fijos conservan el mensaje que ya existía en Astro.
3. **CRUD fuera del modo de edición de receta** (mandato del roadmap). El baseline escondía «Nueva Presentación» detrás de `data-edit-toggle="edit"`; ahora el botón está siempre visible, igual que «Agregar Costo Fijo».
4. **Badges con tokens semánticos.** Astro usaba `bg-turmeric-bg`, `bg-herb-bg` y `bg-chili-bg`, que **no existen** en el design system (utilidades muertas: esos badges salían sin fondo). Mapeo: `PERCENTAGE` → `warning`, `AMOUNT`/`PER_UNIT` → `accent`, `PER_BATCH` → `success`, `PER_HOUR` → `danger`.
5. **Éxito visible sin recargas.** Alertas del kit con el copy del baseline (`Costo fijo guardado.`, `Costo fijo eliminado.`, `Presentación eliminada correctamente.`) y tres nuevos por simetría (`Costo fijo creado.`, `Presentación creada correctamente.`, `Presentación guardada correctamente.`). Los errores de mutación van inline en la card; **nunca** con CTA de upgrade: ninguna de las dos features está gateada por plan en Hono.
6. **`hours` coherente.** Al cambiar de base fuera de `PER_HOUR` el `PATCH` manda `hours: null` en vez de dejar pegado el valor del input oculto (baseline). Invisible para el usuario.
7. **Semántica de `salePrice` (paridad exacta).** El input arranca con el precio guardado o, si es `null`, con el **sugerido**; guardar sin tocar el campo **omite** `salePrice` del `PATCH` (`priceDirty`); vaciarlo envía `null`.
8. **Validación en una sola fuente.** Los formularios no validan: lo hace el composable con los módulos puros antes de llamar al API (`0` peticiones en caso inválido) y la card muestra el mensaje del outcome.
9. **`FinancialSummary` se queda en `app/features/recipes/`** con su API intacta (`rows`, `highlight-row`, `fields`, `editable` + dos `v-model`). Contrato para Tasks 11/12, que sólo la consumen (no se promueve al kit sin un segundo consumidor real).
10. **Sin cambios en `apps/api`.** Los diez endpoints y los schemas ya existían y tenían tests. Único detalle de contrato: el `PATCH` de presentación responde **sin** `fixedCosts` → `mergePresentationResponse` los conserva.

**Contratos de URL que se conservan:** `?edit=true`, `?multiplier=` y los hashes `#ingredientes`, `#costos-fijos`, `#presentaciones`.

## Hallazgos verificados del baseline (paridad)

| #   | Hallazgo                                                                                                                     | Estado                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| 1   | `presentation-card` / `fixed-cost-card` como custom elements con estado y DOM mutados a mano                                  | **Reemplazados** por componentes declarativos (`PresentationCard`, `FixedCostCard`)                                    |
| 2   | Cards de creación inyectadas con `innerHTML` y empty state borrado con `remove()`                                             | **Reemplazado** por `v-if` sobre el estado del panel                                                                   |
| 3   | Crear costo fijo recargaba la página (`reloadTab()`); crear presentación hacía POST-redirect                                  | **Sin recarga**: las mutaciones aplican la respuesta al detalle (`applyRecipe`)                                        |
| 4   | El resumen se parcheaba por DOM tras cada mutación de costos fijos                                                            | **Derivado**: `financialRows` es `computed` sobre `recipe.recipeFixedCosts`                                            |
| 5   | «Nueva Presentación» sólo en modo edición de receta                                                                           | **Siempre visible** (decisión 3)                                                                                      |
| 6   | Badges con clases inexistentes (`turmeric`/`herb`/`chili`)                                                                    | **Tokens semánticos** (decisión 4)                                                                                    |
| 7   | Toast flotante creado por JS, con estilos inline, fuera del layout                                                            | **`FeedbackAlert`** de la página                                                                                      |
| 8   | Errores con el texto crudo del servidor (se veía `Fixed cost not found` en inglés)                                            | **`resolveRecipeFinancialsError`** con copy en español                                                                 |
| 9   | El error de la card de presentación vivía dentro del `save-bar` (oculto fuera de edición: los errores de borrado no se veían) | **Corregido**: el error se pinta siempre                                                                              |
| 10  | El ícono de borrar del costo fijo se mostraba en la fila de vista aunque Astro lo ocultaba                                    | **Corregido** en QA visual (sólo el lápiz en vista; el borrado vive en la edición)                                     |
| 11  | El dialog de alta usaba `type="number"` (rechaza la coma decimal) y validez nativa del navegador                              | **`type="text" inputmode="decimal"`** + validación pura, igual que el resto del formulario de receta                   |
| 12  | Subtítulo «Define cuantas piezas salen por mezcla» (sin tilde)                                                                | **Corregido** a «cuántas» (mismo criterio que Tasks 7/9)                                                              |
| 13  | La card de presentación calculaba con `data-cost`/`data-recommended` congelados en el SSR                                     | **Reactivo**: `computed` sobre el costo de mezcla y el margen vigentes (ver desviaciones)                              |
| 14  | Los FCs por presentación existían en el API pero la sección estaba oculta                                                     | **Sin cambios** (decisión 1): hallazgo abierto                                                                        |

## Hallazgos de la sesión (infraestructura y diagnóstico)

| #   | Hallazgo                                                                                                                                                                     | Estado / dueño                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | El stub devolvía `presentations: []` fijo y los seeds de FC no traían `recipeId`: el detalle fallaba la validación de Zod y la página mostraba «No se pudo cargar la receta» | **Arreglado**: `toPresentationDetail`/`toFixedCostDetail` (shaping como Hono) y seeds completos                     |
| 2   | `trigger("click")` sobre un `button[type=submit]` **no** dispara el submit del formulario en el entorno de test                                                              | **Arreglado**: los specs disparan `form.trigger("submit")` (documentado aquí para las próximas sesiones)            |
| 3   | `wrapper.findAll("button").find(text === "Cancelar")` captura el `Cancelar` del dialog de confirmación (siempre montado)                                                    | **Arreglado**: hooks `data-fc-cancel` / `data-presentation-*` y selección acotada                                   |
| 4   | El nombre de una presentación vive en un `<input>`: `toContainText` nunca lo ve (los valores no son `textContent`)                                                            | **Arreglado**: `toHaveValue` en los e2e                                                                             |
| 5   | `WEB_ORIGIN` exportado en el shell rompe `apps/api/src/billing/portal.test.ts` (espera `http://localhost`)                                                                   | **Pre-existente**; los checks de la raíz ya se ejecutan con `env -u WEB_ORIGIN`                                      |
| 6   | La sesión de QA con `agent-browser` necesita `cookies set --url http://localhost:4321` (sin `--url` da «Invalid cookie fields») y el tema real se cambia con la cookie `kitchcalc-theme` | **Documentado**; tocar sólo la clase `dark` deja los acentos del tema anterior y falsea las capturas                |

## Pasos ejecutados

1. **Lógica pura:** `recipe-fixed-costs.ts` (draft, validación, payload, reducers), `recipe-presentations.ts` (draft, validación, payloads con `priceDirty`, métricas, reducers + merge) y extensiones de `recipe-financials.ts` (`computeRecipeFixedCostsTotal`, `computeRecipeBatchCost`, `computeSuggestedBatchPrice`) y `recipe-messages.ts` (`resolveRecipeFinancialsError`).
2. **Composable:** `useRecipeFinancials` (presentaciones + costos fijos + costo de mezcla y precio sugerido) y `applyRecipe` como escritor único del detalle en `useRecipeDetail`.
3. **Componentes:** `FixedCostCard`, `RecipeFixedCostsPanel`, `PresentationCard`, `PresentationsPanel` y `PresentationCreateDialog`; página del detalle cableada (placeholders fuera).
4. **Tests:** 3 specs unit nuevos + 2 extendidos, `recipe-financials-ui.spec.ts` (31 casos), `recipe-financials.spec.ts` (14 e2e) y stub ampliado (endpoints, contadores y `lastPresentationPatch`); placeholders retirados de `recipe-detail.spec.ts`.
5. **Verificación completa, QA visual (16 capturas) y limpieza de procesos.**

## Desviaciones respecto del plan

| #   | Desviación                                                                                            | Motivo                                                                                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Las métricas se calculan dentro de `PresentationCard` (no en el composable)                           | El borrador en edición vive en la card: así el margen y la ganancia acompañan lo que el usuario escribe, como el `calculate()` del baseline                  |
| 2   | `toFixedCostPayload` es una sola función para alta y edición                                          | Los cuerpos eran idénticos; dos nombres para lo mismo era ruido                                                                                            |
| 3   | El precio sugerido y el costo unitario se recalculan en vivo mientras se edita el margen de la receta | El baseline los congelaba en atributos del SSR; con el estado reactivo se actualizan (consecuencia de quitar las recargas, no un cambio de fórmula)         |
| 4   | El estado vacío de presentaciones es nuevo (`EmptyState` + CTA)                                       | Decisión 2 de la sesión                                                                                                                                   |
| 5   | El ícono de borrar se quitó de la fila de vista                                                      | Hallazgo 10: el baseline lo ocultaba y la card mostraba un botón muerto                                                                                    |

## Verificación

| #   | Comando                                                               | Resultado                                                                        |
| --- | --------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | `pnpm --filter @recetario/web lint`                                   | 0 errores, 0 warnings                                                            |
| 2   | `pnpm --filter @recetario/web type-check`                             | `nuxt typecheck` sin errores                                                     |
| 3   | `pnpm --filter @recetario/web test`                                   | 35 archivos, **471 tests verdes** (unit 261, nuxt 210)                           |
| 4   | `env -u WEB_ORIGIN pnpm --filter @recetario/api test`                 | **202 verdes** (sin cambios)                                                     |
| 5   | `pnpm --filter @recetario/web test:e2e`                               | **104/104** (finanzas 14)                                                        |
| 6   | `pnpm --filter @recetario/web build`                                  | 1.06 MB (337 kB gzip)                                                            |
| 7   | `pnpm --filter @recetario/web wrangler:dry-run`                       | 1089.90 KiB (256.25 KiB gzip); bindings `API`, `ASSETS`, `NODE_ENV`              |
| 8   | `env -u WEB_ORIGIN … pnpm lint && type-check && test && build` (raíz) | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7                               |
| 9   | `grep` del bundle cliente                                             | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto`, `@stripe/`            |
| 10  | `pnpm --filter @recetario/web exec prettier --write <paths>`          | Formato aplicado a los archivos de la Task                                        |
| 11  | QA visual (agent-browser 0.27.0, dev contra el stub en 8787)          | 16 capturas 375/1280 × claro/oscuro, Pro y Free                                   |
| 12  | Puertos y procesos                                                    | 4321 y 8787/8788 libres; sin `nuxt`/`workerd`/`stub-api` vivos                    |
| 13  | `git status`                                                          | solo archivos de esta Task (más `.commandcode/taste/*`, gestionado por el sistema) |

### Evidencia e2e (`recipe-financials.spec.ts`)

- **SSR:** costos fijos con badges (`Monto`/`Por Mezcla`, `Por Hora` + `(2h)`, `Porcentaje` + `16%`), resumen `$175.28` de FC y `$208.28` total; presentaciones con `Rinde:` y el precio sugerido cuando `salePrice` es `null`; estados vacíos de ambas tabs.
- **Crear costo fijo:** card de creación inline, empty state retirado, `Costo fijo creado.`, resumen `$100.00`/`$133.00`, `fixedCostAttempts: 1` y `data-edit-state` intacto (marcador de página vivo ⇒ sin recarga).
- **Por hora:** base `PER_HOUR` muestra el campo de horas; `(3h)` en la card y `$120.00` de total, sin escalar con `?multiplier=2`.
- **Editar:** cambiar de tipo a `PERCENTAGE` 10 % deja `10%` en la card y `$3.30` en el resumen; cancelar revierte y **no** llama al API (`fixedCostAttempts: 0`).
- **Eliminar:** confirmación en el dialog de la card, `Costo fijo eliminado.` y resumen recalculado.
- **Validación y error:** valor `0` → mensaje local con 0 peticiones; sentinela `Fallo simulado` → error inline sin «Actualizar plan».
- **Free:** filas `Gastos Operativos`/`Costo Total Real` y CRUD de costos fijos igual de operativo.
- **Presentaciones:** alta desde el estado vacío con `$5.50` de costo unitario y `$7.86` sugerido; edición que **omite** `salePrice` sin tocarlo y lo manda `null` al vaciarlo (verificado en `lastPresentationPatch` y en el estado del stub); `?multiplier=2` con `Con x2:` y el margen recalculado al escribir el precio (`Bajo` → `Saludable`); borrado con confirmación; validación local con el botón deshabilitado; error del API dentro del dialog.
- **Responsive:** en 375 las cards van en una columna y la cabecera muestra «Nueva»; en 1280 dos columnas con la misma información.

## Paridad responsive / QA visual

Dev server contra el stub del API (`STUB_API_PORT=8787`), `agent-browser` 0.27.0, capturas en `apps/web/test-results/qa/` (gitignored). Sesión Pro y Free, tema claro y oscuro, acento esmeralda.

| Condición                  | Mobile (375)                                                                   | Desktop (1280)                                                              | Evidencia                                        |
| -------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------ |
| Costos Fijos (vista)       | cards a 1 columna, badges envueltos, lápiz a la derecha, valor en mono         | idéntico (el baseline ya era 1 columna)                                     | `375/1280-fc-view-dark.png`                      |
| Costo fijo (creación)      | campos apilados y Cancelar/Guardar en fila propia                              | grid de 3 columnas y acciones a la derecha                                  | `375-fc-create-dark.png`, `1280-fc-edit-dark.png` |
| Costo fijo (edición)       | igual, con Eliminar/Cancelar/Guardar                                           | ídem con horas junto al valor cuando la base es por hora                    | `1280-fc-edit-dark.png`                          |
| Costo fijo (eliminar)      | dialog a `calc(100vw-2rem)`                                                    | dialog `max-w-md`                                                           | `1280-fc-delete-dialog-dark.png`                 |
| Error de mutación          | inline bajo la card, sin CTA de plan                                           | igual                                                                       | `1280-fc-error-dark.png`                         |
| Presentaciones (vista)     | 1 columna; nombre, rinde, costo unitario, precio, ganancia y margen            | 2 columnas con la misma información                                         | `375-presentations-dark.png`, `1280-presentations-dark.png` |
| Presentación (edición)     | inputs apilados + «Guardar Cambios» a lo ancho                                 | precio en línea con «Sugerido» y guardar en la barra                        | `375-presentation-edit-dark.png`, `1280-presentation-edit-dark.png` |
| Alta de presentación       | dialog a ancho completo con campos apilados                                    | `max-w-md` con piezas y precio en dos columnas                              | `1280-presentation-create-dialog-dark.png`       |
| Eliminar presentación      | dialog de confirmación                                                         | igual                                                                       | `1280-presentation-delete-dialog-dark.png`       |
| Margen                     | etiqueta + barra bajo el precio                                                | `Medio 30.0 %` ámbar y `Saludable 42.1 %` verde                             | `1280-presentation-margin-dark.png`              |
| Multiplicador (`?2`)       | —                                                                              | chips `Con x2: 12/24 piezas` y costos por pieza reducidos                    | `1280-presentations-multiplier-light.png`        |
| Estado vacío (presentac.)  | mensaje + CTA «Crear presentación»                                             | igual (CTA visible por slot, no por `lg:hidden`)                            | `1280-presentations-empty-light.png`             |
| Plan Free (sin advanced)   | resumen `Gastos Operativos` con `%` y tab de FC operativa                      | igual + badge `Free`                                                        | `1280-fc-free-dark.png`                          |

Verificado por `eval`: `data-edit-state`, `data-fc-mode`, `data-presentation-mode`, `data-margin-tone`, `data-price`, longitudes de botones por breakpoint y los textos del resumen financiero en Free y Pro.

## Riesgos y rollback

| Riesgo                                                                        | Estado                                                                                                    |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| El stub se amplió (endpoints + shaping) y es un único proceso para toda la suite | Seeds por test con `__qa/recipes/reset`; los seeds por defecto de la Task 9 no se tocaron y su suite pasa |
| Cambio de contrato del `PATCH` de presentación (clave `salePrice` omitible)    | Es el contrato de Hono (`salePrice` sólo viaja si el usuario lo toca); cubierto por unit y e2e             |
| `applyRecipe` como escritor único del detalle                                  | El guardado de la receta lo usa también; su suite y el e2e siguen verdes                                  |
| Regresión en Tasks 2–9                                                         | 471 tests web, 104 e2e y 202 API verdes                                                                   |

**Rollback:** `git revert` de los commits de la Task. Sin migraciones, deploy ni estado persistente nuevo. El árbol Astro queda intacto como referencia.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit                                                            | Contenido                                                                                  |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `feat(web): agregar la lógica pura de costos fijos y presentaciones` | `recipe-fixed-costs.ts`, `recipe-presentations.ts`, extensiones de `recipe-financials.ts` y `recipe-messages.ts` |
| `feat(web): portar costos fijos y presentaciones al detalle`      | `useRecipeFinancials`, `applyRecipe`, 5 componentes y la página                             |
| `test(web): cubrir costos fijos y presentaciones (unit, nuxt y e2e)` | 4 specs unit, spec nuxt, spec e2e y ampliación del stub                                    |
| `docs(nuxt): registrar la task 10`                                | Este task file + banner en `AGENTS.md`                                                      |

## Hallazgos abiertos y quién los atiende

| #   | Hallazgo                                                                   | Dónde se manifiesta                   | Dueño            | Cómo se cierra                                                                     |
| --- | -------------------------------------------------------------------------- | ------------------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| 1   | Los costos fijos por presentación siguen sin UI (decisión 1)                | `PresentationCard` / API              | Producto / task futura | **Explícito**: el cálculo ya los soporta; falta decidir si se activan          |
| 2   | Las migas de pan muestran «Receta» en vez del nombre                        | `layouts/private.vue`                 | Task 13 / shell  | **Explícito** (hallazgo 1 de la Task 9)                                             |
| 3   | La lista de ingredientes de una receta sin filas no muestra mensaje         | `RecipeIngredientView.vue`            | Task 13 / UX     | **Explícito** (hallazgo 2 de la Task 9)                                             |
| 4   | `pnpm format` de la raíz falla (prettier sólo existe en `apps/web`)         | `package.json` (raíz)                 | Task 13          | **Explícito**: usar `pnpm --filter @recetario/web exec prettier --write <paths>`     |
| 5   | Componentes de `app/features/**` sin auto-registro                          | cualquier slice nuevo                 | Task 13          | **De paso**: imports explícitos por sesión                                           |
| 6   | `FinancialSummary` mantiene `id`s de input fijos (`fs-edit-*`)              | `FinancialSummary.vue`                | Task 12          | **De paso** si producción monta dos instancias; hoy hay una sola                     |
| 7   | Las clases `turmeric`/`herb`/`chili` siguen muertas en el árbol Astro       | `src/components/molecules/recipes/**` | Task 13          | **De paso**: desaparecen al retirar Astro                                            |

`graphify` no se usó (la preferencia vigente lo prohíbe); la Task 13 decide si sigue omitiéndose.
