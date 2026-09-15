# Task 7 — Slice vertical de ingredientes

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 7)
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-07-ingredients.md`

- **Scope:** `extends-existing`
- **Pre-existing:** endpoints/schemas de ingredientes y `usage` en Hono, `requireIngredientCapacity` (`PLAN_LIMIT`), bloqueo de delete referenciado (`ingredient_in_use`) en `packages/db`, shell Nuxt de Tasks 2–4 (`useApi`, `useAuth`, layout privado, kit `Input`/`Button`/`Dialog`/`Card`/`FeedbackAlert`/`EmptyState`/`UnitCostDisplay`/`Icon`), infraestructura de tests de Tasks 2–6 (Vitest `unit`/`nuxt`, Playwright + stub del API).
- **Dependencies:** Tasks 3 y 4 (completadas). Tasks 5 y 6 completadas en el HEAD base. Esta sesión implementó **solo** Task 7.
- **Parallel-safe:** sí con Task 8, no concurrente en esta sesión.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`, HEAD base `1bcd3ef`, árbol limpio (solo `.commandcode/taste/*` que mantiene el sistema de taste).

## Resultado

`/ingredients` deja de ser placeholder: carga SSR de lista + uso + contadores en una sola llamada, búsqueda accent/case-insensitive, tabla de 6 columnas, formulario de creación en card (escritorio) y dialog (móvil), edición, borrado con conflicto `ingredient_in_use`, costo unitario en vivo, estados vacío/sin resultados/error de carga y límite de plan con CTA de upgrade sólo cuando la causa es el plan. Las mutaciones van directo a Hono y actualizan lista y contadores en sitio **sin recarga** (reducers puros), con pending contextual (overlay + botón) y éxito visible.

