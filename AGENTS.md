# AGENTS.md — Recetario

> **Migración Astro → Nuxt completada (Task 13b).** `apps/web` es **Nuxt 4 + Vue** sobre Nitro (`cloudflare_module`) en un Cloudflare Worker con Workers Assets y service binding `API`; el árbol Astro (`src/**`, `astro.config.mjs` y sus dependencias) fue retirado. Decisión: `docs/adr/0009-nuxt-frontend-rework.md`; `docs/README.md` clasifica la documentación viva y la histórica (`docs/tasks/**` es registro de sesión, no guía operativa).
>
> Notas operativas vigentes:
>
> - **Relay y sesión:** `apps/web/server/**` es Nitro: relay `/api/**`, bootstrap de sesión y cabeceras privadas. El estado de sesión lo resuelve `useAuth().resolveSession()` (contexto del request → `GET /api/auth/session`).
> - **Subpaths puros:** usar `useApi()` y los subpaths `@recetario/stripe/{plans-config,formatters,subscription}`; los barrels (`@recetario/stripe`, `@recetario/auth`, `@recetario/auth/client`) arrastran el SDK o `createAuthClient`.
> - **Íconos:** `Icon.vue` compone el `<svg>` desde los datos de lucide (`app/utils/icon-registry.ts` → `__iconData`), **no** desde sus componentes. No reintroducir componentes de `@lucide/vue` en el render; el contrato de markup está en `test/nuxt/icon-parity.spec.ts`.
> - **Indexación fail-closed:** sin `NUXT_PUBLIC_INDEXABLE=true` (var del worker de producción en `wrangler.jsonc`) las públicas emiten `noindex,nofollow` y `robots.txt` bloquea el sitio completo. Staging no la define.
> - **El stub de e2e es un único proceso** (`test/e2e/support/stub-api.mjs`): un handler que revienta tumba la suite entera; no tocar los seeds por defecto (cada spec resetea su dominio con `/api/__qa/**`).

## Stack

**Nuxt 4 + Vue 3** SSR sobre **Nitro** (`cloudflare_module`) desplegado como Cloudflare Worker con Workers Assets y service binding `API`. Two apps: `apps/web` (Nuxt) + `apps/api` (Hono Worker). **pnpm 11.1.2** (package-manager locked). **Node >= 22.23.1**.
No `.env.local` — use `.env`.

## Commands

**For manual terminal/tool invocations, always use `pnpm exec` or `pnpm dlx`** to respect pinned pnpm/Node version. Do not introduce other package runners in new instructions, docs, or one-off commands.

| Command                                         | Purpose                                       |
| ----------------------------------------------- | --------------------------------------------- |
| `pnpm dev`                                      | Web `localhost:4321` + API `localhost:8787`   |
| `pnpm build`                                    | Production build (Turbo)                      |
| `pnpm --filter @recetario/web type-check`       | `nuxt typecheck`                              |
| `pnpm lint` / `pnpm test`                       | Lint / tests de todos los workspaces          |
| `pnpm --filter @recetario/web test:e2e`         | Playwright (chromium + smokes firefox/webkit) |
| `pnpm --filter @recetario/web wrangler:dry-run` | Dry-run del worker con `wrangler.jsonc`       |
| `pnpm format`                                   | Prettier whole project                        |
| `pnpm exec prisma migrate dev --name X`         | Create migration                              |
| `pnpm exec prisma generate`                     | Regenerate client                             |
| `pnpm exec prisma studio`                       | Open Prisma Studio                            |
| `pnpm exec tsx prisma/seed.ts`                  | Run seed manually                             |

**Schema changes**: When modifying `prisma/schema.prisma`, always create a new migration with `pnpm exec prisma migrate dev --name <descriptive>`. Never edit existing migration files.
**postinstall** generates the Prisma client automatically; if you need to run the same step manually, use `pnpm exec prisma generate`.
**Deploy**: un único `.github/workflows/deploy.yml` (`push` a `dev`/`master`) con jobs encadenados `verify` (reusa `ci.yml` vía `workflow_call`) → `deploy-api` → `deploy-web`; `dev` → staging, `master` → production. El artefacto web es `.output/**` (Nitro) y el build web **no** usa Prisma. Secrets por entorno con `scripts/sync-cloudflare-secrets.mjs` (`wrangler secret put` sobre `apps/api`), no desde el dashboard.

