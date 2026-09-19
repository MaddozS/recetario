# Task 12 — Planificador de producción (`/produccion`)

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 12)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-12-production.md`

- **Scope:** `extends-existing`
- **Pre-existing:** placeholder de `/produccion` (Task 2); shell privado con la sección «Producción» condicionada a `production_planner` (Tasks 4/5); `useApi`/`useAuth`/middleware `auth` y SEO `noindex` (Tasks 4/5); `GET /api/recipes` y `GET /api/recipes/by-ids` (Tasks 3/9); `FinancialSummary` con `rows` (Task 10); `production-calculator.ts` y `production-types.ts` del árbol Astro como referencia; stub e infraestructura de tests (Tasks 8–11).
- **Dependencies:** Tasks 8 y 9 (completadas, HEAD base `6547c89`).
- **Parallel-safe:** sí con Task 11, pero esta sesión implementó **solo** Task 12.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`, HEAD base `6547c89`, árbol limpio (solo `.commandcode/taste/*`).

## Resultado

`/produccion` deja de ser un placeholder: selector con búsqueda accent-insensitive (las seleccionadas nunca se ocultan), agrupado por categoría, «Seleccionar todas» con indeterminado, stepper de mezclas, elección de presentación, tope de Basic con banner y CTA, resultados en sitio (insumos consolidados, resumen financiero, desglose por receta con «Seleccionada»/«Más rentable», hoja imprimible) y deep links/back-forward resolubles por URL.

Se eliminó del camino portado: el JSON en `<script type="application/json">`, los `<template>` + `cloneNode`, todo el `innerHTML`, el `MutationObserver` que esperaba el island `server:defer`, la delegación de `change` en `document`, `dataset.calcBound`, el `debounce` de 60 ms y el `history.replaceState` manual. La única propiedad imperativa que queda es `input.indeterminate` (estado del DOM, no de la app).

Además se cierra el pendiente que la Task 3 asignó explícitamente a esta sesión: **`production_planner` y el tope de 3 recetas de Basic dejan de ser UI-only** y pasan a ser autoridad de Hono en `GET /api/recipes/by-ids`.

