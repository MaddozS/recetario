# Task 9 — Detalle y edición base de receta

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 9)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-09-recipe-detail.md`

- **Scope:** `extends-existing`
- **Pre-existing:** `apps/web/src/pages/recipes/[recipe].astro` (baseline de solo lectura), endpoints `GET`/`PATCH /api/recipes/:id` y `/api/ingredients`, `RecipeActionsMenu`/`RecipeDeleteDialog`/`RecipeDuplicateDialog`/`RecipeErrorAlert` y lógica pura de la Task 8, shell Nuxt (Tasks 2–4) e infraestructura de tests (Vitest `unit`/`nuxt`, Playwright + stub del API).
- **Dependencies:** Task 8 (completada). Tasks 1–8 integradas en el HEAD base `435badc`.
- **Parallel-safe:** **no**. La Task 10 depende de ésta y comparte `FinancialSummary` y el detalle.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`, HEAD base `435badc`, árbol limpio (solo `.commandcode/taste/*`).

## Resultado

`/recipes/[id]` deja de ser placeholder: carga SSR de detalle + catálogo de ingredientes en una sola llamada (`Promise.all`), header (título, categoría, badge, «Actualizado», Mezclas), tabs con hash y teclado, vista de ingredientes (cards móvil / tabla desktop) con toggle de notas, editor con picker buscable, `FinancialSummary` base (view/edit) y guardado por `PATCH` **sin recarga** que mantiene la edición ante error y sale de edición con éxito visible. Eliminar y duplicar reutilizan las piezas de la Task 8 desde el menú del detalle. Un 404 (receta inexistente o ajena) redirige a `/recipes`; un fallo de carga muestra card con reintento.

Se eliminó toda la maquinaria imperativa del baseline: clonado de `<template>`, listener delegado (`setupRecipeEditor`), snapshot manual de filas, evento custom `recipe:edit-toggle`, `data-edit-toggle` toggled a mano, `history.pushState/replaceState`, `window.alert` y recarga completa en multiplicador/guardado.

| Elemento       | Valor                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------ |
| Tests web      | **385** (unit 206, nuxt 179) — antes 313                                                               |
| E2E web        | **90/90** (detalle 14) — antes 76                                                                      |
| Tests API      | **202** — antes 201                                                                                    |
| Checks raíz    | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7 (entorno limpio)                                    |
| Bundle Nitro   | build **980 kB** (319 kB gzip) · dry-run **1023.35 KiB** (244.72 KiB gzip) — antes 893 kB / 969.32 KiB |
| Bundle cliente | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto` ni `@stripe/`                                |
| QA visual      | 14 capturas 375/1280 × claro/oscuro en `apps/web/test-results/qa/` (gitignored)                        |

## Decisiones aprobadas en la sesión

1. **Tabs Task 10.** Shell de tabs (hash, teclado, `role=tab`) + panel de Ingredientes; Costos Fijos y Presentaciones muestran «Pendiente: Task 10». El `FinancialSummary` sí calcula con los `recipeFixedCosts` reales del detalle (solo lectura).
2. **`PATCH /api/recipes/:id` shapeado en Hono.** Respondía la fila cruda de Prisma, que **no** valida contra `recipeWithIngredientsSchema` (`category`/`comment`/`brand` nulos). Ahora pasa por `shapeRecipeDetail`, igual que el GET: el detalle valida la respuesta con Zod y la usa como estado nuevo.
3. **Hallazgo 3 de la Task 8 cerrado aquí:** «1 recetas» → «1 receta» en los insights.
4. **Multiplicador y edición en la query** (`?multiplier=`, `?edit=true`) resueltos con `route.query` + `navigateTo`: deep link y back/forward gratis, sin recarga ni refetch. Entrar a editar empuja; cancelar y salir tras guardar usan `replace`.
5. **Sin query params de feedback:** `?type=`/`?message=`/`_fc` retirados (contratos legacy del baseline).
6. **Multiplicador reactivo**, sin las recargas de `data-astro-reload`.
7. **`window.alert` → alerta inline** con el mismo copy.
8. **Validación por fila antes de guardar** (mejora registrada): en Astro las filas inválidas se descartaban en silencio y, si todas lo eran, el `PATCH` borraba todos los `RecipeIngredient` sin avisar.
9. **`FinancialSummary` co-locado** en `app/features/recipes/` (un solo consumidor; la Task 10/12 deciden promoción si producción lo reutiliza).
10. **Promoción a `shared/`** de lo que recetas necesitaba (disparador previsto por la Task 7): `UNIT_OPTIONS`/`DEFAULT_UNIT` → `shared/utils/units.ts` y `normalizeSearchText` → `shared/utils/search.ts`, con el alias `#shared` añadido al proyecto `unit` de Vitest.
11. **Búsqueda del picker con NFD** (el filtro de Astro era solo case-sensitive).
12. **Título útil** `` `${nombre} | KitchCalc` ``. Las migas de pan quedan estáticas (`Recetas / Receta`); ver hallazgos abiertos.
13. **Alerta de éxito** «Receta guardada correctamente.» (Astro no mostraba nada al guardar).