App test infrastructure: `apps/api` y `packages/db` usan Vitest; `apps/web` usa Vitest 5 (proyectos `unit` y `nuxt`) + Playwright. Si se piden tests para un paquete sin infra, proponer `Vitest` y confirmar con el usuario antes de montarla.

## Architecture

### Auth

Better Auth vive en **Hono** (`packages/auth`); la web no importa sus clientes. Google OAuth arranca y termina en el API (`BETTER_AUTH_URL`). La web resuelve la sesión por documento: `server/middleware/10.auth.ts` (bootstrap por request, cookies de presentación y CSRF) → `event.context.auth` → `app/plugins/auth.server.ts` → `useAuth().resolveSession()`. Los route middleware `auth`/`guest` protegen páginas; un 401 expira el estado y redirige a `/sign-in` con el motivo. El transporte de los formularios de auth es `app/features/auth/useAuthApi.ts` sobre `useRequestFetch()` + Zod; las reglas de contraseña salen de `@recetario/auth/password`. El bundle cliente **no** puede contener `better-auth` (lo verifica un paso de `ci.yml`).

### Pages & routing

- **Protected** (`definePageMeta({ middleware: "auth" })`): `/recipes`, `/recipes/[id]`, `/ingredients`, `/settings`, `/produccion` (`/settings/billing` es un 301 de Nitro que preserva la query).
- **Public**: `/`, `/pricing`, `/privacy`, `/terms` (indexables; `/pricing` es pública, el checkout sigue exigiendo sesión en Hono).
- **Auth**: `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email` (`noindex,nofollow`, sin canonical ni OG).
- `/produccion` exige además la feature `production_planner` (`FEATURE_REQUIRED` en Hono); la UI dirige a `/settings?tab=billing`.
- Layouts: `public.vue` (marketing), `private.vue` (shell + sidebar), `auth.vue`. El acento coral es de las rutas públicas y de auth (`isCoralAccentPath()` en `app.vue`).

### Data layer

**PostgreSQL + Prisma ORM** is the data layer for `apps/api` (Hono worker) and the seed script. The web app (`apps/web`) does NOT import Prisma or `@recetario/db` directly — every web page calls `apps/api` through the same-origin `/api/**` relay (see "Web→API destination rule" below). The singleton PrismaClient (Prisma Postgres serverless driver, `@prisma/adapter-ppg`) lives in `packages/db/src/prisma.ts`.

