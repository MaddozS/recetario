# Task 8 — Slice vertical del listado de recetas

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 8)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-08-recipes-list.md`

- **Scope:** `extends-existing`
- **Pre-existing:** endpoints/schemas de recetas (`/api/recipes`, `/:id/duplicate`, `/:id` DELETE, `/api/ingredients/usage`), límites y feature gates en Hono (`requireRecipeCapacity`, `requireFeature("recipe_duplicate")`), shell Nuxt de Tasks 2–4, patrón del slice de ingredientes (Task 7) e infraestructura de tests (Vitest `unit`/`nuxt`, Playwright + stub del API).
- **Dependencies:** Tasks 3 y 4 (completadas). Tasks 5, 6 y 7 completadas en el HEAD base.
- **Parallel-safe:** sí con Task 7 (cerrada); **no** con Task 9, que depende de esta.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`, HEAD base `99089db`, árbol limpio (solo `.commandcode/taste/*`).

## Resultado

`/recipes` deja de ser placeholder: carga SSR de recetas + uso de ingredientes en una sola llamada, métricas (recetas/categorías/ingredientes), tarjetas de insight, rail de recientes, búsqueda accent-insensitive, pills de categoría con `?category=` y back/forward, grid de cards con menú (Editar/Duplicar/Eliminar), dialogs de crear/duplicar/eliminar, estados vacío/sin resultados/error con reintento y límite de plan con CTA de upgrade **sólo** cuando la causa es el plan. Las mutaciones van directo a Hono y actualizan lista y métricas en sitio con reducers puros; crear y duplicar navegan en cliente a `/recipes/{id}?edit=true` (paridad Astro) con la instantánea ya mutada.

Se eliminó toda la maquinaria imperativa del baseline: server island (`server:defer`), `MutationObserver`, `window.__recipesFilterApi`, `window.__recipesPopstateBound`, `innerHTML` para el bloque sin resultados y el listener delegado de `recipe-actions.ts`.