**Contratos de URL que se conservan:** `?edit=true` (deep link), `?multiplier=` y los hashes `#ingredientes`, `#costos-fijos`, `#presentaciones`.

## Hallazgos verificados del baseline (paridad)

| #   | Hallazgo                                                                                                                                        | Estado                                                                                                                                |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Página monolítica de 1831 líneas con 11 acciones POST y 8 bloques de script cliente                                                             | **Dividida**: sólo `update_recipe`, `delete_recipe` y `duplicate_recipe` caen en esta Task; presentaciones y costos fijos son Task 10 |
| 2   | Snapshot manual de filas + `resetEditForm()` reconstruyendo el DOM desde `<template id="ingredient-row-template">`                              | **Reemplazado** por modelo reactivo (`form.rows` + `formFromDetail`)                                                                  |
| 3   | `recipe:edit-toggle` (evento custom) + `data-edit-toggle` mutados por JS + `data-edit-state`                                                    | **Reemplazado** por `v-if`/`v-else` y `data-edit-state` derivado de la query (el hook se conserva para los tests)                     |
| 4   | `setupRecipeEditor` con delegación de eventos y un _fallback_ que adivinaba el ingrediente por nombre al enviar                                 | **Eliminado**: el picker es un componente controlado, no puede desincronizarse                                                        |
| 5   | `window.alert('Agrega al menos un ingrediente antes de guardar.')`                                                                              | **Inline** con el mismo copy (decisión 7)                                                                                             |
| 6   | Multiplicador con enlaces `-`/`+` `data-astro-reload` y `onchange="this.form.submit()"`; step 1 si `>= 2`, si no 0.5; mínimo 0.0001             | **Portado** como estado controlado (paso, mínimo y normalización idénticos)                                                           |
| 7   | Tabs con `replaceState`, flechas y `hashchange`; limpiaban un `_fc` legacy                                                                      | **Portado** salvo el `_fc` (contrato retirado)                                                                                        |
| 8   | Notas: «Ver notas» deshabilitado en edición + `localStorage['recetario.showComments']`, por defecto ocultas                                     | **Portado** (misma clave y default)                                                                                                   |
| 9   | Feedback por query tras cada redirect; `update_recipe` redirigía sin mensaje                                                                    | **Retirado**; éxito/error en estado local                                                                                             |
| 10  | 404 del detalle → redirect a `/recipes`                                                                                                         | **Portado** (302 en SSR; comprobado con `maxRedirects: 0`)                                                                            |
| 11  | El catálogo completo de ingredientes se cargaba siempre para que el picker fuese instantáneo                                                    | **Portado** (una sola llamada junto al detalle)                                                                                       |
| 12  | Reglas de `update_recipe`: nombre vacío → actual o «Receta»; unidad vacía → `unidad`; margen ∈ [0, 100) y `%` ≥ 0; filas inválidas omitidas     | **Portado** + validación explícita (decisión 8)                                                                                       |
| 13  | `formatCantidad`: redondeo half-up para g/ml y `.toFixed(2)` para el resto; conversión kg/lt ↔ g/ml en el subtotal                              | **Portado** verbatim en `recipe-financials.ts`                                                                                        |
| 14  | `FinancialSummary` con dos juegos de filas según `advanced_costs`, highlight índice 2 y campos editables (margen; y `%` operativo sin advanced) | **Portado**; verificado en QA con plan Free y Pro                                                                                     |
| 15  | Ingredientes repetidos como filas independientes                                                                                                | **Portado y cubierto** (Tarta con harina en kg y en g)                                                                                |