| Elemento       | Valor                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Tests web      | **240** (unit 120, nuxt 120) — antes 175                                                                                           |
| E2E web        | **65/65** (ingredientes 10)                                                                                                        |
| Checks raíz    | lint 6/6 · type-check 7/7 · test 10/10 (web 240, api 201, stripe 66, auth 31, db 39) · build 7/7                                   |
| Bundle Nitro   | dry-run **901.32 KiB** (218.56 KiB gzip); build 837 kB (274 kB gzip)                                                               |
| Bundle cliente | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto` ni SDK de Stripe (único match de `stripe`: el campo Zod `stripePriceId`) |
| QA visual      | 8 capturas 375/1280 × claro/oscuro en `apps/web/test-results/qa/` (gitignored)                                                     |

## Decisiones aprobadas en la sesión

1. **Límite de plan con CTA.** `PLAN_LIMIT` (anticipado con `canCreateIngredient` o devuelto por Hono) muestra la alerta con el copy heredado **más** el enlace “Actualizar plan” → `/pricing` (patrón `showUpgradeLink` de `RecipesContent.astro`). Los errores genéricos **nunca** ofrecen upgrade; el e2e cubre ambos lados.
2. **Errores de mutación dentro del dialog que falla** (conserva lo escrito y el contexto); el card de crear de escritorio muestra su alerta en la misma card. El **éxito** siempre es alerta de página, visible al cerrarse el dialog. Astro recargaba la página y volvía con `?type|message|recipes`; sin recarga, la ubicación se adapta (decisión 2 del plan).
3. **Lista móvil con paridad estricta:** misma tabla de 6 columnas con `overflow-x-auto`. Las cards móviles quedan como follow-up, no se bundlean en la migración.
4. **Sin recargas ni query params de feedback:** mutaciones directas a Hono + reducers puros (`withCreated`/`withUpdated`/`withRemoved`) sobre la instantánea SSR.
5. **Una instantánea SSR** (`useAsyncData("ingredients")` con `Promise.all` de lista + usage + contadores), mutada en sitio; el skeleton sólo aparece en refresco/reintento.
6. **`Dialog` extendido de forma aditiva:** `size?: "md" | "lg" | "xl"` y `scroll?: boolean` (defaults = comportamiento anterior) porque los modales de ingredientes son más anchos y altos que `max-w-md`.
7. **Búsqueda 100% cliente** (el API no tiene query param): normaliza query y texto de fila en NFD.

## Pasos ejecutados

1. **Piezas puras sin aliases** (unit-testeables): `ingredient-units.ts` (`UNIT_OPTIONS`/`DEFAULT_UNIT`), `ingredient-form.ts` (`parseIngredientNumber`, validez, mensajes de validación, `formatUnitCost`, `toIngredientInput`, `ingredientFormFrom`), `ingredient-search.ts` (NFD), `ingredient-messages.ts` (`ingredientLimitMessage`, `resolveIngredientMutationError`, `isIngredientInUse`) y `ingredient-state.ts` (`IngredientsSnapshot` + reducers).
2. **`useIngredients()`**: datos SSR (`/api/ingredients`, `/api/ingredients/usage`, `/api/usage-counts`), búsqueda, gate de plan (`@recetario/stripe/subscription`), mutaciones con guard anti doble-submit y overlay (`loading-overlay`), fallback `GET /api/ingredients/:id/usage` cuando el mapa local no trae recetas.
3. **Componentes de feature:** `IngredientFormFields` (multi-root: variante `create` en fragmento para los grids del padre, variante `edit` con el nombre `md:col-span-2`), `IngredientCostPreview`, `IngredientCreateCard`, `IngredientsListCard`, `IngredientsSkeleton`, `IngredientErrorAlert` y los dialogs `IngredientCreateDialog`/`IngredientEditDialog`/`IngredientDeleteDialog` (function props para resetear/cerrar sólo en éxito).
4. **`Dialog` del kit** con `size`/`scroll` aditivos + casos nuevos en `ui-components.spec.ts`.
5. **Página** `app/pages/ingredients.vue` reescrita (se elimina el `SectionHeading`/`Badge` placeholder: el nombre de la página lo aportan las migas, igual que en Astro).
6. **Tests:** unit de los módulos puros, nuxt de los componentes (emits, prefill, conflicto, pending, gate de plan) y e2e del slice completo contra el stub; se registró el ícono `refresh-cw` para el botón “Reintentar”.
7. **Verificación completa, QA visual 375/1280 (claro y oscuro) y limpieza de procesos.**

## Hallazgos (infraestructura de tests)

| #   | Hallazgo                                                                                                                                                                                                             | Estado                                                                                                                                  |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Con `mountSuspended`, `wrapper.emitted()`/`findComponent(Component).emitted()` están vacíos: el wrapper es el del `Suspense`, no el del componente montado.                                                          | **Documentado**: los eventos se assertan con listeners espía pasados en `attrs` (`"onUpdate:open"`, `onEdit`, …). Útil para Tasks 8–12. |
| 2   | Playwright resuelve `getByText` al elemento más profundo, pero las vistas ocultas de los dialogs cuentan: “Costo unitario calculado:” resolvía a 3 elementos (card + 2 dialogs cerrados) → violación de strict mode. | **Arreglado** en el e2e acotando el locator al formulario (`form:has(#desktop-name)`) en vez de `page`.                                 |
| 3   | `noUncheckedIndexedAccess` está activo: `array[i]` en specs es `T \| undefined`.                                                                                                                                     | **Arreglado** con constantes nombradas y accesos guardados.                                                                             |

## Desviaciones respecto del plan

| #   | Desviación                                                                                                                       | Motivo                                                                                                                                                                                                |
| --- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `UNIT_OPTIONS`/`DEFAULT_UNIT` viven en `app/features/ingredients/ingredient-units.ts`, no en `shared/utils/units.ts`             | El proyecto `unit` de Vitest no resuelve el alias `#shared`; un módulo compartido importado por las piezas puras rompería `test/unit`. Se promueve a `shared/` cuando recetas/producción lo necesiten |
| 2   | `IngredientRecord = z.infer<typeof ingredientSchema>` en vez del tipo `Ingredient` de `@recetario/types`                         | El schema permite `brand`/`supplier` nulos y el tipo a mano no; derivar del schema evita duplicar el contrato y el cast en el borde                                                                   |
| 3   | La variante `edit` de `IngredientFormFields` no envuelve en grid: marca el nombre con `md:col-span-2` y el dialog aporta el grid | Mismo resultado visual con menos markup; el componente sigue siendo multi-root                                                                                                                        |
| 4   | `required` se pasa también en la variante `edit` (Astro sólo mostraba el asterisco)                                              | El submit ya está deshabilitado hasta que el formulario es válido: el atributo nativo nunca se dispara e iguala el asterisco rojo                                                                     |
| 5   | El conflicto de borrado se resuelve del mapa `usage` local, con `GET /:id/usage` sólo si viniera vacío                           | Astro re-consultaba siempre porque el 409 descarta `recipes` al parsear el envelope; el dato ya está en la instantánea                                                                                |
| 6   | Se añadió `refresh-cw` al registro de íconos                                                                                     | Botón “Reintentar” del error de carga (mejora de soft-fail, no existía en Astro)                                                                                                                      |
| 7   | El título de la página es `Ingredientes \| KitchCalc` (Astro: `KitchCalc - Inventario`)                                          | Convención de títulos de Tasks 5/6                                                                                                                                                                    |
| 8   | Copy del límite con tildes (Astro conserva “limite”/“mas”)                                                                       | Deuda detectada y **corregida tras la sesión** (ver “Detalles atendidos”); recetas debe usar el mismo texto                                                                                           |

## Verificación

| #   | Comando                                                               | Resultado                                                                                              |
| --- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| 1   | `pnpm --filter @recetario/db generate`                                | Prisma 7.8.0 → `prisma/generated` (+`generated-node`)                                                  |
| 2   | `pnpm --filter @recetario/web lint`                                   | 0 errores, 0 warnings                                                                                  |
| 3   | `pnpm --filter @recetario/web type-check`                             | `nuxt typecheck` sin errores                                                                           |
| 4   | `pnpm --filter @recetario/web test`                                   | 22 archivos, **240 tests verdes** (unit 120, nuxt 120)                                                 |
| 5   | `pnpm --filter @recetario/web test:e2e`                               | **65/65** (ingredientes 10)                                                                            |
| 6   | `pnpm --filter @recetario/web build`                                  | 837 kB (274 kB gzip)                                                                                   |
| 7   | `pnpm --filter @recetario/web wrangler:dry-run`                       | 901.32 KiB (218.56 KiB gzip); bindings `API`, `ASSETS`, `NODE_ENV`                                     |
| 8   | `env -u WEB_ORIGIN … pnpm lint && type-check && test && build` (raíz) | lint 6/6 · type-check 7/7 · test 10/10 · build 7/7                                                     |
| 9   | `grep` del bundle cliente                                             | sin `better-auth`, Prisma, `@recetario/db`, `node:crypto`, `@stripe/`                                  |
| 10  | QA visual (agent-browser 0.27.0, dev contra el stub en 8787)          | 8 capturas 375/1280 × claro/oscuro                                                                     |
| 11  | Puertos y procesos                                                    | 4321 y 8787 libres; sin `nuxt`/`workerd`/`stub-api` vivos; `.dev.vars` con el mismo hash que al inicio |
| 12  | `git status`                                                          | solo archivos de esta Task (+ los `.commandcode/taste/*` que el sistema de taste mantiene)             |

### Evidencia e2e (`ingredients.spec.ts`)

- **SSR:** `(2)` ingredientes, `Harina de trigo`, `Plátano`, `$25.00`, `$9.00 / kg`, `Sin proveedor`, `Costo x Unidad`; cabeceras `private, no-store` + `x-robots-tag`.
- **Búsqueda:** `platano` → `Plátano`; `casa santos` → `Harina de trigo`; `queso` → bloque “No encontramos resultados” con la pista; limpiar restaura las filas.
- **Crear (escritorio):** `12,5` + cantidad `2` → preview `$6.25`, submit habilitado, éxito visible, 3 filas, contador `(3)`, formulario reseteado, marcador de página vivo y URL intacta (**sin recarga**), y el stub recibió `price: 12.5`.
- **Crear (móvil):** botón `lg:hidden` → dialog → submit → dialog cerrado + fila nueva.
- **Editar:** dialog precargado (nombre/proveedor/precio) → guardar → fila y costo unitario actualizados en sitio + éxito.
- **Eliminar:** confirmación con el nombre → fila fuera y contador `(1)`.
- **Borrado bloqueado:** 409 `ingredient_in_use` → alerta + “Recetas que lo usan: Tarta de Chocolate”, dialog abierto, fila intacta y **sin** enlace de upgrade.
- **Límite de plan:** `qa-plan=free` + 30 ingredientes → alerta con el copy heredado + enlace “Actualizar plan” (`/pricing`) y **0 POST** en el stub (gate anticipado).
- **Error genérico:** 500 del stub → mensaje del API visible y sin enlace de upgrade.
- **Validación:** submit deshabilitado con nombre/precio/cantidad inválidos (incluye precio `0` válido y cantidad `0` inválida) y cero errores de consola en las páginas ejercitadas.

## Paridad responsive / QA visual

Dev server contra el stub del API (`STUB_API_PORT=8787`), `agent-browser` 0.27.0, capturas en `apps/web/test-results/qa/` (gitignored). El tema se fijó con la cookie `kitchcalc-theme` (la sesión del stub trae `dark` + acento esmeralda).

| Condición               | Mobile (375)                                                                                                                     | Desktop (1280)                                           | Evidencia                                                                   |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------- |
| carga / SSR             | botón “Agregar Insumo” + tabla con scroll horizontal (card de crear oculta: `display: none`)                                     | card “Agregar Insumo” (grid 1/2/5 cols) + tabla completa | `375-ingredients-list-dark-emerald.png`, `1280-ingredients-populated-*.png` |
| con datos               | mismas 6 columnas y celdas (nombre + marca, proveedor/`Sin proveedor`, `$precio`, contenido+unidad, `$costo / unidad`, acciones) | idéntico                                                 | ambas capturas de lista                                                     |
| búsqueda sin resultados | bloque “No encontramos resultados” + pista                                                                                       | idéntico                                                 | `1280-ingredients-search-empty-dark-emerald.png`                            |
| dialog crear            | stack vertical + preview + scroll interno (343 px de ancho, 5 campos, 9 unidades)                                                | no aplica (form en el card)                              | `375-ingredients-create-dialog-dark-emerald.png`                            |
| dialog editar           | `max-w-xl` (576 px) con scroll interno, nombre a 2 columnas                                                                      | idéntico                                                 | `1280-ingredients-edit-dialog-dark-emerald.png`                             |
| borrado bloqueado       | alerta + recetas dentro del dialog                                                                                               | idéntico                                                 | `1280-ingredients-delete-blocked-dark-emerald.png`                          |
| límite de plan          | alerta + “Actualizar plan” (sin POST)                                                                                            | idéntico                                                 | `1280-ingredients-plan-limit-light-emerald.png`                             |
| tema claro/oscuro       | tokens semánticos correctos en ambos                                                                                             | idéntico                                                 | capturas `*-light-emerald.png` / `*-dark-emerald.png`                       |

Verificado además por `eval`: contador `(N)` actualizado tras crear/eliminar, `postAttempts: 0` en el límite, `dialogFits` en móvil, `tableScrolls` en 375 y `theme`/`dark`/`accent` tras cambiar la cookie. El estado **pending** (overlay “Agregando insumo…” + botón con spinner) no se capturó por ser instantáneo contra el stub local: queda cubierto por los tests nuxt (`aria-busy`, texto “Agregando…”) y por el e2e (submit deshabilitado + éxito).

## Detalles atendidos tras la sesión

| #   | Detalle                                                                                                       | Decisión y resultado                                                                                                                                                                                                 |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | El pill de “Costo x Unidad” partía los datos en dos líneas en la tabla de 1280 (`$25.00 /` + `kg`, 104×58 px) | **Arreglado**: `whitespace-nowrap` en el pill → 118×38 px, una sola línea. Medido antes/después: la tabla no gana scroll (979 px en ambos casos)                                                                     |
| 2   | El encabezado “Costo x Unidad” también envuelve a dos líneas                                                  | **No se toca**: `nowrap` en los encabezados lleva la tabla a 1020 px contra 979 disponibles (aparece scroll horizontal de 41 px). Es un rótulo, no un dato, y es el comportamiento heredado                          |
| 3   | Copy del límite sin tildes (“limite”, “mas”)                                                                  | **Arreglado**: `ingredientLimitMessage()` usa “límite”/“más” y los tres specs (unit, nuxt y e2e) lo verifican. Recetas debe portar este mismo texto en Task 8 (el árbol Astro lo conserva sin tildes hasta el corte) |
| 4   | Tabla con scroll horizontal en móvil, con las acciones fuera de la vista inicial                              | **Se mantiene la paridad aprobada**: las cards móviles siguen como follow-up (decisión 3), no se bundlean en la migración                                                                                            |
| 5   | Evidencia de QA                                                                                               | Regenerada completa (8 capturas, mismos nombres) tras la corrida de e2e; los dos arreglos se verificaron además con `eval` (`pillsOneLine`, altura 38 px, `postAttempts: 0`)                                         |

## Riesgos y rollback

| Riesgo                                          | Estado                                                                                       |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------- |
| CTA de upgrade en errores genéricos             | `planLimit` sólo se activa con `PLAN_LIMIT`/gate anticipado; e2e cubre los dos caminos       |
| Regresión del `Dialog` en Tasks 5/6             | `size`/`scroll` con defaults idénticos + casos nuevos en `ui-components.spec.ts` (55 verdes) |
| Pérdida del feedback heredado (Astro recargaba) | Reducers puros + alertas contextuales; unit de estado y e2e “sin recarga” con marcador       |
| Desincronización de contadores                  | Reducers con suelo 0 + e2e del contador tras crear y eliminar                                |
| Búsqueda deja de ser accent-insensitive         | Unit en ambas direcciones + e2e con `platano`/`casa santos`                                  |
| Estado del stub entre tests                     | Fixture `POST /api/__qa/ingredients/reset` por test + `workers: 1`                           |
| Hidratación (SSR vs estado cliente)             | Mismos datos del payload de `useAsyncData`; e2e con cero errores de consola                  |
| Regresión en Tasks 4–6                          | No se toca sesión, relay, SEO ni auth: sus suites siguen verdes                              |

**Rollback:** `git revert` de los commits de la Task. Sin migraciones, deploy ni estado persistente nuevo (solo `useState` en memoria). El árbol Astro sigue intacto como referencia.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit                                                                   | Contenido                                                                                             |
| ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `feat(web): agregar la lógica pura de ingredientes`                      | `ingredient-units`, `ingredient-form`, `ingredient-search`, `ingredient-messages`, `ingredient-state` |
| `feat(web): permitir tamaño y scroll en el Dialog`                       | `Dialog.vue`                                                                                          |
| `feat(web): portar la feature de ingredientes a Vue`                     | `useIngredients` + 8 componentes + ícono `refresh-cw`                                                 |
| `feat(web): reemplazar el placeholder de /ingredients por el slice real` | `app/pages/ingredients.vue`                                                                           |
| `test(web): cubrir ingredientes (unit, nuxt y e2e)`                      | 4 specs unit, `ingredients-ui.spec.ts`, `ingredients.spec.ts`, `stub-api.mjs`, casos de `Dialog`      |
| `docs(nuxt): registrar la task 07`                                       | este task file, `AGENTS.md`                                                                           |

## Follow-ups para las próximas sesiones

1. **Cards móviles para la lista de ingredientes** (mejora registrada, no bundleada): hoy es la tabla de Astro con scroll horizontal.
2. **Task 8 (recetas):** usar el copy con tildes del límite (`límite`/`más`) y reutilizar `UNIT_OPTIONS`/`parseIngredientNumber`; si aparece un `<select>` reutilizable, evaluar promover un átomo `Select` al kit (y entonces mover las unidades a `shared/`).
3. **Encabezados de la tabla:** si en Task 8 se toca la tabla de recetas, revisar ahí el `nowrap` de encabezados (hoy el de ingredientes mantiene el wrap por ancho disponible).
4. `graphify` no se usó (preferencia vigente lo prohíbe).