| Elemento       | Valor                                                                                                            |
| -------------- | ---------------------------------------------------------------------------------------------------------------- |
| Tests web      | **639** (unit 367, nuxt 272) — antes 547 (unit 311, nuxt 236)                                                     |
| E2E web        | **127/127** (production 7 nuevos) — antes 120                                                                     |
| Tests API      | **216** (by-ids +4 del gate) — antes 212                                                                          |
| Checks paquete | `@recetario/stripe` build OK · `@recetario/api` 216 verdes (entorno limpio, `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL`) |
| Bundle Nitro   | build **1.23 MB** (389 kB gzip) · dry-run **1212.10 KiB** (282.39 KiB gzip) — antes 1.16 MB / 1160.42 KiB        |
| Bundle cliente | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto` ni `plans-config`                                      |
| QA visual      | 8 artefactos 375/1280 + PDF de impresión en `apps/web/test-results/qa/` (gitignored)                              |

## Decisiones aprobadas en la sesión

1. **Hono endurece `by-ids`** (respuesta del usuario): exige la feature `production_planner` (403 `FEATURE_REQUIRED`) y, sin Pro, rechaza más de 3 ids (403 `PLAN_LIMIT`). La UI anticipa el error con `hasFeature`/`isPro` y clampa la selección; el gate cubre el bypass por llamada directa que la Task 3 dejó abierto.
2. **Carga de datos sólo de la selección** (respuesta del usuario): el SSR trae el catálogo (`GET /api/recipes`) y el detalle **sólo** de los ids de la query; al seleccionar una receta nueva su detalle se pide por lotes (máx. 100 ids por request) y se cachea en memoria. Corrige el bug del baseline: con >100 recetas, el `by-ids` de todas ellas devolvía 400.
3. **La query es la fuente de verdad** de la selección (`?recipes=`, `?batches=`, `?presentations=`), escrita con `replace` (paridad con `history.replaceState`: sin spam de historial). El *stage* (`select`/`results`) es estado local inicializado desde la query, así el deep link abre en resultados y el SSR hidrata sin diferencias.
4. **Se retira el contrato `?upgrade`** de `/produccion`: no tiene productor en el repo (rama muerta del baseline). Igual que Tasks 8/11 con `?type=`/`?message=`.
5. **`FinancialSummary` se reutiliza** con un `title` opcional y aditivo (default = comportamiento actual), en lugar de duplicar una cuarta vez el markup del resumen.
6. **Paridad de fórmula**: el planner sigue usando `fixedCostsPercentage` e ignorando `recipeFixedCosts` (baseline). Se registra como hallazgo con dueño de producto; no se cambia en esta sesión.

## Contratos nuevos y normalizaciones

| Contrato                          | Definición                                                                                                                       |
| --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `?recipes=1,2,3`                  | ids deduplicados, filtrados contra el catálogo, ordenados por catálogo y recortados al tope del plan.                              |
| `?batches=2,1,0.5`                | un valor por slot; `finito > 0` o `1`; el stepper trabaja en pasos de 0.5 con mínimo 0.5.                                          |
| `?presentations=0,7`              | sólo si algún slot eligió presentación; `0` = sin elección. **Corrige** el desalineado del baseline (al filtrar indefinidos, el id 7 se asignaba al primer slot). |
| `GET /api/recipes/by-ids`         | Validación (400) → gate de plan (403) → consulta, con `MAX_IDS = 100` por request (el cliente trocea).                             |
| `PRODUCTION_BASIC_RECIPE_LIMIT`   | Fuente única en `packages/stripe/src/plans-config.ts`, expuesta por el subpath puro `@recetario/stripe/plans-config`; la UI y Hono la comparten. |

## Hallazgos del baseline que se corrigen

| #   | Baseline                                                                                          | Task 12                                                                                   |
| --- | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| 1   | `by-ids` de **todas** las recetas en el SSR: con >100 recetas Hono responde 400 y el plan muere    | Detalle sólo de la selección, troceado en lotes de 100 (y el gate corta antes si no hay plan) |
| 2   | `presentations` posición-desalineado (`filter(id !== undefined)`)                                  | `0` como marcador de slot, alineado con `recipes`                                          |
| 3   | Los ids del catálogo se cruzaban por **posición** (`recipes[i]`)                                   | Cruce por `id` (`Map`), sin fragilidad ante reordenamientos                                |
| 4   | Con Basic y 4 ids en la URL, la UI mostraba 4 marcadas y calculaba 3                               | La selección se recorta al tope en un único lugar (`resolveSelections`) y el banner refleja el estado |
| 5   | Un id ajeno/borrado consumía un slot del tope de Basic                                             | Se filtra contra el catálogo antes de recortar                                             |
| 6   | Enlaces con `#production-root`, `data-stage` en DOM y recarga de plantillas                        | Componentes declarativos; el *stage* es estado y los resultados un `computed`               |
| 7   | `?upgrade` sin productor (rama muerta)                                                             | Retirado y registrado                                                                      |
| 8   | La búsqueda reevaluaba el DOM en cada `change` (listener en `document`)                            | `computed` sobre el catálogo; las seleccionadas se mantienen visibles por modelo            |

## Pasos ejecutados