| Elemento       | Valor                                                                                                 |
| -------------- | ----------------------------------------------------------------------------------------------------- |
| Tests web      | **313** (unit 163, nuxt 150) — antes 240                                                              |
| E2E web        | **76/76** (recetas 11) — antes 65                                                                     |
| Checks raíz    | lint 6/6 · type-check 7/7 · test 10/10 (web 313, api 201, stripe 66, auth 31, db 39) · build 7/7      |
| Bundle Nitro   | build **893 kB** (290 kB gzip) · dry-run **969.32 KiB** (232.29 KiB gzip) — antes 837 kB / 901.32 KiB |
| Bundle cliente | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto` ni SDK de Stripe                            |
| QA visual      | 11 capturas 375/1280 × claro/oscuro en `apps/web/test-results/qa/` (gitignored)                       |

## Decisiones aprobadas en la sesión

1. **Duplicar navega a la copia.** POST → `withCreated` sobre la instantánea → `navigateTo("/recipes/{id}?edit=true")` en cliente. Paridad Astro y lista consistente al volver (ver hallazgo 2).
2. **Eliminar se añade al listado.** El menú de la card pasa a Editar/Duplicar/Eliminar con dialog de confirmación y `withRemoved` en sitio + alerta de éxito. **Cambio funcional** (en Astro `canDelete={false}`), registrado como mejora y no como migración.
3. **Sin modal de upgrade.** `PLAN_LIMIT` (anticipado o devuelto por Hono) → alerta con el copy corregido + enlace «Actualizar plan» dentro del dialog de crear. Se retiran el `<dialog id="upgrade-modal">` y los query params `?type=`, `?message=` y `?upgrade=1` (contratos retirados).
4. **Copy con tildes en todo el slice** y se elimina la frase muerta sobre un botón del sidebar que no existe.

**Contrato de query que se conserva:** `?category=` (SSR + cliente + back/forward).

## Hallazgos verificados del baseline

| #   | Hallazgo                                                                                                                                             | Estado                                                                              |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| 1   | El listado sólo permitía crear y duplicar; el `delete_recipe` del POST handler era inalcanzable (`canDelete={false}`)                                | **Documentado** → decisión 2 (se añade Eliminar al listado)                         |
| 2   | `useAsyncData` con key fija **no refetchea** al volver a la página si el estado sigue en `success`, y una navegación solo-query no remonta la página | **Aprovechado**: el reducer corre antes de navegar; el filtro vive en `route.query` |
| 3   | La búsqueda de Astro sólo mira el nombre (NFD); «postres» no encuentra la categoría                                                                  | **Portado tal cual** (cubierto en unit y e2e)                                       |
| 4   | El copy «No hay recetas en esta categoría» era **código muerto** (rama inalcanzable)                                                                 | **No portado**; el estado real es «No se encontraron recetas»                       |
| 5   | SSR de Astro pre-ocultaba las cards que no matcheaban el `?category=` (`display:none`)                                                               | **Reemplazado** por filtrado computado (mismo resultado visible, sin DOM muerto)    |
| 6   | `recipes.length` del listado equivale a `countUserRecipes`, así que el gate de plan no necesita `/api/usage-counts`                                  | **Simplificado**: una petición menos que Astro                                      |
| 7   | `timeAgo` salía del barrel `@recetario/stripe` (arrastra el SDK)                                                                                     | **Arreglado** con el subpath `@recetario/stripe/formatters`                         |

## Pasos ejecutados

1. **Piezas puras sin aliases:** `recipe-form.ts`, `recipe-filters.ts` (búsqueda NFD + categoría + pills + `toggleCategory`), `recipe-messages.ts` (copy del límite con tildes y resolución de errores por código), `recipe-stats.ts` (métricas, `lastUpdatedAt`, `recentRecipes`) y `recipe-state.ts` (instantánea + reducers + `toRecipeSummary`).
2. **`useRecipes()`:** datos SSR (`/api/recipes` + `/api/ingredients/usage` en `Promise.all`), `category` derivada de `route.query.category`, `setCategory` con `navigateTo`, gate `canCreateRecipe`, guard anti doble-submit, overlay y mutaciones `createRecipe`/`duplicateRecipe`/`removeRecipe`.
3. **13 componentes de feature:** skeleton, stats, insights, recientes, menú de acciones, card, grid, toolbar, estado vacío, alerta de error y los tres dialogs (function props para resetear/cerrar sólo en éxito).
4. **Página** `app/pages/recipes/index.vue` reescrita (coordinadora delgada) y placeholder de detalle actualizado a «Task 9».
5. **`@recetario/stripe/formatters`** expuesto sin el SDK (ADR 0006 mantiene los helpers puros en stripe).
6. **Tests:** 5 specs unit, `recipes-ui.spec.ts` (30 casos) y `recipes.spec.ts` (11 e2e) contra el stub ampliado.
7. **Verificación completa, QA visual 375/1280 (claro y oscuro) y limpieza de procesos.**

## Hallazgos de la sesión (infraestructura)

| #   | Hallazgo                                                                                                                                                                                                             | Estado                                                                                                                        |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| 1   | Los componentes de `app/features/**` **no** están auto-registrados (solo `~/components/ui` y `~/components/landing`): `<RecipeErrorAlert>` y `<RecipeGridCard>` resolvían a nada y el `nuxt typecheck` no lo detecta | **Arreglado** con imports explícitos; lo detectaron los tests nuxt. Todo componente de feature debe importarse siempre        |
| 2   | `expect(page.getByText("Postres"))` puede resolver a la card en vez de a la pill                                                                                                                                     | **Arreglado** en los e2e con refs de `snapshot`/locators acotados; en la QA con `scrollIntoView` antes de clickear            |
| 3   | En 375 px el botón «Nueva Receta» cae bajo el bottom nav si el scroll lo deja ahí                                                                                                                                    | **Heredado de Astro** (mismo orden de bloques y mismo `pb-24`): no es regresión; el usuario siempre puede desplazar 96 px más |
| 4   | El `close` del `<dialog>` sigue llegando por fallthrough al kit `Dialog`                                                                                                                                             | **Reutilizado** por los tres dialogs nuevos (sin cambios en el kit)                                                           |

## Desviaciones respecto del plan

| #   | Desviación                                                                                                      | Motivo                                                                                                                            |
| --- | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 1   | El test de error genérico no asserta «cero errores de consola»                                                  | El 500 del stub es intencional y Chromium lo registra como error de recurso (mismo criterio que la Task 7)                        |
| 2   | Los `<dialog>` de este slice no usan la prop `title` del kit: traen su propia cabecera con icono/eyebrow        | Paridad de copy y jerarquía con Astro; el kit solo gana `size`/`scroll`, ya añadidos en la Task 7                                 |
| 3   | `RecipesGrid` muestra «No se encontraron recetas» (Card con `p-8!`) en vez del bloque inyectado por `innerHTML` | Mismo copy y misma clase de card, sin manipulación de DOM                                                                         |
| 4   | Se añade `aria-label="Nueva Receta"` al botón de crear                                                          | En <sm el label visible está `hidden`, así que sin `aria-label` el botón quedaba sin nombre accesible (el e2e lo necesita en 375) |
| 5   | El menú de la card anima opacidad/scale en vez de saltar con `display:none`                                     | El CSS heredado ya declaraba la transición; con `invisible` el panel sigue fuera del árbol de accesibilidad                       |
| 6   | El stub ahora mapea `qa-plan=free                                                                               | basic                                                                                                                             | pro`(antes cualquier valor distinto de`free` caía en Pro) | Hacía falta cubrir Free/Basic/Pro del roadmap; `basic` no se usaba en ningún spec previo |

## Verificación

| #   | Comando                                                               | Resultado                                                             |
| --- | --------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | `pnpm --filter @recetario/web lint`                                   | 0 errores, 0 warnings                                                 |
| 2   | `pnpm --filter @recetario/web type-check`                             | `nuxt typecheck` sin errores                                          |
| 3   | `pnpm --filter @recetario/web test`                                   | 28 archivos, **313 tests verdes** (unit 163, nuxt 150)                |
| 4   | `pnpm --filter @recetario/web test:e2e`                               | **76/76** (recetas 11)                                                |
| 5   | `pnpm --filter @recetario/web build`                                  | 893 kB (290 kB gzip)                                                  |
| 6   | `pnpm --filter @recetario/web wrangler:dry-run`                       | 969.32 KiB (232.29 KiB gzip); bindings `API`, `ASSETS`, `NODE_ENV`    |
| 7   | `env -u WEB_ORIGIN … pnpm lint && type-check && test && build` (raíz) | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7                    |
| 8   | `grep` del bundle cliente                                             | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto`, `@stripe/` |
| 9   | QA visual (agent-browser 0.27.0, dev contra el stub en 8787)          | 11 capturas 375/1280 × claro/oscuro                                   |
| 10  | Puertos y procesos                                                    | 4321 y 8787 libres; sin `nuxt`/`workerd`/`stub-api` vivos             |
| 11  | `git status`                                                          | solo archivos de esta Task (+ los `.commandcode/taste/*` del sistema) |

### Evidencia e2e (`recipes.spec.ts`)

- **SSR:** `3 Recetas`, `2 Categorías`, `1 Ingrediente`, «Recetas por completar», «sin categoría asignada», «Última modificación», «Recientemente actualizadas» y las tres cards; cabeceras `private, no-store` + `x-robots-tag`.
- **Búsqueda:** `clasico` → `Brownie Clásico`; `chocolate` → `Tarta de Chocolate`; `postres` → 0 (sólo busca en el nombre) y «No se encontraron recetas»; limpiar restaura las 3.
- **Categoría:** deep link `/recipes?category=Panes` con SSR ya filtrado y pill activa; click en `Postres` → `?category=Postres`; `Sin categoría` → `?category=`; `goBack` restaura el filtro; «Limpiar filtro» deja las 3.
- **Crear:** marcador de página vivo + URL `/recipes/4?edit=true` (navegación cliente, **sin recarga**); el stub recibió 1 POST con el nombre; al volver, 4 cards y `4 Recetas` (reducer previo + caché de `useAsyncData`).
- **Crear en móvil:** pills con scroll horizontal, dialog dentro del viewport y navegación a la receta nueva.
- **Duplicar (Pro):** menú → dialog → `/recipes/4?edit=true`; el stub tiene «Copia de Tarta de Chocolate»; al volver, 4 cards.
- **Free:** sin `Duplicar` en el menú (Editar y Eliminar siguen).
- **Límite de plan:** free + 10 recetas → alerta «Has alcanzado el límite de 10 recetas de tu plan Free. Actualiza tu plan para crear más.» + enlace y **0 POST** (gate anticipado), sin navegación.
- **Error genérico:** 500 del stub → «Fallo simulado del servidor» visible y sin enlace de upgrade.
- **Eliminar:** fila fuera, `2 Recetas`, alerta de éxito y marcador vivo (**sin recarga**); el stub registró 1 DELETE.
- **Estado vacío:** copy con tildes, dos CTAs y apertura del dialog de crear.

## Paridad responsive / QA visual

Dev server contra el stub del API (`STUB_API_PORT=8787`), `agent-browser` 0.27.0, capturas en `apps/web/test-results/qa/` (gitignored). Sesión con `qa-plan=pro` y tema fijado con la cookie `kitchcalc-theme` (acento esmeralda).

| Condición               | Mobile (375)                                                                                | Desktop (1280)                                                | Evidencia                                             |
| ----------------------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------- |
| carga / SSR             | pills envueltas, insights apiladas, rail de recientes con scroll horizontal, grid 1 columna | pills en fila, insights en 3 columnas, grid 3 columnas        | `375/1280-recipes-populated-*-emerald.png`            |
| toolbar                 | buscador 264 px + botón `+` de 56 px (label oculto en <sm), pills con scroll                | buscador flexible + «Nueva Receta» con label                  | `375-recipes-toolbar-dark-emerald.png`                |
| búsqueda sin resultados | card «No se encontraron recetas»                                                            | idéntico                                                      | `1280-recipes-search-empty-dark-emerald.png`          |
| filtro por categoría    | pill activa + «Limpiar filtro» + 1 card (`?category=Postres`)                               | idéntico                                                      | `1280-recipes-category-filter-dark-emerald.png`       |
| dialog crear            | 343 px de ancho, dentro del viewport (361 px de alto), botones en columna invertida         | 448 px (`max-w-md`), botones en fila                          | `375/1280-recipes-create-dialog-dark-emerald.png`     |
| dialog eliminar         | (mismo kit, `max-w-md`)                                                                     | icono danger + copy heredado + Cancelar/Eliminar              | `1280-recipes-delete-dialog-dark-emerald.png`         |
| límite de plan          | (misma alerta)                                                                              | alerta con tildes + «Actualizar plan», dialog abierto, 0 POST | `1280-recipes-plan-limit-light-emerald.png`           |
| tema claro/oscuro       | tokens semánticos correctos en ambos                                                        | idéntico                                                      | capturas `*-light-emerald.png` / `*-dark-emerald.png` |

Verificado además por `eval`: pills `3 Recetas · 2 Categorías · 1 Ingrediente`, 3 recientes, grid de 1/3 columnas por breakpoint, pills `scrollWidth > clientWidth` en 375, `postAttempts: 0` en el límite, `dialog.open` y cierre del menú (`aria-expanded=false`) tras elegir una acción.

## Riesgos y rollback

| Riesgo                                                 | Estado                                                                                                                  |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Snapshot cacheado no ve cambios del detalle (Task 9)   | Reducers antes de navegar; la Task 9 debe refrescar con `refreshNuxtData("recipes")` (follow-up registrado)             |
| CTA de upgrade en errores genéricos                    | `planLimit` sólo con `PLAN_LIMIT`; e2e cubre ambos caminos                                                              |
| Componentes de feature sin importar (fallo silencioso) | Tests nuxt de cada componente + grid; documentado como trampa para las próximas slices                                  |
| Pill «Ingredientes» desactualizada tras borrar         | El conteo de ingredientes usados es del último load (en Astro lo recalculaba la recarga); cualquier refresco lo corrige |
| Regresión en Tasks 2–7                                 | No se toca sesión, relay, SEO, auth ni ingredientes: sus suites siguen verdes (76/76 e2e)                               |

**Rollback:** `git revert` de los commits de la Task. Sin migraciones, deploy ni estado persistente nuevo. El árbol Astro sigue intacto como referencia.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit                                                               | Contenido                                                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `feat(web): agregar la lógica pura de recetas`                       | `recipe-form`, `recipe-filters`, `recipe-messages`, `recipe-stats`, `recipe-state` |
| `feat(stripe): exponer los formatters sin el SDK`                    | `packages/stripe/package.json` (+`./formatters`)                                   |
| `feat(web): portar los componentes del listado de recetas`           | `useRecipes` + 13 componentes                                                      |
| `feat(web): reemplazar el placeholder de /recipes por el slice real` | `app/pages/recipes/index.vue`, `[recipe].vue`                                      |
| `test(web): cubrir recetas (unit, nuxt y e2e)`                       | 5 specs unit, `recipes-ui.spec.ts`, `recipes.spec.ts`, `stub-api.mjs`              |
| `docs(nuxt): registrar la task 08`                                   | este task file, `AGENTS.md`                                                        |

## Hallazgos abiertos y quién los atiende

Handoff para las sesiones siguientes. **Cómo leer la tabla:** _de paso_ = la sesión dueña ya va a tocar ese archivo para su propio alcance, así que el costo marginal es bajo; _explícito_ = hay que abrir trabajo propio para cerrarlo; _sin dueño_ = trade-off aceptado, no requiere acción.

| #   | Hallazgo                                                                                                                                            | Dónde se manifiesta                                              | Dueño                                                          | Cómo se cierra                                                                                                                                                                                                                       |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1   | Los componentes de `app/features/**` no están auto-registrados: si falta el import, el componente no renderiza y `nuxt typecheck` **no** lo detecta | Cualquier slice nuevo (Tasks 9, 10, 11 y 12)                     | Cada sesión al escribir componentes; guard duro en **Task 13** | **Explícito por sesión** (importar siempre). Guard opcional: `test/nuxt/setup.ts` + `setupFiles` en `vitest.config.ts` que falle ante «Failed to resolve component» (`vue/no-undef-components` ya no existe en eslint-plugin-vue 10) |
| 2   | `useAsyncData` con key fija no refetchea al volver a la página                                                                                      | `useRecipes` (`"recipes"`) y cualquier mutación desde el detalle | **Task 9**                                                     | **Explícito y de paso:** `refreshNuxtData("recipes")` en las mutaciones del detalle. Task 10 hereda el patrón si muta desde ahí; Task 12 sólo lee el listado                                                                         |
| 3   | «1 recetas» en las tarjetas de insight (singular del copy heredado; Astro también lo escribía así)                                                  | `RecipesInsights.vue` (dos ocurrencias)                          | Sesión corta `fix(web)` o **Task 9**                           | **Explícito**, dos líneas de copy + aserción en el spec                                                                                                                                                                              |
| 4   | Lista móvil sin cards propias y solape del botón «Nueva Receta» con el bottom nav en scroll corto                                                   | `RecipesGrid.vue`, `RecipesToolbar.vue` a 375 px                 | **Task 13** o sesión de UX                                     | **Explícito** (rediseño de la lista móvil); el solape es heredado de Astro, no una regresión de la migración                                                                                                                         |
| 5   | A11y del menú de card: Escape no cierra y no hay gestión de foco                                                                                    | `RecipeActionsMenu.vue`                                          | **Task 9**                                                     | **De paso:** esa sesión ya extiende el mismo componente con la variante `page`                                                                                                                                                       |
| 6   | `normalizeSearchText` duplicado entre ingredientes y recetas                                                                                        | `ingredient-search.ts`, `recipe-filters.ts`                      | **Task 12**                                                    | **De paso:** producción es el tercer consumidor; al promoverlo hace falta que `#shared` resuelva en el proyecto `unit` de Vitest (`apps/web/vitest.config.ts`)                                                                       |
| 7   | Piezas reutilizables del slice (menú de acciones, dialog de borrado, alerta de error)                                                               | `RecipeActionsMenu`, `RecipeDeleteDialog`, `RecipeErrorAlert`    | **Task 9**                                                     | **De paso:** el detalle las consume o las amplía en vez de duplicarlas                                                                                                                                                               |
| 8   | Locators e2e: `getByText` resuelve al nodo más profundo y las vistas ocultas cuentan igual                                                          | `test/e2e/recipes.spec.ts` (y el que escriba la Task 9)          | Task 9/10 al escribir e2e                                      | **De paso:** acotar por locator/CSS en vez de por texto global; si vuelve a morder, subir la nota a `AGENTS.md`                                                                                                                      |
| 9   | La pill «N ingredientes» queda del último load después de eliminar (no se recalcula sin refetch)                                                    | `RecipesStats.vue` / `useRecipes()`                              | Sin dueño                                                      | **Aceptado:** el listado muta en sitio sin recargar; cualquier refresco o navegación lo corrige. Se revisa si Task 12 lo necesita exacto                                                                                             |
| 10  | El stub ya soporta `qa-plan` con valor `free`, `basic` o `pro` y los límites y features reales de `plans-config.ts`                                 | `test/e2e/support/stub-api.mjs`                                  | **Tasks 11 y 12**                                              | **De paso:** sus matrices de plan (billing y producción) no necesitan tocar el stub                                                                                                                                                  |

`graphify` no se usó (la preferencia vigente lo prohíbe); la Task 13 decide si sigue omitiéndose.
