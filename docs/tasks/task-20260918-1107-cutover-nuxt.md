# Task 13b — Corte a Nuxt: deploy único, retirada de Astro y pasada en staging

> **Registro de sesión (histórico).** Documento del rework Astro→Nuxt: refleja el estado en su fecha, no la guía operativa actual. La documentación viva está en `docs/README.md`.

Roadmap padre: `~/.commandcode/plans/recetario-nuxt-rework.md` (Task 13 — QA integral, corte y retirada de Astro).
Predecesora: `docs/tasks/task-20260917-2237-qa-integral.md` (13a). Handoff directo: `deploy.yml` único, `wrangler.jsonc` → output Nitro, retirada de Astro, docs vivos y pasada guiada en staging.
Plan de sesión: `~/.commandcode/plans/recetario-nuxt-task-13b-corte-retirada.md`

- **Scope:** `fix` (corte de infraestructura/comportamiento; sin features nuevas).
- **Pre-existing:** todas las slices Nuxt (Tasks 4–12), matriz E2E + axe bloqueante + jobs `e2e`/`dry-run` de `ci.yml` (13a), el árbol Astro `apps/web/src/**` como referencia, `wrangler.nuxt.jsonc` temporal, `docs/tasks/**` y los ADRs.
- **Dependencies:** Tasks 5–12 (hechas). HEAD base `a830dec` en `worktree-nuxt-rework`, con `.commandcode/taste/*` como único cambio previo.
- **Entorno:** Node `v22.23.1`, pnpm `11.1.2`. El worktree ya era el cwd de la sesión. `pnpm install` lo ejecutó el usuario (checkpoint del plan §6) para sincronizar `pnpm-lock.yaml` tras retirar las dependencias de Astro.

## Resultado

El corte deja a `apps/web` sin Astro y con el artefacto de Nitro como único desplegable:

- **Deploy único:** `deploy.yml` encadena `verify` (reusa `ci.yml` con `workflow_call`) → `deploy-api` → `deploy-web`, con `concurrency` por rama sin cancelar. El deploy web ya no genera Prisma ni define `DATABASE_URL` porque el artefacto es `.output`. `ci.yml` suma el guard del bundle (sin Prisma/`pg`/WASM y sin `better-auth` en el cliente).
- **Artefacto:** `wrangler.jsonc` es la única config del worker (absorbe `wrangler.nuxt.jsonc`), con `main`/`assets` de Nitro en el nivel superior (el job `dry-run` despliega sin `--env`) y binding `API` por entorno. Staging no define `NUXT_PUBLIC_INDEXABLE` → fail-closed.
- **Astro retirado:** `apps/web/src/**` (88 archivos), `astro.config.mjs`, `wrangler.nuxt.jsonc`, `scripts/generate-icons.mjs` y las dependencias/plugins/overrides de Astro en Prettier, ESLint, tsconfig, `.gitignore`, `turbo.json` y los scripts de Cloudflare.
- **Accesibilidad:** el relleno de acción pasa a un rol propio del acento (`--color-accent-solid`) y el barrido axe cubre las 7 familias × claro/oscuro.
- **Navegación cliente:** el destino en curso se marca en el shell desde el primer frame del click, los enlaces internos navegan con el router y el detalle/planificador ya no bloquean la navegación (datos `lazy` + esqueleto).
- **Documentación:** vivos al día (AGENTS/README/DEPLOY/CONTEXT/DESIGN/QA/README de api y auth) e históricos identificados (`docs/README.md`, `specs/README.md` y banner de una línea en cada task/spec/research).

## Decisiones aprobadas en la sesión