1. **Paquete/API:** `PRODUCTION_BASIC_RECIPE_LIMIT` + subpath `./plans-config`; `requireProductionAccess` en `entitlements.ts`; gate en `recipes/by-ids.ts` tras la validación; 4 casos nuevos en `by-ids.test.ts` (mock de `../entitlements`).
2. **Lógica pura (`app/features/production/`):** `production-types.ts`, `production-calculator.ts` (puerto + `presentationMargin`/`bestPresentationId`), `production-selection.ts` (parseo/serialización + tope + mutaciones), `production-catalog.ts` (agrupado + búsqueda), `production-format.ts` (formatos y etiquetas).
3. **Composable:** `useProductionPlanner` (SSR catálogo + detalle de la selección, detalle bajo demanda con `attemptedIds`, resultados `computed`, escrituras de query con `replace`, stage y búsqueda).
4. **Componentes:** `ProductionSelectorCard`, `ProductionRecipeRow`, `ProductionResults`, `ProductionIngredientsSheet`, `ProductionRecipeBreakdown`, `ProductionSkeleton` y el `printer` del registro de íconos.
5. **Página:** `app/pages/produccion.vue` real (gate → skeleton → error → selector/resultados) con `useHead` de título; el `robots` lo aporta el layout privado.
6. **Tests:** 4 specs unit (56), 2 specs nuxt (35) + un caso de `title` en `FinancialSummary`, `production.spec.ts` (7 e2e) y `GET /api/recipes/by-ids` + `byIdsAttempts` en el stub.
7. **Verificación completa, QA visual (8 artefactos) y limpieza de procesos.**

## Desviaciones respecto del plan

| #   | Desviación                                                                                        | Motivo                                                                                                     |
| --- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| 1   | «Calcular producción» se deshabilita sin selección                                                | El baseline era un no-op silencioso; deshabilitar comunica el estado real                                   |
| 2   | El área de resultados muestra skeletons mientras llega el detalle de una receta recién marcada    | Con carga bajo demanda hay una ventana de red que el baseline no tenía (todo venía precargado)              |
| 3   | Fallo al traer el detalle: alerta con «Reintentar» en vez de excluir la receta en silencio        | El baseline no tenía ese camino; ocultar el fallo dejaría cifras incompletas sin avisar                     |
| 4   | El pie de resultados no se renderiza si no hay ninguna receta calculable                           | Paridad con el `replaceChildren()` vacío del baseline (tampoco había botón de imprimir)                     |
| 5   | `FinancialSummary` gana `title?` (aditivo)                                                         | Evita duplicar el resumen una cuarta vez; default idéntico al comportamiento anterior (test añadido)        |
| 6   | El stub replica el gate del API (`qa-plan`) además del contrato de datos                            | Sin él, los e2e de Free/Basic no podrían cubrir el 403 que ahora exige Hono                                 |
| 7   | Migas «Planificador de Producción» se mantienen tal cual                                           | Paridad; el hallazgo de migas «Receta» es de otro slice (Tasks 9/10/11)                                     |

## Verificación