## Hallazgos de la sesión (infraestructura y diagnóstico)

| #   | Hallazgo                                                                                                                                                                                                                               | Estado / dueño                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **`refreshNuxtData` desde otra página es un no-op.** `useAsyncData` desregistra su hook `app:data:refresh` al desmontar y `experimental.purgeCachedData` vale `true` por defecto: el listado se remonta y **refetchea solo** al volver | **Corrige el handoff #2 de la Task 8.** No se llama; el e2e lo prueba (guardar → `goBack` → nombre nuevo en la lista)                                   |
| 2   | **Hidratación:** con `useAsyncData` sin esperar, el servidor renderizaba el formulario vacío y el cliente lo hidrataba lleno («Hydration completed but contains mismatches», invisible en el e2e de producción)                        | **Arreglado**: el composable espera los datos, siembra el formulario de forma sincrónica y registra los hooks de ciclo de vida antes del primer `await` |
| 3   | **El stub es un proceso único para toda la suite**: un `TypeError` en un handler tumbó 20 tests (relay y shell incluidos) con fallos en cascada (502/500)                                                                              | **Arreglado**: `normalizeRecipe` rellena el detalle que los seeds de la Task 8 no traían; mapper defensivo                                              |
| 4   | **Vue emite la clase dinámica antes que la estática** (`class="hidden ingredient-comment …"`), así que una aserción de regex por orden falla                                                                                           | **Arreglado** en el e2e (se acota al párrafo)                                                                                                           |
| 5   | **Playwright sigue redirects por defecto** en `request.get`: un 302 se veía como 200                                                                                                                                                   | **Arreglado** con `maxRedirects: 0` en el caso 404                                                                                                      |
| 6   | `agent-browser`: no existen `resize`/`viewport` sueltos (es `agent-browser set viewport <w> <h>`) y `screenshot` escribe en el cwd del **proceso**, no del shell                                                                       | **Documentado**; en QA se usaron rutas absolutas                                                                                                        |
| 7   | **`pnpm format` de la raíz no funciona**: el script `prettier --write .` no tiene prettier como dependencia raíz (vive en `apps/web`)                                                                                                  | **Sin arreglar**: formatear con `pnpm --filter @recetario/web exec prettier --write <paths>`. Dueño: Task 13                                            |

## Pasos ejecutados

1. **API:** `shapeRecipeDetail` en `PATCH /api/recipes/:id` + test del contrato (valida el schema compartido).
2. **`shared/`:** `units.ts` y `search.ts` promovidos; re-exports en ingredientes/recetas; alias `#shared` en el proyecto `unit` de Vitest.
3. **Lógica pura:** `recipe-financials.ts`, `recipe-detail-format.ts`, `recipe-detail-form.ts` y la acción `update` en `recipe-messages.ts`.
4. **Composable y componentes:** `useRecipeDetail` + header, multiplicador, tabs, panel/vista/editor de ingredientes, picker y `FinancialSummary`; página como coordinadora.
5. **Menú de acciones:** variante `page` + a11y pendiente de la Task 8 (Escape cierra y devuelve el foco, foco al primer ítem, flechas).
6. **Hallazgo 3 de la Task 8:** singular correcto en los insights + aserción.
7. **Tests:** 4 specs unit, `recipe-detail-ui.spec.ts` (28 casos), `recipe-detail.spec.ts` (14 e2e) y stub ampliado (detalle, PATCH, `patchAttempts`, sentinelas).
8. **Diagnóstico de hidratación** en dev con `agent-browser` (el aviso detallado sólo aparece en dev) y corrección.
9. **Verificación completa, QA visual (14 capturas) y limpieza de procesos.**