| # | Decisión | Origen |
|---|---|---|
| 1 | **Staging real en la sesión** (build + `wrangler deploy --env staging` al worker `recetario-web-staging`), con click-through del usuario (Google/Stripe) y evidencia + rollback documentados. Producción no se despliega aquí. | Usuario |
| 2 | **Barrido axe de los 7 acentos** (hallazgo 13a #2): cookies `kitchcalc-accent` × claro/oscuro sobre superficies privadas. | Usuario |
| 3 | **Quitar la clase Tailwind del badge** del contrato (`TierConfig.badge`/`PricingPlan.badge` → `{ text }`): la presentación vive sólo en la UI. | Usuario |
| 4 | **Docs históricos: índice + banners** (`docs/README.md` + banner de una línea por documento). | Usuario |
| 5 | El **relleno del acento** se separa de la rampa: el override del tema oscuro sólo aplica a `--color-accent-solid`/`-hover`; los shades de tinta/tinte/borde siguen `darkShadeMap`. | Hallazgo del `/design review` |
| 6 | La **navegación pendiente** la escribe un plugin desde el router (`useNavPending`) y la pintan los enlaces del shell; los internos migran a `NuxtLink`. | Sesión |
| 7 | **Datos `lazy` + esqueleto**: el SSR sigue esperando la promesa, la navegación cliente no. | Sesión |
| 8 | Los **fixes de la pasada en staging** (body JSON en mutaciones, `accept-encoding` del relay) van como commits propios. | Sesión |
| 9 | **Agrupación de commits por tema** (12), incluidas las partes no previstas en la tabla del plan. | Usuario |

Decisiones ya cerradas por el usuario (taste, no se re-preguntan): un solo `deploy.yml` con jobs encadenados; CI bloquea con lint/type-check/tests/build/dry-run/e2e (axe incluido) y **sin** Lighthouse ni snapshots de regresión visual; staging = pasada guiada; `graphify` no se usa (no está configurado); `pnpm install` lo ejecuta el usuario.

## Contratos nuevos

| Contrato | Definición |
|---|---|
| `deploy.yml` | `on: push [dev, master]` + `concurrency: deploy-<rama>` (`cancel-in-progress: false`); `verify` → `deploy-api` → `deploy-web`, cada deploy con `environment: production\|staging`. `ci.yml` gana `workflow_call` (mantiene `pull_request`). |
| `wrangler.jsonc` | Config única del worker: `main`/`assets` de Nitro, `services.API` por entorno y `vars` por entorno (`NODE_ENV`; `NUXT_PUBLIC_INDEXABLE=true` sólo en producción). |
| `useNavPending()` | `useState<string \| null>` con el destino en curso; lo escribe `plugins/nav-pending.client.ts` (`beforeEach`/`afterEach`/`onError`/`page:loading:end`) con un mínimo visible de 500 ms. |
| `isInternalHref` / `matchesPendingHref` | `shared/utils/navigation.ts`: qué enlace resuelve el router (fuera externos, anclas, `mailto:` y `/api/**`) y si un enlace corresponde al destino pendiente comparando por sección. |
| Rol sólido del acento | `--color-accent-solid` / `--color-accent-solid-hover` / `--color-text-on-accent` por familia y tema (`solidShades` en `app/utils/accent-colors.ts`); la rampa 50…950 no interviene. |
| `status: "idle"` | Valor inicial de `useAsyncData` con `lazy` en el detalle: la página distingue «cargando» de «falló» (`loading` en `useRecipeDetail`). |
| Transporte del relay | `accept-encoding: identity` hacia el API (`TRANSPORT_OWNED_HEADERS`) y JSON `{}` con `content-type` en toda mutación sin body. |
| Badge | `TierConfig.badge`/`PricingPlan.badge` = `{ text }`; el color lo decide la UI (`Badge variant="tier"`). |

## Hallazgos del baseline que se corrigen

| # | Hallazgo | Task 13b |
|---|---|---|
| 1 | 13a #2: el gate axe cubría público/coral y privado/emerald, no las 7 familias × 2 temas | Caso nuevo en `a11y.spec.ts` con las cookies de presentación y la lista real de acentos |
| 2 | 13a #4: el badge Pro duplicaba presentación (variante `Badge` + clase de `plans-config`) | El contrato queda en `{ text }` y el color se decide en la UI |
| 3 | 13a #6: `graphify` sin decisión | Se documenta como «no usar (no configurado)» en AGENTS.md |
| 4 | El pase de recolor dejaba el texto del acento en 1.95:1 sobre `bg-accent-50` en oscuro + coral | El override se acota al rol de relleno; evidencia en `.commandcode/design/review-report.md` |
| 5 | El click no daba señal en el frame: enlaces `<a>` y `throttle: 150` en el indicador | Estado pendiente + `NuxtLink` + `NavProgressBar` en `app.vue` sin throttle |
| 6 | El detalle y el planificador bloqueaban la navegación hasta que llegaba el API | «`lazy` + esqueleto», con migas resueltas en el middleware (sólo servidor) |
| 7 | Better Auth devolvía 415 al sign-out (POST sin `content-type`) | `apiFetch` manda `{}` + `content-type` en mutaciones; el stub replica el 415 |
| 8 | En dev el relay devolvía `ERR_CONTENT_DECODING_FAILED` (gzip reenviado) | `accept-encoding: identity` + spec con upstream gzip real |

## Pasos ejecutados

1. **Deploy y artefacto**: `deploy.yml` único, `workflow_call` y guard de bundle en `ci.yml`, borrado de los dos workflows viejos.
2. **`wrangler.jsonc`** única (absorbe `wrangler.nuxt.jsonc`), `nuxt.config.ts` sin `configPath`, `wrangler:dry-run` sin `--config`.
3. **Retirada de Astro**: árbol, config, deps, tooling e ignores; barrido de comentarios que citaban el baseline.
4. **Checkpoint de instalación** (usuario): `pnpm install` → `pnpm-lock.yaml` sin dependencias de Astro.
5. **Badge**: contrato `{ text }`, `plans-config`, UI y fixtures.
6. **Barrido de acentos** en `a11y.spec.ts`; el informe del `/design review` destapó la regresión de contraste y el pase se acotó al rol sólido.
7. **Navegación**: `useNavPending` + plugin + migración a `NuxtLink`; `NavProgressBar` en `app.vue` sin throttle.
8. **Datos `lazy`**: detalle (esqueleto + `idle`), planificador (escenario diferido) y Preferencias (preview que muere con la pestaña).
9. **Fixes de staging**: body JSON en mutaciones y `accept-encoding` del relay, con su cobertura (unit + stub).
10. **Documentación**: vivos reescritos e históricos identificados.
11. **Cierre**: 12 commits temáticos, sin trailer de co-autor.

## Desviaciones respecto del plan

| # | Desviación | Motivo |
|---|---|---|
| 1 | El plan preveía 5 commits; se hicieron **12** | La sesión produjo además el recolor AA, la navegación pendiente, los datos `lazy` y dos fixes de staging: cada tema va en su commit en vez de mezclarse |
| 2 | `specs/**` (50 archivos) recibe **un solo `specs/README.md`** en vez de 50 banners | Desviación registrada en el plan §5; el árbol entero es histórico |
| 3 | `docs/adr/0009` **no** lleva todavía la nota de estado «Implementada (Task 13b)» ni ADR-0007 su nota | Queda como hallazgo abierto (tabla final) |
| 4 | El informe del `/design review` se commitea como evidencia (`.commandcode/design/`) | Explica el cambio de acento; el plan no lo contemplaba |
| 5 | La verificación del plan §8 y la evidencia de la pasada en staging no quedan registradas aquí | Este cierre se limita a los commits; la tabla siguiente queda a la espera de rellenar resultados |

## Verificación

Pendiente de registrar (el cierre de esta sesión sólo agrupa y commitea los cambios):

| # | Comando | Esperado |
|---|---|---|
| 1 | `pnpm --filter @recetario/web lint` | 0 errores/warnings |
| 2 | `pnpm --filter @recetario/web type-check` | `nuxt typecheck` limpio |
| 3 | `pnpm --filter @recetario/web test` | unit + nuxt verdes (con el caso nuevo de `nav-pending` y el de Preferencias) |
| 4 | `pnpm --filter @recetario/web test:e2e --project=chromium` | suite + barrido de acentos |
| 5 | `pnpm exec playwright test --project=webkit-smoke` | recorrido crítico |
| 6 | `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test` | suite del API verde |
| 7 | `pnpm lint && pnpm type-check && pnpm test && pnpm build` (raíz, turbo) | verde |
| 8 | `pnpm --filter @recetario/web build` + `wrangler:dry-run` | build Nitro y dry-run con `wrangler.jsonc` |
| 9 | `--env staging --dry-run` de Wrangler | config de los dos entornos válida |
| 10 | `grep -rIl -E "@prisma/client\|pg-native\|\.wasm" apps/web/.output` | sin coincidencias |
| 11 | Smoke con workerd local (con y sin `NUXT_PUBLIC_INDEXABLE=true`) | relay/binding, headers privados y flip de indexable |
| 12 | Staging (`--env staging`) + click-through (Google, Stripe, CSRF) | evidencia y rollback documentados |

QA visual: aplica al recolor y a la navegación pendiente (capturas 375/1280 claro/oscuro de la banda CTA, el botón primario y el estado pendiente del shell); queda pendiente de registrar junto con la verificación.

## Riesgos y rollback

| Riesgo | Mitigación |
|---|---|
| `vars` del worker no llegan a `runtimeConfig` en runtime | Verificado en el smoke de workerd; si no llegan, `NUXT_PUBLIC_INDEXABLE` como env de build sólo en el job de producción (+ `env` en el task `build` de `turbo.json`) |
| Desplegar staging pisa el worker anterior | `wrangler rollback` / historial de versiones del Worker; producción y DB intactas |
| `WEB_ORIGIN`/`BETTER_AUTH_URL` de staging no coinciden con el host web | Precondición de la pasada; se ajusta el secreto antes del click-through |
| El guard anti-Prisma da un falso positivo (`pg` en un nombre) | Se acota el patrón y se documenta la excepción |
| Retirar los plugins de Astro rompe format/lint | Las tres configs se limpian antes de correr los checks |

**Rollback del corte completo:** `git revert` de los commits de la sesión; el artefacto Astro anterior se puede redesplegar desde el historial de versiones del Worker. Sin migraciones de DB.

## Commits

Rama `worktree-nuxt-rework`, sin trailer de co-autor, separados por tema:

| Commit | Contenido |
|---|---|
| `ci: unificar el deploy en verify → api → web` | `deploy.yml`, `ci.yml` (`workflow_call` + guard del bundle), borrado de los dos workflows viejos |
| `chore(web): desplegar el artefacto Nitro y retirar Astro` | `wrangler.jsonc`, `nuxt.config.ts`, `package.json` (+lockfile), `turbo.json`, tooling y borrados de `src/**`/`astro.config.mjs`/`wrangler.nuxt.jsonc` |
| `fix(web): separar el relleno de acento y subir los shades a AA` | `accent-colors.ts`, `tokens.css`, consumidores del acento, sus tests y el informe del `/design review` |
| `test(web): barrer los siete acentos en la matriz axe` | `a11y.spec.ts` |
| `feat(web): marcar el destino pendiente y navegar con el router` | `useNavPending`, plugin `nav-pending`, `navigation.ts`, shell, migración a `NuxtLink` y sus tests |
| `perf(web): cargar los datos en cliente sin bloquear la navegación` | detalle (`lazy` + esqueleto), middleware de migas, planificador y Preferencias |
| `fix(web): mandar JSON en las mutaciones sin body` | `api-client.ts`, su spec y el 415 del stub |
| `fix(web): no reenviar accept-encoding en el relay` | `api-transport.ts` + spec con upstream gzip |
| `refactor(stripe): sacar la presentación del badge del contrato` | `packages/types`, `packages/stripe`, `PricingSection.vue` y fixtures |
| `docs: actualizar la documentación viva y marcar la histórica` | AGENTS/README/DEPLOY/CONTEXT/DESIGN/QA/READMEs + ADRs, `docs/README.md`, `specs/README.md` y banners |
| `docs(nuxt): registrar la task 13b` | este task file |
| `chore: actualizar las preferencias aprendidas (taste)` | `.commandcode/taste/**` |

## Hallazgos abiertos y quién los atiende

| # | Hallazgo | Dónde se manifiesta | Dueño | Cómo se cierra |
|---|---|---|---|---|
| 1 | Verificación del plan §8 y evidencia de la pasada en staging sin registrar | tabla de verificación | Usuario | **Explícito**: correr la matriz y anotar resultados + evidencia de `apps/web/test-results/qa/` |
| 2 | `docs/adr/0009` sin la nota de estado «Implementada (Task 13b)» (y ADR-0007 sin su nota) | `docs/adr/**` | Sesión de cierre | **Explícito**: añadir la nota de una línea, como en 0002/0003/0004 |
| 3 | Firefox no arranca en el sandbox del agente (13a #1) | `firefox-smoke` | Usuario/CI | **Explícito**: verificar el job `e2e` del PR |
| 4 | Coste del fixture de Playwright (1 build por proyecto) | `playwright.config.ts` | Sesión futura | **Explícito** si el job resulta lento: build único + `nuxt.host` |
| 5 | `RecipeIngredientView` usa dos `v-if` con la misma condición | feature recipes | Sin dueño | **Aceptado** (13a #5) |
| 6 | Deploy de producción y verificación del job `e2e` con los tres navegadores | `deploy.yml` al mergear a `master` | Usuario | **Explícito** en el merge |
| 7 | Typo en un comentario de `Button.vue` («paridad con el componente el baseline») | `components/ui/atoms/Button.vue` | Sesión futura | **De paso**: corregir la redacción al tocar el archivo |

`graphify` no se usó (no está configurado en este worktree: no hay `graphify-out/`).