| #   | Comando                                                                        | Resultado                                                                    |
| --- | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 1   | `pnpm --filter @recetario/stripe build`                                        | `tsc --noEmit` sin errores                                                    |
| 2   | `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test` | 37 archivos, **216 verdes** (by-ids 11, +4)                       |
| 3   | `pnpm --filter @recetario/web lint`                                            | 0 errores, 0 warnings                                                         |
| 4   | `pnpm --filter @recetario/web type-check`                                      | `nuxt typecheck` sin errores                                                  |
| 5   | `pnpm --filter @recetario/web test`                                            | 49 archivos, **639 verdes** (unit 367, nuxt 272)                              |
| 6   | `pnpm --filter @recetario/web test:e2e`                                        | **127/127** (production 7)                                                    |
| 7   | `pnpm --filter @recetario/web build`                                           | 1.23 MB (389 kB gzip)                                                         |
| 8   | `pnpm --filter @recetario/web wrangler:dry-run`                                | 1212.10 KiB (282.39 KiB gzip); bindings `API`, `ASSETS`, `NODE_ENV`           |
| 9   | `grep` del bundle cliente (`apps/web/.output/public/_nuxt/`)                   | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto` ni `plans-config`    |
| 10  | `pnpm --filter @recetario/web exec prettier --write <paths>`                   | Formato aplicado; el churn sobre líneas preexistentes se revirtió a mano       |
| 11  | QA visual (agent-browser 0.27.0, dev contra el stub en 8787)                   | 8 artefactos: select/results/gate en 375 y 1280 + PDF de la hoja               |
| 12  | Puertos y procesos                                                             | 4321, 8787 y 8788 libres; `agent-browser close`; sin `nuxt`/`stub-api` vivos    |
| 13  | `git status`                                                                   | solo archivos de esta Task (+ `.commandcode/taste/*`, gestionado por el sistema) |

### Evidencia e2e (`production.spec.ts`)

- **Free:** `UpgradePrompt` con la descripción del planificador y CTA a `/pricing?plan=basic`; el catálogo ni se pide y `byIdsAttempts === 0`; SSR con `cache-control: private, no-store` y `x-robots-tag: noindex, nofollow`.
- **Basic:** deep link con 4 ids → resultados SSR de 3 recetas («3 recetas · 4 mezclas», insumos **$62.50**) y, al editar, contador 3/4, banner «Límite de 3 recetas alcanzado en plan Basic.» con CTA a Pro y la cuarta receta deshabilitada.
- **Pro:** selección + stepper (1 → 1.5 → 2) + cambio manual (1.5) + presentación explícita (Entera) → `?recipes=1,2&batches=2,1.5&presentations=10,0`, marcador de hidratación vivo (sin recarga), resultados «2 recetas · 3.5 mezclas», insumos **$68.75**, ingresos **$192.00** y, al abrir el desglose, «Entera» como *Seleccionada* y «Porción» como *Más rentable*.
- **Back/forward:** deep link a resultados, salida a `/recipes` y `goBack()` restauran el plan desde la URL sin recargar.
- **Búsqueda:** «cafe» encuentra «Flan de Café»; «sushi» muestra el vacío; con la Tarta seleccionada, «pan» deja 2 filas (la seleccionada sigue visible) y oculta el mensaje de vacío.
- **Impresión:** el botón llama a `window.print()` (1) y con `emulateMedia('print')` se ocultan `.no-print` y los botones mientras la hoja de insumos sigue visible.
- **Móvil:** las etiquetas de celda (`md:hidden`) son visibles a 375 y se ocultan a 1280, con la misma información que la cabecera de escritorio.

## Paridad responsive / QA visual

Dev server contra el stub del API (`STUB_API_PORT=8787`), `agent-browser` 0.27.0, capturas en `apps/web/test-results/qa/` (gitignored).

| Condición                     | Mobile (375)                                                                 | Desktop (1280)                                                    | Evidencia                                     |
| ----------------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------------------------- | --------------------------------------------- |
| select con recetas            | filas apiladas; controles a ancho completo (stepper + select de presentación) | fila en una línea con controles a la derecha                      | `pro-desktop-select.png`, `basic-mobile-limit.png` |
| Basic en el tope              | banner + contador 3/4 + filas no seleccionadas atenuadas                      | idéntico                                                          | `basic-desktop-limit.png`, `basic-mobile-limit.png` |
| results                       | hojas apiladas con etiqueta por celda (`md:hidden`)                           | tablas en grid de 5/6 columnas, sin etiquetas de celda            | `basic-desktop-results.png`, `mobile-results.png` |
| desglose por receta           | `<details>` colapsado por defecto (paridad)                                   | idem + tabla de presentaciones con badges                         | `desktop-breakdown.png`                        |
| impresión                     | —                                                                             | sin nav/botones; hojas completas y resumen en página nueva        | `hoja-produccion.pdf`                          |
| Free / sin feature            | `UpgradePrompt` centrado con CTA a Basic                                      | idéntico                                                          | `free-mobile-gate.png`                         |

Móvil no omite información: cambia la composición (etiqueta por celda, controles apilados), no el contenido (insumos, costos, presentaciones, márgenes y conteos están en ambos breakpoints).

## Riesgos y rollback

| Riesgo                                                                 | Estado                                                                                                        |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| El gate nuevo rompe consumidores de `by-ids`                            | Sólo lo consume el planner (verificado por grep); el árbol Astro no se despliega desde esta rama               |
| Loop de navegación al escribir la query                                 | Escrituras sólo en acciones de usuario, un `navigateTo` por transición; spec nuxt del composable lo fija        |
| Hidratación por datos derivados del catálogo                            | `await` del `useAsyncData` en el composable (patrón Task 9) y stage inicial derivado de la query en SSR y cliente |
| Detalle de una receta borrada en carrera                                | `attemptedIds` distingue «no pedido» de «pedido y ausente»; el estado pendiente no se queda colgado             |
| Impresión recortada por el `overflow-y-auto` del shell                  | Verificado con PDF real; no hizo falta tocar `global.css`                                                       |
| Regresión en Tasks 8–11 (listados, detalle, settings)                   | Suites completas verdes (639 web, 127 e2e, 216 API); el stub sólo se amplió                                     |
| El stub es un único proceso para toda la suite                          | `__qa/recipes/reset` con fixture propio por test; la suite completa pasa                                        |

**Rollback:** `git revert` de los commits de la Task. Sin migraciones ni datos persistidos: es frontend + un gate de lectura. Desactivar la Task = restaurar `by-ids.ts`/`entitlements.ts` y volver al placeholder de `produccion.vue` (en el historial); el árbol Astro queda intacto.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit                                                            | Contenido                                                                                        |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `feat(api): exigir el plan del planificador en by-ids`             | `packages/stripe` (constante + subpath), `entitlements.ts`, `by-ids.ts` y sus tests               |
| `feat(web): portar el planificador de producción`                  | `app/features/production/**`, `produccion.vue`, `icon-registry.ts` y el `title` de `FinancialSummary` |
| `test(web): cubrir el planificador (unit, nuxt y e2e)`             | 4 specs unit, 2 nuxt, `production.spec.ts` y `by-ids` del stub                                     |
| `docs(nuxt): registrar la task 12`                                 | Este task file                                                                                    |

## Hallazgos abiertos y quién los atiende

| #   | Hallazgo                                                                                          | Dónde se manifiesta                          | Dueño            | Cómo se cierra                                                                    |
| --- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---------------- | --------------------------------------------------------------------------------- |
| 1   | El planner ignora `recipeFixedCosts` y usa el `%` de gastos operativos (paridad): el mismo insumo cuesta distinto en el detalle y en el planificador | `production-calculator.ts`                   | Producto         | **Explícito**: decidir si el planner suma los costos fijos explícitos con `advanced_costs` |
| 2   | `roundHalfUp`/`aplicarRedondeoUnidadPequena` están duplicados                                      | `recipe-financials.ts` / `production-calculator.ts` | Sesión futura | **Explícito**: consolidar en `#shared/utils/` cuando haya un tercer consumidor     |
| 3   | `apps/api/README.md` documenta una caché de `by-ids` que no existe                                 | `apps/api/README.md`                         | Task 13          | **Explícito**: corregir el README o marcarlo como histórico junto con la limpieza  |
| 4   | «No gracias» del `UpgradePrompt` no hace nada (paridad)                                            | `UpgradePrompt.vue`                          | Producto         | **Explícito**: decidir CTA de vuelta (p. ej. a `/recipes`)                          |
| 5   | El `<select>` de presentación muestra la primera opción mientras los resultados destacan la «mejor» automática | `ProductionRecipeRow.vue` / calculador       | Producto/Task 13 | **Explícito**: mostrar la elegida automáticamente o una opción «Automática»         |
| 6   | La copia de `PRODUCTION_BASIC_RECIPE_LIMIT` en `apps/web/src/lib/constants.ts` (Astro) queda muerta | árbol Astro                                  | Task 13          | **De paso**: desaparece con la retirada de Astro                                    |
| 7   | Migas de pan con «Receta» en vez del nombre                                                        | `layouts/private.vue`                        | Task 13 / shell  | **Explícito** (hallazgo de Tasks 9/10/11)                                           |
| 8   | `pnpm format` de la raíz roto y componentes de `app/features/**` sin auto-registro                  | `package.json` (raíz) / cualquier slice      | Task 13          | **Explícito** / **de paso**: ya documentado en Tasks 11/12                          |

`graphify` no se usó (la preferencia vigente lo prohíbe); la Task 13 decide si sigue omitiéndose.