## Desviaciones respecto del plan

| #   | Desviación                                                                               | Motivo                                                                                                                                              |
| --- | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Commit extra `fix(web): hidratar el detalle de forma determinista`                       | El bug de hidratación apareció al verificar (no estaba previsto); se aisló de la feature para que el historial lo explique                          |
| 2   | El header expone `data-multiplier="desktop\|mobile"` y el badge una prop `savedCategory` | Sin el hook no se pueden acotar las dos instancias del multiplicador; el badge debía mostrar la categoría guardada (paridad) y no la del formulario |
| 3   | El composable es `async`, espera los datos y registra `onMounted` antes del `await`      | Requisito de Vue para hooks de ciclo de vida y de la hidratación determinista                                                                       |
| 4   | El copy del placeholder es «Pendiente: Task 10» + una frase explicativa                  | El plan sólo fijaba la etiqueta; añadir el motivo evita paneles mudos                                                                               |
| 5   | La lista de ingredientes no muestra estado vacío                                         | Paridad con Astro (queda anotado como hallazgo abierto)                                                                                             |

## Verificación

| #   | Comando                                                               | Resultado                                                             |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | `pnpm --filter @recetario/web lint`                                   | 0 errores, 0 warnings                                                 |
| 2   | `pnpm --filter @recetario/web type-check`                             | `nuxt typecheck` sin errores                                          |
| 3   | `pnpm --filter @recetario/web test`                                   | 30 archivos, **385 tests verdes** (unit 206, nuxt 179)                |
| 4   | `pnpm --filter @recetario/api test`                                   | **202 tests verdes** (incluye el contrato shapeado del PATCH)         |
| 5   | `pnpm --filter @recetario/web test:e2e`                               | **90/90** (detalle 14)                                                |
| 6   | `pnpm --filter @recetario/web build`                                  | 980 kB (319 kB gzip)                                                  |
| 7   | `pnpm --filter @recetario/web wrangler:dry-run`                       | 1023.35 KiB (244.72 KiB gzip); bindings `API`, `ASSETS`, `NODE_ENV`   |
| 8   | `env -u WEB_ORIGIN … pnpm lint && type-check && test && build` (raíz) | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7                    |
| 9   | `grep` del bundle cliente                                             | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto`, `@stripe/` |
| 10  | QA visual (agent-browser 0.27.0, dev contra el stub en 8787)          | 14 capturas 375/1280 × claro/oscuro                                   |
| 11  | Puertos y procesos                                                    | 4321 y 8787 libres; sin `nuxt`/`workerd`/`stub-api` vivos             |
| 12  | `git status`                                                          | solo archivos de esta Task                                            |

### Evidencia e2e (`recipe-detail.spec.ts`)

- **SSR:** título, badge «Postres», «Actualizado», `Lista de Ingredientes`, «Ver notas», tabla con `Harina de trigo (Del Campo)` repetida (kg y g) y `Plátano`, notas ocultas, `Costo Insumos $33.00`, tabs, y cabeceras `private, no-store` + `x-robots-tag`.
- **Free vs Pro:** `Gastos Operativos 10% +$3.30`, `Costo Total Real $36.30` sin advanced; `Total Costos Fijos`/`Margen Deseado` con advanced.
- **Tabs:** deep link `#costos-fijos` con SSR del panel activo, click a `#presentaciones`, flecha izquierda, panel de Ingredientes.
- **Notas:** ocultas → visibles con el toggle y persistentes tras recarga.
- **Multiplicador:** `?multiplier=2` en SSR (`Con x2`, `$66.00`), `+` con paso 1 (`multiplier=3`, `$99.00`), input a `1.5`, todo sin recarga (marcador de página vivo).
- **Edición:** deep link `?edit=true` con 3 filas y valores del detalle; cancelar restaura y no llama al API (`patchAttempts: 0`).
- **Guardar:** renombrar + margen 40 + cantidad 0.75 → sin recarga, éxito visible, `patchAttempts: 1`, y al volver con el historial el listado refetchea y muestra el nombre nuevo.
- **Validación local:** fila nueva sin ingrediente → mensaje y `data-invalid`; sin filas → «Agrega al menos un ingrediente antes de guardar.»; **0 PATCH** en ambos.
- **Error del API:** `Fallo simulado` → alerta del servidor, sigue en edición y sin enlace de upgrade.
- **404:** `/recipes/999` responde 302 → `/recipes`.
- **Eliminar/Duplicar:** desde el menú del detalle; la copia abre en `?edit=true` con sus 3 filas y Free no ofrece Duplicar.
- **Responsive:** 375 (cards + multiplicador móvil) y 1280 (tabla + multiplicador de escritorio).

