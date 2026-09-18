# Task 13a — QA integral: matriz E2E, accesibilidad y gates de CI

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 13 — QA integral, corte y retirada de Astro).
Split aprobado con el usuario: **13a (esta sesión)** + **13b** (`~/.commandcode/plans/recetario-nuxt-task-13b-corte-retirada.md`, sesión aparte: `deploy.yml` único, `wrangler.jsonc` → output Nitro, retirada de Astro, docs vivos y pasada guiada en staging).
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-13a-qa-integral.md`

- **Scope:** `fix`
- **Pre-existing:** todas las slices Nuxt (Tasks 5–12), la suite e2e con stub (`test/e2e/**`), `ci.yml`, `playwright.config.ts`, el árbol Astro como referencia (fuera de build/lint).
- **Dependencies:** Tasks 5–12 (completadas). HEAD base `dcc846a`.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`, rama `worktree-nuxt-rework`, árbol limpio (solo `.commandcode/taste/*`).
- **No hizo** (→ 13b): tocar `wrangler.jsonc`/`turbo.json`/`.gitignore`/`.vscode`, retirar el árbol Astro o el tooling, reescribir `AGENTS.md`/`README`/`DEPLOY`/`CONTEXT`, ni el `deploy.yml` único.

## Resultado

La verificación integral queda automatizada y bloqueante, sin retirar todavía el artefacto Astro:

- **Matriz E2E**: `playwright.config.ts` gana proyectos `chromium` (suite completa), `firefox-smoke` y `webkit-smoke` (recorrido crítico). Chromium corre **138** casos; WebKit corre el recorrido (**2**); Firefox no arranca en el entorno del agente (limitación documentada abajo).
- **Recorrido crítico** (`journey.spec.ts`): el smoke de `docs/qa-agent-browser.md` encadenado contra el stub — anónimo → login por el formulario → ingrediente → receta con ingrediente/presentación/costo fijo → planificador → settings (perfil + preferencias persistidas) → logout → móvil — con guardarraíles de consola, `pageerror`, hidratación y respuestas ≥500. Encontró y arregló un **crash real del stub**.
- **Accesibilidad bloqueante** (`a11y.spec.ts` con `@axe-core/playwright`): 9 superficies (4 públicas indexables, `/sign-in` y 4 privadas) × 375/1280, con 0 violaciones `serious`/`critical`. El primer barrido destapó **deuda de contraste AA real** (tokens y componentes), corregida en esta sesión.
- **Gates de CI** (`ci.yml`): jobs nuevos `e2e` (instala los 3 navegadores y corre la suite) y `dry-run` (build Nitro + `wrangler deploy --dry-run`), además de la matriz `lint`/`type-check`/`test`/`build`.
- **Evidencia manual**: Lighthouse **SEO 100 / A11y 100** en las 4 públicas (móvil + escritorio) y capturas 375/1280 de los estados tocados.

| Elemento       | Valor                                                                                             |
| -------------- | ------------------------------------------------------------------------------------------------- |
| Tests web      | **644** (antes 639: +5)                                                                            |
| E2E            | **140** (chromium 138 + webkit 2) — antes 127; firefox-smoke no arranca en el sandbox del agente   |
| Tests API      | **216** (sin cambios)                                                                              |
| Bundle Nitro   | build **1.24 MB** (392 kB gzip) · dry-run **1219.03 KiB** (283.63 KiB gzip)                        |
| Lighthouse     | SEO **100** · A11y **100** · 8/8 auditorías (4 rutas × móvil/escritorio)                           |
| QA visual      | 4 capturas en `apps/web/test-results/qa/` (gitignored) + verificación por DOM                      |

## Decisiones aprobadas en la sesión

| # | Decisión | Origen |
|---|---|---|
| 1 | **Dividir la Task 13** en 13a (QA + gates, sin retirar Astro) y 13b (corte, retirada, docs y staging). | Usuario |
| 2 | **Un solo `deploy.yml` (verify → deploy-api → deploy-web)** sustituye a los dos workflows — se implementa en 13b junto al cambio de artefacto, para no dejar un pipeline que verifique Nuxt y despliegue Astro. | Usuario |
| 3 | **Gates bloqueantes = axe + asserts SEO existentes**; QA visual manual con evidencia. Sin Lighthouse bloqueante ni snapshots de regresión visual. | Usuario |
| 4 | **Staging: worker temporal + pasada guiada** (13b), porque exige credenciales de Wrangler y el click-through de Google/Stripe. | Usuario |
| 5 | Los navegadores secundarios usan el **build del fixture por proyecto** (2 builds extra). La optimización (build único + `nuxt.host`) queda como follow-up si el job de CI resulta lento. | Diseño |
| 6 | El barrido axe **asienta la página** antes de medir: neutraliza animaciones (duración 0) y fuerza el estado revelado (`[data-reveal]`/`.reveal-item`). Sin eso, axe mide opacidades intermedias y reporta contrastes falsos. | Diseño |

## Contratos nuevos

| Contrato | Definición |
|---|---|
| Proyectos Playwright | `chromium` (todo), `firefox-smoke` y `webkit-smoke` (`testMatch: /journey\.spec\.ts/`). |
| `journey.spec.ts` | Recorrido crítico encadenado + `watchPage(page)` (console error, `pageerror`, `/hydrat|mismatch/i`, responses ≥500). El redirect anónimo se asserta con `request` (encadenar redirect + `goto` interrumpía en WebKit). |
| `a11y.spec.ts` | `scan(page)` = `settle(page)` + `AxeBuilder.withTags(["wcag2a","wcag2aa"])`; `expectNoBlocking` aserta longitud con el detalle como mensaje (el diff de objetos era ilegible). |
| `useBreadcrumbTail` / `setBreadcrumbTail` | Estado `useState` con `{ path, label }`; el layout sólo lo aplica si `path` coincide. |
| Middleware `recipe-breadcrumb` | Resuelve el nombre **antes del render** reutilizando la clave `recipe:<id>` de `useAsyncData` (sin segunda petición). |
| `fetchRecipeDetailPage` / `recipeDetailKey` | Carga del detalle extraída a `recipe-detail-data.ts`, compartida por composable y middleware. |

## Hallazgos del baseline que se corrigen

| # | Baseline | Task 13a |
|---|---|---|
| 1 | Las migas mostraban «Receta» en vez del nombre (Tasks 9/10/11) | El middleware resuelve el nombre para el SSR y la página lo mantiene reactivo (rename sin recargar). |
| 2 | Receta sin filas: contenedores vacíos (Task 9) | `EmptyState` con mensaje y guía en móvil y escritorio. |
| 3 | Contraste AA: 80 violaciones axe en el primer barrido | Se corrigen los casos reales: token `muted-fg` en light (4.34 → ≥4.5 sobre `bg-muted`), labels/stats del hero y CTA del landing, badge de pasos, variante `accent` de `Badge`, sufijo de `UnitCostDisplay` y el badge Pro de `plans-config` (`bg-accent-600 text-white` → `bg-accent-700 text-text-on-accent`). |
| 4 | El stub reventaba (`presentations.map`) al crear una presentación sobre una receta creada en el test | La receta creada por `POST /api/recipes` incluye `presentations: []`, igual que los seeds (antes tumbaba la suite entera por el proceso único). |
| 5 | El contrato del layout pintaba el header antes que la página | Documentado en `private.vue`/middleware: el estado de una página no alcanza el SSR del layout. |

## Pasos ejecutados

1. **Dependencia**: `@axe-core/playwright` en `apps/web` (el `pnpm` del repo sincronizó el lockfile al correr el primer script).
2. **Playwright**: proyectos chromium + smoke de Firefox/WebKit; el resto de la config (workers 1, fixture node-server, `NUXT_PUBLIC_INDEXABLE=true`) sigue igual.
3. **Recorrido**: `journey.spec.ts` (2 casos) + arreglo defensivo del stub.
4. **Accesibilidad**: `a11y.spec.ts` con `settle()`; barrido iterativo (80 → 0 violaciones blocking) con diagnóstico por canvas (`OffscreenCanvas` + `getImageData`) para separar colores pintados de los medidos.
5. **Paridad**: migas dinámicas (middleware + composable + `breadcrumbsWithTail` puro) y estado vacío de ingredientes; tests unit/nuxt/e2e.
6. **CI**: jobs `e2e` y `dry-run` en `ci.yml`.
7. **Evidencia**: Lighthouse (build node-server + stub) y QA visual con `agent-browser` (375/1280, claro/oscuro).
8. **Verificación completa y limpieza de procesos.**

## Desviaciones respecto del plan

| # | Desviación | Motivo |
|---|---|---|
| 1 | La corrección de contraste fue mayor que «ajustes puntuales»: 1 token, 6 componentes y `packages/stripe/plans-config.ts` | El barrido destapó deuda AA real y sistémica; se corrigió con el mínimo cambio por caso (y se revirtió el churn innecesario de tokens al comprobar que no hacía falta). |
| 2 | `settle()` (neutralizar animaciones + forzar reveals) no estaba en el plan | Sin él axe mide opacidades intermedias: reportaba `#0f4033` sobre `#0b1918` (1.54) en cards que entran con `statFadeIn`/`cardFadeIn` con `fill-mode: both`. |
| 3 | El middleware `recipe-breadcrumb` sustituyó al `watch` en la página | El layout pinta el header antes del setup de la página: un `watch` en la página llegaba tarde en SSR e hidrataba con el nombre ya puesto (mismatch). |
| 4 | El recorrido asserta el redirect anónimo con `request` | Encadenar el redirect de `/recipes` con el `goto` siguiente hacía que WebKit interrumpiera la navegación. |
| 5 | `RecipeIngredientView` usa dos `v-if` independientes en vez de una cadena `v-else` | La cadena con `v-else` final dejaba la tabla de escritorio sin renderizar nunca (móvil y tabla conviven; sólo el CSS decide). |

## Verificación

| # | Comando | Resultado |
|---|---|---|
| 1 | `pnpm --filter @recetario/web lint` | 0 errores, 0 warnings |
| 2 | `pnpm --filter @recetario/web type-check` | `nuxt typecheck` sin errores |
| 3 | `pnpm --filter @recetario/web test` | 49 archivos, **644** verdes (unit + nuxt) |
| 4 | `pnpm --filter @recetario/web test:e2e --project=chromium` | **138/138** (9 a11y + 2 journey nuevos) |
| 5 | `pnpm exec playwright test --project=webkit-smoke` | **2/2** (recorrido crítico + smoke móvil) |
| 6 | `pnpm exec playwright test --project=firefox-smoke` | **No arranca**: `browserType.launch` timeout — el sandbox de macOS bloquea `plugin-container` (`sandbox_extension_issue_file_to_process ... Operation not permitted`). Limitación del entorno del agente, no del código. |
| 7 | `pnpm --filter @recetario/stripe build` | `tsc --noEmit` sin errores |
| 8 | `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test` | **216** verdes |
| 9 | `pnpm --filter @recetario/web build` | 1.24 MB (392 kB gzip) |
| 10 | `pnpm --filter @recetario/web wrangler:dry-run` | 1219.03 KiB (283.63 KiB gzip) |
| 11 | Lighthouse (`pnpm dlx lighthouse`, build node-server + stub) | **8/8**: SEO 100 · A11y 100 (4 rutas × móvil/escritorio) |
| 12 | QA visual (`agent-browser` 0.27.0, dev + stub en 8787) | 4 capturas 375/1280 claro/oscuro + verificación por DOM (CTA dark `rgb(255,123,110)` + `rgb(23,23,23)`, migas con nombre en desktop y móvil, badge dark `rgb(250,168,152)`) |
| 13 | Puertos y procesos | 4321, 8787, 8788 y 3100 libres; `agent-browser close --all`; sin stub/dev vivos |
| 14 | `git status` | solo archivos de esta Task (+ `.commandcode/taste/*`, gestionado por el sistema) |

### Matriz E2E

| Estado | Fuente | Chromium | Firefox | WebKit |
|---|---|---|---|---|
| anonymous | `smoke`, `public`, `auth`, `a11y` | sí | — | smoke (journey) |
| Free | `shell`, `ingredients`, `recipes`, `recipe-detail`, `production`, `settings` | sí | — | — |
| Basic | `production`, `settings` | sí | — | — |
| Pro | `shell`, `recipes`, `recipe-detail`, `recipe-financials`, `production`, `settings`, `journey` | sí | — | smoke (journey) |
| 375 / 1280 | cada spec conmuta `setViewportSize`; a11y escanea ambos en cada superficie | sí | — | journey incluye tramo móvil |

## Paridad responsive / QA visual

| Condición | Mobile (375) | Desktop (1280) | Evidencia |
|---|---|---|---|
| Migas del detalle | padre «Recetas» + nombre (truncado) | recorrido completo con el nombre | `t13-recipe-1280-dark.png` + DOM móvil |
| Detalle sin ingredientes | mensaje con icono | idéntico | `t13-recipe-empty-1280-dark.png` |
| Landing (CTA y labels) | layout sin cambios | CTA `text-accent-800` en claro; en dark `bg-accent-700` + `text-on-accent` | `t13-landing-1280-light.png` + DOM dark |
| Pricing (badge Pro) | badge envuelto por el mismo componente | `text-accent-800` + `dark:bg-accent-50` | `t13-pricing-375-dark.png` |

Móvil no omite información: los cambios son de color/contraste y el mensaje vacío sustituye a contenedores que ya existían en ambos breakpoints.

## Riesgos y rollback

| Riesgo | Estado |
|---|---|
| El barrido axe mide animaciones | Mitigado con `settle()` (duración 0 + reveals forzados); documentado en el spec |
| Los tokens de contraste cambian la apariencia | Cambios mínimos y verificados con Lighthouse/Q A; `muted-fg` light es el único token retocado |
| El badge Pro ahora es dato + presentación (clase en `plans-config` y variante del `Badge`) | Se alinearon ambos; los fixtures de los specs se actualizaron |
| Firefox sin verificar en local | Documentado; el job `e2e` de CI instala y corre los tres navegadores |
| El recorrido es largo (2 casos) | Fixtures deterministas por fase y guardarraíles acotados al spec |

**Rollback:** `git revert` de los commits de la sesión. Sin migraciones, sin datos persistidos y sin cambios de configuración de producción (el deploy no cambia hasta 13b).

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit | Contenido |
|---|---|
| `test(web): cubrir el recorrido crítico y la accesibilidad` | `journey.spec.ts`, `a11y.spec.ts`, proyectos de `playwright.config.ts`, `@axe-core/playwright`, stub y fixtures |
| `fix(web): mostrar el nombre de la receta en las migas` | `useBreadcrumbTail`, middleware, `recipe-detail-data.ts`, layout, página, `RecipeIngredientView` y sus tests |
| `fix(web): pasar el contraste AA del barrido axe` | `tokens.css`, componentes del landing, `Badge`, `UnitCostDisplay`, `plans-config.ts` |
| `ci: correr e2e (3 navegadores) y dry-run en PR` | `ci.yml` |
| `docs(nuxt): registrar la task 13a` | este task file + banner en `AGENTS.md` |

## Hallazgos abiertos y quién los atiende

| # | Hallazgo | Dónde se manifiesta | Dueño | Cómo se cierra |
|---|---|---|---|---|
| 1 | Firefox no arranca en el entorno del agente (sandbox macOS) | `firefox-smoke` | Usuario/CI | **Explícito**: verificar el job `e2e` de CI en el PR; local fuera del sandbox |
| 2 | El gate axe cubre público/coral y privado/emerald, no las 7 familias × 2 temas × 3 planes | `a11y.spec.ts` | 13b / sesión futura | **Explícito**: ampliar la matriz (cookies `kitchcalc-accent`) o unificar los shades de texto del acento |
| 3 | El costo del fixture (1 build por proyecto) | `playwright.config.ts` | Sesión futura | **Explícito** si el job de CI resulta lento: build único + `nuxt.host` |
| 4 | El badge del plan Pro es presentación duplicada (variante `Badge` + clase de `plans-config`) | `packages/stripe` + `Badge.vue` | 13b | **De paso**: al retirar Astro, decidir si la clase del API queda como contrato o se elimina |
| 5 | `RecipeIngredientView` usa dos `v-if` con la misma condición | feature recipes | Sin dueño | **Aceptado**: la cadena `v-else` no puede convivir con dos bloques que se muestran a la vez |
| 6 | `graphify` sigue sin usarse (preferencia vigente) | — | 13b | **Explícito**: decidir y documentar el `graphify update .` en el corte |

`graphify` no se usó (la preferencia vigente lo prohíbe).