- Output: `generated/prisma/` (non-standard — set in `schema.prisma:7`)
- Apps import via the `@recetario/db` workspace package; the web app must not import it.
- Multi-tenant: every record has `ownerId`. Scoped by `RECIPES_STATIC_OWNER_ID`/`EMAIL` env vars for seed users.
- CRITICAL: `packages/db` is **pure persistence** — CRUD methods only, returning raw Prisma rows or status objects. No validation, no normalization, no response shaping. Every tenant-scoped CRUD method takes `ownerId` and scopes its queries by it (or via `recipe: { ownerId }` for nested joins) — this is enforced **inside the db methods**, so `apps/api` never has to remember it. New tenant records must set `ownerId` on create. Seed/bootstrap flows are the only exception. The `@recetario/db` package has unit tests (`src/owner-scoping.test.ts`) asserting each method's `where` includes `ownerId`.
- **`apps/api` never imports `prisma`** — all data access goes through `@recetario/db` CRUD methods. The only packages that import `prisma` are `packages/auth` (Better Auth's `prismaAdapter` requires the raw client) and the seed script.
- Validation (Zod `.safeParse()` via `@recetario/types`) and response shaping live in `apps/api` handlers.
- `packages/stripe` owns Stripe domain logic (thin Stripe API helpers, pricing, feature gating, and subscription shaping) and calls `@recetario/db` CRUD methods. `packages/db` owns pure persistence; the only db→stripe import is `prisma/seed-plans.ts`.
- Seed data: `data/ingredients.json`, `data/recipes.json`. Loaded on first run via `seedIfNeeded()`.

#### Web→API destination rule

`apps/web` is a thin SSR client of `apps/api`. It must not import `prisma` or `@recetario/db` directly. The only allowed data access from web is:

- The same-origin `/api/**` relay (`server/routes/api/[...path].ts` → binding `API`, fallback HTTP a `INTERNAL_API_URL` en dev), consumido con `useApi()`/`useRequestFetch()` y validado con Zod.
- Types from `@recetario/types` (Zod schemas and TS types — type-only is fine)
- Pure transformation in `app/features/**` y `shared/**` (p. ej. `production-calculator.ts`)

If a new feature needs data access from a web page, add the endpoint in `apps/api` and call it through the relay. This keeps the data layer in one place.

### Key gotchas

#### Data invariants

- **MUST NOT VIOLATE** Recipe updates are destructive: the `$transaction` deletes all `RecipeIngredient` rows, then re-creates them.
- **MUST NOT VIOLATE** Ingredient deletes are blocked when the ingredient is referenced by any recipe (returns `{ status: "blocked", recipes: [...] }`).
- **MUST NOT VIOLATE** `RecipeIngredient` uses an autoincrement `id` PK with `@@index([recipeId, ingredientId])` (not a composite PK), so the same ingredient can appear multiple times in a recipe.
- **Feature flags**: 12 keys live in `FREE_FEATURES` (all false). Basic enables 5; Pro enables all 12.

#### Operational gotchas

- **Formularios**: componentes Vue + mutaciones `useApi()` (JSON validado con Zod + envelope de error de Hono); nada de POST a la misma página. Los decimales en formato español los normaliza cada feature (`parseNumberInput` en `features/ingredients/ingredient-form.ts`).
- **Sin caché de queries**: el cliente habla con Prisma Postgres por el serverless driver (`@prisma/adapter-ppg`) y **toda lectura va a la DB**; el singleton se crea una vez por isolate. `getSubscriptionByUserId` (el hot path detrás de `/api/auth/session` y de cada página autenticada) nunca estuvo cacheado a propósito — un entitlement rancio tras un cambio de plan es peor que una query indexada. `getUserPreferences` y `getCredentialAccount` perdieron su caché de borde con la retirada de Accelerate (`docs/adr/0010-sin-accelerate-prisma-postgres-directo.md`).
- **pnpm allowed builds**: only `esbuild`, `sharp`, `@prisma/engines`, `prisma` are allowed in `pnpm-workspace.yaml`.
- **Cloudflare ephemeral**: `DATABASE_URL` is not auto-injected — set per-environment via `wrangler secret put` or the dashboard. Local dev: `pnpm dev` runs `scripts/sync-cloudflare-dev-vars.mjs` which copies root `.env` to `apps/web/.dev.vars` and `apps/api/.dev.vars`.
- **Mutaciones en Nuxt**: el estado se actualiza en sitio desde la respuesta validada (`applyRecipe`, reducers `withCreated`/`withUpdated`/`withRemoved`) y las listas se refrescan solas al volver a montarse (`experimental.purgeCachedData` es `true`): nunca recargar la página para reflejar un guardado.
- **El layout SSR se pinta antes que la página**: el dato que un layout necesita en su primer render (p. ej. el nombre en las migas) se resuelve en un route middleware reutilizando la clave de `useAsyncData`, no en un `watch` de la página (hydration mismatch).

#### Autoridad de mutaciones (Hono)

- **CSRF**: `csrfProtection()` en `apps/api/src/middleware/csrf.ts` cubre todo `POST|PUT|PATCH|DELETE`. Exige `Origin`/`Referer` confiable y, si la petición viene de navegador con cookies, doble-submit (`x-csrf-token` o `_csrf` contra la cookie `csrf_token`). Exentos: `POST /api/stripe/webhook` y `/api/auth/**` (Better Auth valida su propio origen). Las peticiones sin `Origin` (service binding, SSR) pasan por diseño.
- **Límites de plan**: `requireRecipeCapacity`, `requireIngredientCapacity` y `requireFeature` en `apps/api/src/entitlements.ts`; sin fila de suscripción se aplica el plan free (fail-closed). Al agotarse lanzan `PLAN_LIMIT` / `FEATURE_REQUIRED` (403): la UI sólo muestra CTA de upgrade con `PLAN_LIMIT`.
- **Lecturas con gate**: cuando una lectura es la única vía a datos gateados (p. ej. `GET /api/recipes/by-ids` del planificador), el gate corre también ahí (feature + tope de plan) antes de la query.
- **Auditoría de sign-in**: `recordSignInAudit` corre en `databaseHooks.session.create.after` de Better Auth (`packages/auth/src/auth.ts`); el middleware web no inspecciona paths.
- **Preferencias**: la respuesta validada de `GET/PUT /api/preferences` (y `session.preferences`) es la fuente; las cookies de tema/acento son sólo una réplica visual.

### Modules you might miss

- `app/utils/icon-registry.ts` — datos `__iconData` de lucide que consume `Icon.vue` (no importar componentes de `@lucide/vue` en el render)
- `app/utils/accent-colors.ts` — 7 familias de acento y el mapeo de shades light/dark
- `shared/utils/seo.ts` — rutas públicas indexables, `robots.txt`/`sitemap.xml` y acento coral
- `shared/utils/preferences.ts` — cookies de presentación (`kitchcalc-theme`, `kitchcalc-accent`) y sus resolvers
- `shared/utils/units.ts` / `shared/utils/search.ts` — unidades y búsqueda accent-insensitive (`#shared/*`)
- `app/features/recipes/recipe-{financials,presentations,fixed-costs}.ts` — cálculos puros del detalle
- `app/features/production/production-{calculator,selection,catalog,format}.ts` — planificador de producción
- `server/utils/api-transport.ts` — binding `API`/fallback HTTP y headers de error tempranos
- `server/middleware/10.auth.ts` — bootstrap de sesión, cookies de presentación/CSRF y `private, no-store`

### Stripe billing

Rutas en `apps/api/src/billing/**` (montadas en `apps/api/src/index.ts`):

- `POST /api/stripe/checkout` (auth) — creates Checkout Session, returns `{ url }`
- `POST /api/stripe/portal` (auth) — creates Customer Portal session
- `POST /api/stripe/sync-session` (auth) — sincroniza la sesión de checkout al volver a `/settings`
- `POST /api/stripe/webhook` (no session auth — verified via Stripe signature header using `STRIPE_WEBHOOK_SECRET`) — handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

API version: `2026-04-22.dahlia`.

## Client-side patterns

- **Estado local primero**: `ref`/`computed` y composables de feature; `useState` sólo para sesión/apariencia. Nada de globals `window.__*`, observers para sincronizar el DOM ni `innerHTML` de UI.
- **Cleanup**: todo listener/interval/observer se libera en `onBeforeUnmount`/`onUnmounted` (countdown del reset, drawer, scroll-spy, reveals).
- **Tema y acento**: los gobierna `app.vue` con `useHead` sobre `html` (`data-theme`/`data-accent`/clase `dark`) desde `useTheme()`; no hay overrides `.dark` en CSS (los tokens semánticos se adaptan solos).
- **Acentos**: 7 familias (`indigo`, `violet`, `blue`, `emerald`, `rose`, `amber`, `coral`) en `app/utils/accent-colors.ts`. El landing y las rutas de auth siempre usan `coral`.
- **Feedback de navegación/mutación**: `useLoadingIndicator` (barra superior) y estados `pending` locales; la UI nunca recarga para reflejar un cambio.

## UI conventions

- **Componentes del kit** (`~/components/ui`, auto-registrados sin prefijo): `Button`, `Input`, `Dialog`, `Badge`, `Card`, `FeedbackAlert`, `SectionHeading`, `FinancialSummary`, `Skeleton`, `EmptyState`… **Los componentes de `app/features/**`NO se auto-registran**: hay que importarlos explícitamente (si falta el import no se renderiza nada y`nuxt typecheck` no lo detecta; lo cazan los tests nuxt).
- **ALWAYS** use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`). Never hardcoded colors.
- **Dialog backdrops**: use `backdrop:bg-backdrop/50`, never `backdrop:bg-slate-900/50`.

### Icon components

Un solo componente: `<Icon name="lucide:check" :size="18" class="text-success" />`. El registro vive en `app/utils/icon-registry.ts` (`__iconData`); si falta un ícono se añade ahí — no se importan componentes de `@lucide/vue` en el render (usan `inject()` y rompen el primer render SSR dentro de un `Suspense`). El contrato de markup está en `test/nuxt/icon-parity.spec.ts`.

### Testing notes

- `apps/web` tiene dos proyectos Vitest: `unit` (nodo, sin Nuxt; resuelve `#shared` por el alias declarado en `vitest.config.ts`) y `nuxt` (`mountSuspended`). Playwright corre `chromium` (suite completa) + `firefox-smoke`/`webkit-smoke` (recorrido crítico).
- El stub e2e es un **único proceso**: los handlers deben ser defensivos y cada spec resetea su dominio con `/api/__qa/<dominio>/reset` + `GET …/state`; no tocar los seeds por defecto (los números de otros specs dependen de ellos).
- `mountSuspended` devuelve el wrapper del `Suspense`: `wrapper.emitted()`/`findComponent(...).emitted()` están vacíos; assertar eventos con listeners espía en `attrs` (`"onUpdate:open"`, `onEdit`, …).
- `mountSuspended` deja instancias vivas entre tests y `useAsyncData` cachea por clave: usar `enableAutoUnmount(afterEach)` y una copia reactiva de la ruta por montaje, o los montajes previos contaminan los contadores del stub.
- En el entorno de test, `trigger("click")` sobre un `button[type=submit]` no dispara el submit: usar `form.trigger("submit")`. Los valores de un `<input>` se asertan con `toHaveValue`/`.element.value`, no con `textContent`.
- Los dialogs viven siempre montados: acotar selectores por contenedor/`data-*` (strict mode de Playwright cuenta nodos ocultos).
- `request.get` de Playwright sigue redirects: usar `maxRedirects: 0` para assertar un 302 real.
- Antes de correr tests dependientes de entorno, limpia las variables del shell: `env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test`.
- QA con `agent-browser`: `cookies set --url http://localhost:4321`; el tema real se cambia con la cookie `kitchcalc-theme` (tocar la clase `dark` deja los tokens del tema anterior). Evidencia en `apps/web/test-results/qa/` (gitignored).

### Responsive state enumeration

When a UI component behaves differently across breakpoints or page states, analysis reports and task files **must enumerate each discrete state** explicitly. Never describe responsive behavior as a single case.

**Required format** (use in analysis reports and task files):

| Condition | Mobile (< md)  | Desktop (≥ md) |
| --------- | -------------- | -------------- |
| [state 1] | [what renders] | [what renders] |
| [state 2] | [what renders] | [what renders] |

**Mobile/desktop parity rule**: Mobile and desktop must provide equivalent semantic information. Mobile may rearrange or compact, but must never omit information that desktop shows. Reviewers must verify parity by mentally rendering each state at each breakpoint.

### Visual QA for UI changes

Any task that modifies visible UI components requires visual verification before declaring completion:

- **Implementer**: After code changes, run `pnpm dev` and visually inspect the result at both desktop (1280px) and mobile (375px) viewports. Note any visual issues in the report.
- **Reviewer**: Include a "Visual QA" checklist section that verifies:
  - Desktop rendering looks intentional and complete
  - Mobile rendering matches expectations
  - Mobile and desktop provide equivalent information (parity check)
  - No broken icons, missing elements, or layout issues

This goes beyond `pnpm --filter @recetario/web type-check` — that only verifies types, not visual correctness.

## Process Conventions

### Task File Convention

Plans reference task files — they don't embed them. Each subagent task gets its own file at `docs/tasks/task-YYYYMMDD-HHmm-<agent>.md`. The plan's Tasks section lists summaries; the task file has full technical steps.

### Task Dependency Convention

Plans MUST include a `## Task Dependencies` table before the `## Tasks` section:

```markdown
## Task Dependencies

| Task   | Depends On | Parallel-Safe |
| ------ | ---------- | ------------- |
| Task 1 | —          | yes           |
| Task 2 | Task 1     | no            |
```

Each task in the plan MUST specify:

- **Scope**: `new` | `extends-existing` | `fix` — what type of work
- **Pre-existing**: list components/files already implemented that this task builds on
- **Dependencies**: which tasks must complete first

This prevents task scope ambiguity where a builder discovers work already done.

### Pre-Flight Checks

Before dispatching builder tasks, verify the external tools they depend on (CLIs, credentials, network access). If a dependency is missing, document the gap in the task file's guardrails so the builder knows the fallback procedure.

### ESLint Cleanup

Unused imports and variables should be cleaned before validation, not after. Options:

1. **Pre-commit hook** (recommended): Add `pnpm eslint . --fix` to a pre-commit hook via `husky` + `lint-staged` to auto-remove unused imports on commit.
2. **CI check**: Add `pnpm eslint .` as a required CI check that blocks merge on lint errors.
3. **Builder self-check**: Builders already run `pnpm eslint .` as part of their verification checklist. Unused imports should be fixed in the same task, not deferred to a separate fix-ESLint task.

The goal is to eliminate the need for a dedicated fix-ESLint task after validation.

### Parallel Execution Notes

When a plan dispatches 2+ tasks in parallel, include a "Parallel Execution Notes" section listing any files touched by multiple tasks. State whether the overlap is expected conflict-free (different sections of the same file) or needs coordination.

## graphify

**No usar.** El usuario indicó que graphify todavía no está configurado correctamente (este worktree no tiene `graphify-out/`): para preguntas del código, explorar con grep/glob y agentes de exploración. No ejecutar `graphify update` en esta etapa.