## Paridad responsive / QA visual

Dev server contra el stub del API (`STUB_API_PORT=8787`), `agent-browser` 0.27.0, capturas en `apps/web/test-results/qa/` (gitignored). Sesión Pro/Free, tema claro y oscuro, acento esmeralda.

| Condición          | Mobile (375)                                                                          | Desktop (1280)                                                         | Evidencia                                  |
| ------------------ | ------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------ |
| vista / SSR        | Mezclas en fila propia; título en dos líneas; resumen apilado; cards con Base y Costo | Mezclas junto al menú; resumen 2×2 con highlight; tabla con subtotales | `375/1280-detail-dark-emerald.png`         |
| cards móviles      | 3 cards con `Cantidad usada en esta mezcla`, Costo y Base                             | (ocultas; tabla)                                                       | `375-detail-cards-dark-emerald.png`        |
| tabla escritorio   | (oculta)                                                                              | `Harina de trigo (Del Campo)` ×2 y `Plátano` con Base 0.50 KG / 100 G  | `1280-detail-table-dark-emerald.png`       |
| multiplicador `?2` | —                                                                                     | CON X2 1.00 KG / 4.00 KG y `$66.00` en el resumen                      | `1280-detail-multiplier-dark-emerald.png`  |
| notas visibles     | —                                                                                     | comentario «Para la masa» bajo la fila                                 | `1280-detail-notes-dark-emerald.png`       |
| edición            | filas apiladas con labels visibles, Guardar/Cancelar en fila propia                   | grid de 4 columnas, Guardar/Cancelar a la derecha, margen editable     | `375/1280-detail-edit-dark-emerald.png`    |
| tema claro         | —                                                                                     | resumen con tokens claros                                              | `1280-detail-light-emerald.png`            |
| tabs Task 10       | —                                                                                     | panel «Pendiente: Task 10» con la tab activa                           | `1280-detail-tabs-light-emerald.png`       |
| plan Free          | —                                                                                     | filas operativas con `%` y margen editables                            | `1280-detail-free-light-emerald.png`       |
| validación local   | —                                                                                     | alerta «Agrega al menos un ingrediente…» tras quitar las filas         | `1280-detail-validation-light-emerald.png` |
| error del API      | —                                                                                     | alerta «Fallo simulado del servidor» sin CTA de upgrade                | `1280-detail-save-error-light-emerald.png` |
| guardado correcto  | —                                                                                     | alerta de éxito, `0.75 kg` → `$39.25` recalculado en sitio             | `1280-detail-saved-light-emerald.png`      |

Verificado por `eval`: `data-edit-state`, `aria-selected` de los tabs, `display` de tabla/cards y de ambas instancias del multiplicador por breakpoint, filas repetidas, subtotales, `wait` del picker con la unidad autocompletada, `#toggle-comments.disabled` en edición y persistencia en `localStorage`.

## Riesgos y rollback

| Riesgo                                                | Estado                                                                                                 |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| Cambio de contrato del PATCH afecta a otro consumidor | Sólo lo consumía `[recipe].astro` (fuera de build); grep previo + test del handler                     |
| Alias `#shared` en el proyecto `unit`                 | Cambio aditivo; la suite unit completa pasa                                                            |
| Migas de pan sin el nombre de la receta               | Hueco documentado (el shell lee `route.meta` antes del setup de la página); el título HTML sí lo lleva |
| `formatLastUpdated` depende del reloj                 | Sólo cambia si el día cambia entre SSR e hidratación; e2e sin errores de consola                       |
| Regresión en Tasks 2–8                                | Sus suites siguen verdes (90/90 e2e, 385 tests web, 202 API)                                           |

**Rollback:** `git revert` de los commits de la Task. Sin migraciones, deploy ni estado persistente nuevo. El árbol Astro queda intacto como referencia.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit                                                            | Contenido                                                                           |
| ----------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `fix(api): devolver el detalle shapeado al actualizar una receta` | `apps/api/src/recipes/update.ts` + `update.test.ts`                                 |
| `feat(web): compartir unidades y búsqueda normalizada`            | `shared/utils/{units,search}.ts`, re-exports, alias `#shared` en Vitest             |
| `feat(web): agregar la lógica pura del detalle de receta`         | `recipe-financials`, `recipe-detail-form`, `recipe-detail-format`, mensajes         |
| `feat(web): portar los componentes del detalle y la edición`      | `useRecipeDetail` + 8 componentes + página + extensión del menú                     |
| `fix(web): corregir el singular de recetas en los insights`       | `RecipesInsights.vue` + aserción (hallazgo 3 de la Task 8)                          |
| `fix(web): hidratar el detalle de forma determinista`             | Espera de datos, siembra sincrónica, badge `savedCategory`, hooks `data-multiplier` |
| `test(web): cubrir el detalle de receta (unit, nuxt y e2e)`       | 4 specs unit, `recipe-detail-ui.spec.ts`, `recipe-detail.spec.ts` y stub            |

## Hallazgos abiertos y quién los atiende

| #   | Hallazgo                                                                                                | Dónde se manifiesta                                     | Dueño           | Cómo se cierra                                                                                                           |
| --- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 1   | Las migas de pan muestran «Receta» en vez del nombre                                                    | `app/pages/recipes/[recipe].vue`, `layouts/private.vue` | Task 13 o shell | **Explícito**: el shell necesita leer un crumb dinámico después del setup de la página (estado o `useState` con cleanup) |
| 2   | La lista de ingredientes de una receta sin filas no muestra mensaje (paridad con Astro)                 | `RecipeIngredientView.vue`                              | Task 13 / UX    | **Explícito** y cosmético; hoy el flujo de receta nueva entra directo en edición                                         |
| 3   | Los tabs Costos Fijos y Presentaciones son placeholders                                                 | `app/pages/recipes/[recipe].vue`                        | **Task 10**     | **De paso**: esa Task los reemplaza por el CRUD real                                                                     |
| 4   | `pnpm format` de la raíz falla (prettier sólo existe en `apps/web`)                                     | `package.json` (raíz), `apps/web/package.json`          | Task 13         | **Explícito**: mover prettier a la raíz o cambiar el script                                                              |
| 5   | Componentes de `app/features/**` siguen sin auto-registro (hallazgo 1 de la Task 8)                     | cualquier slice nuevo                                   | Task 13         | **De paso**: imports explícitos por sesión; guard opcional en `test/nuxt/setup.ts`                                       |
| 6   | La pill «N ingredientes» del listado no se recalcula tras borrar (hallazgo 9 de la Task 8)              | `RecipesStats.vue` / `useRecipes()`                     | Sin dueño       | **Aceptado**: cualquier refresco o navegación la corrige                                                                 |
| 7   | `FinancialSummary` gana `id`s de input fijos (`fs-edit-*`): dos instancias en la misma página chocarían | `FinancialSummary.vue`                                  | Sin dueño       | **Aceptado** mientras haya una sola instancia por página                                                                 |

`graphify` no se usó (la preferencia vigente lo prohíbe); la Task 13 decide si sigue omitiéndose.
