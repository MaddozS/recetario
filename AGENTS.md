# AGENTS.md — Recetario

> **Migración Nuxt en curso.** `apps/web` se está reescribiendo de Astro a Nuxt 4 + Vue en el worktree `worktree-nuxt-rework`, hoy en `/Users/maddozs/personal-projects/recetario-nuxt-rework` (fuera de `~/.commandcode/` para no disparar prompts de permiso). El árbol Astro (`apps/web/src/**`) queda como referencia fuera de build/lint/type-check hasta la Task 13. Decisión en `docs/adr/0009-nuxt-frontend-rework.md`; estado por task en `docs/tasks/` (última: `task-20260912-0925-cloudflare-shell.md`).
>
> **Task 4 (relay, sesión y shell) ya está en la rama.** Detalles operativos:
> - `pnpm dev` en `apps/web` sincroniza `.dev.vars` y limpia `.vite-cache/web`, y sirve en `localhost:4321` (el API confía en `WEB_ORIGIN`). El API sigue en `localhost:8787`: en dev el relay cae a HTTP contra `INTERNAL_API_URL`.
> - `apps/web/server/**` es Nitro: relay `/api/**`, bootstrap de sesión y cabeceras privadas. El estado de sesión lo resuelve `useAuth().resolveSession()` (contexto del request → `GET /api/auth/session`).
> - Preferir `useApi()` y `@recetario/stripe/subscription` en el código nuevo; el barrel de `@recetario/stripe` arrastra el SDK.
> - **Bug conocido (bloqueante para el corte):** el primer render SSR tras arrancar el proceso falla si la página usa íconos (`useLucideProps`/`inject`). Reproducción y análisis en `docs/tasks/task-20260912-0925-cloudflare-shell.md` (Follow-up 1); los e2e lo absorben con `test/e2e/support/warmup.ts`.

## Stack

**Astro 6** SSR via `@astrojs/cloudflare` (Cloudflare Pages). Two apps: `apps/web` (Astro Pages) + `apps/api` (Hono Worker). **pnpm 11.1.2** (package-manager locked). **Node >= 22.23.1**.
No `.env.local` — use `.env`.

## Commands

**For manual terminal/tool invocations, always use `pnpm exec` or `pnpm dlx`** to respect pinned pnpm/Node version. Do not introduce other package runners in new instructions, docs, or one-off commands.

| Command                                 | Purpose                        |
| --------------------------------------- | ------------------------------ |
| `pnpm dev`                              | Dev server at `localhost:4321` |
| `pnpm build`                            | Production build               |
| `pnpm preview`                          | Preview build locally          |
| `pnpm format`                           | Prettier whole project         |
| `pnpm astro check`                      | Type-check `.astro` + `.ts`    |
| `pnpm eslint .`                         | Lint JS/TS/Astro               |
| `pnpm exec prisma migrate dev --name X` | Create migration               |
| `pnpm exec prisma generate`             | Regenerate client              |
| `pnpm exec prisma studio`               | Open Prisma Studio             |
| `pnpm exec tsx prisma/seed.ts`          | Run seed manually              |

**Schema changes**: When modifying `prisma/schema.prisma`, always create a new migration with `pnpm exec prisma migrate dev --name <descriptive>`. Never edit existing migration files.
**postinstall** generates the Prisma client automatically; if you need to run the same step manually, use `pnpm exec prisma generate`.
**cloudflare-build** (apps/web) runs Prisma generate, migrate deploy, and Astro build; reproduce with `pnpm --filter @recetario/web cloudflare-build`. **api deploy** via `pnpm --filter @recetario/api deploy` (wrangler deploy). Set per-environment secrets via `wrangler pages secret put <KEY>` (web) / `wrangler secret put <KEY>` (api) or the Cloudflare dashboard.

App test infrastructure: `apps/api` and `packages/db` use Vitest (`pnpm --filter @recetario/api test`, `pnpm --filter @recetario/db test`). If tests are requested for a package without infra, propose `Vitest` and confirm with the user before scaffolding.

## Architecture

### Auth

Better Auth via `src/lib/auth.ts` (server singleton) + `src/lib/auth-client.ts` (client). Google OAuth. Middleware (`src/middleware.ts`) populates `Astro.locals.{user, session, subscription}` on every request. `SubscriptionPlan` rows auto-seeded on first authenticated request (`globals.__plansSeeded` guard).

### Pages & routing

- **Protected** (`Astro.locals.session` required): `/recipes`, `/recipes/[recipe]`, `/ingredients`, `/settings`, `/produccion` (`/settings/billing` redirects 301 to `/settings?tab=billing`)
- On protected pages, if `Astro.locals.session` is null, return `Astro.redirect("/sign-in")` at the top of the frontmatter.
- **Public**: `/sign-in`, `/sign-up`, `/pricing`
- `/produccion` also gated behind `production_planner` feature flag
- If the `production_planner` flag is false, redirect to `/settings?tab=billing` with an upgrade prompt.
- Layout: `Layout` (app shell + sidebar) or `LandingLayout` (marketing). `currentPage` prop: `recipes | ingredients | settings | production`.

### Data layer

**PostgreSQL + Prisma ORM** is the data layer for `apps/api` (Hono worker) and the seed script. The web app (`apps/web`) does NOT import Prisma or `@recetario/db` directly — every web page calls `apps/api` via `apiFetch` (see "Web→API destination rule" below). The singleton PrismaClient (with the Accelerate extension) lives in `packages/db/src/prisma.ts`.

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

- `apiFetch(path, { schema, ... }, Astro.request)` from `@/lib/api-client` for live data
- Types from `@recetario/types` (Zod schemas and TS types — type-only is fine)
- Pure transformation in `apps/web/src/lib/*` (e.g. `production-calculator.ts`)

If a new feature needs data access from a web page, add the endpoint in `apps/api` and call it via `apiFetch`. This keeps the data layer in one place.

### Key gotchas

#### Data invariants

- **MUST NOT VIOLATE** Recipe updates are destructive: the `$transaction` deletes all `RecipeIngredient` rows, then re-creates them.
- **MUST NOT VIOLATE** Ingredient deletes are blocked when the ingredient is referenced by any recipe (returns `{ status: "blocked", recipes: [...] }`).
- **MUST NOT VIOLATE** `RecipeIngredient` uses an autoincrement `id` PK with `@@index([recipeId, ingredientId])` (not a composite PK), so the same ingredient can appear multiple times in a recipe.
- **Feature flags**: 12 keys live in `FREE_FEATURES` (all false). Basic enables 5; Pro enables all 12.

#### Operational gotchas

- **Forms**: no Astro Actions. POST to the same page, read `Astro.request.formData()`, then redirect. Spanish locale: `parseNumberInput()` converts comma to dot.
- **Subscription cache**: `getSubscriptionByUserId` (the hot path behind `/api/auth/session` and every authenticated page) is deliberately **uncached** — entitlements must never be stale. Only `getUserPreferences` and `getCredentialAccount` still use Accelerate edge caching (`cacheStrategy` with `ttl: 60`, `swr: 120`, tagged `user:<id>`); writes invalidate via `invalidateAccelerateCache` in `@recetario/db` (best-effort; failures are logged).
- **pnpm allowed builds**: only `esbuild`, `sharp`, `@prisma/engines`, `prisma` are allowed in `pnpm-workspace.yaml`.
- **Cloudflare ephemeral**: `DATABASE_URL` is not auto-injected — set per-environment via `wrangler secret put` or the dashboard. Local dev: `pnpm dev` runs `scripts/sync-cloudflare-dev-vars.mjs` which copies root `.env` to `apps/web/.dev.vars` and `apps/api/.dev.vars`.
- **Feedback + reload**: `showFeedback()` is client-side DOM; `window.location.reload()` after it erases feedback, so prefer DOM updates for in-page state.

#### Autoridad de mutaciones (Hono)

- **CSRF**: `csrfProtection()` en `apps/api/src/middleware/csrf.ts` cubre todo `POST|PUT|PATCH|DELETE`. Exige `Origin`/`Referer` confiable y, si la petición viene de navegador con cookies, doble-submit (`x-csrf-token` o `_csrf` contra la cookie `csrf_token`). Exentos: `POST /api/stripe/webhook` y `/api/auth/**` (Better Auth valida su propio origen). Las peticiones sin `Origin` (service binding, SSR) pasan por diseño.
- **Límites de plan**: `requireRecipeCapacity`, `requireIngredientCapacity` y `requireFeature` en `apps/api/src/entitlements.ts`; sin fila de suscripción se aplica el plan free (fail-closed). Al agotarse lanzan `PLAN_LIMIT` / `FEATURE_REQUIRED` (403): la UI sólo muestra CTA de upgrade con `PLAN_LIMIT`.
- **Auditoría de sign-in**: `recordSignInAudit` corre en `databaseHooks.session.create.after` de Better Auth (`packages/auth/src/auth.ts`); el middleware web no inspecciona paths.
- **Preferencias**: la respuesta validada de `GET/PUT /api/preferences` (y `session.preferences`) es la fuente; las cookies de tema/acento son sólo una réplica visual.

#### Known bugs

- **Tsconfig exclude**: this is a known bug. Do NOT modify it unless explicitly asked. If asked, split it into separate array entries: `["dist", ".agent/**", ".astro/**", "node_modules/**"]`.

### Modules you might miss

- `src/lib/instructions-parser.ts` — markdown→HTML rendering for recipe instructions (parses headings, steps, `@ingredient` refs)
- `src/lib/html-sanitizer.ts` — DOMPurify wrapper for recipe instructions (limited tag/attr allowlist)
- `src/lib/formatters.ts` — exports `formatCurrency` and `timeAgo` (no `formatNumber`)
- `src/lib/form-utils.ts` — `parseNumberInput(value)` for Spanish-format decimals
- `src/lib/auth-client.ts` — client-side Better Auth (used for sign-in popup)
- `src/lib/sign-in.ts` / `src/lib/sign-out.ts` — Google sign-in with popup/open-in-tab
- `src/lib/dialog.ts` — `bindDialogBackdrop()` utility

### Stripe billing

3 routes in `src/pages/api/stripe/`:

- `checkout` (POST, auth) — creates Checkout Session, returns `{ url }`
- `portal` (POST, auth) — creates Customer Portal session
- `webhook` (POST, no session auth — verified via Stripe signature header using `STRIPE_WEBHOOK_SECRET`) — handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

API version: `2026-04-22.dahlia`.

## Client-side patterns

- **Binding guards**: `data-*-bound="1"` attributes prevent duplicate listener binding across SPA navigations
- **Lifecycle**: Bind on both `astro:page-load` and `astro:after-swap`
- **Theme**: `applyTheme()` reads `html.dataset.theme` / `html.dataset.accent`. No `.dark` CSS overrides — semantic tokens auto-adapt.
- **Accent colors**: 7 families (`indigo`, `violet`, `blue`, `emerald`, `rose`, `amber`, `coral`) in `src/lib/accent-colors.ts`. Landing layout always uses `coral`.

## UI conventions

- **ALWAYS** use `Button`, `Input`, `Dialog`, `Badge`, `Card`, `FeedbackAlert`, `SectionHeading`, `FinancialSummary` from `@/components/ui` barrel. Icons: import named components from `@recetario/ui/icons/<Name>.astro` or use `DynamicIcon` from `@recetario/ui/DynamicIcon.astro` for dynamic resolution.
- **ALWAYS** use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`). Never hardcoded colors.
- **Dialog backdrops**: use `backdrop:bg-backdrop/50`, never `backdrop:bg-slate-900/50`.

### Icon components

Per-icon `.astro` components live in `packages/ui/src/icons/<Name>.astro`. Import directly:

```astro
import Check from "@recetario/ui/icons/Check.astro";
<Check size={18} class="text-success" />
```

Missing an icon? Drop a new `.astro` file into `packages/ui/src/icons/` and import it. TypeScript catches typos at the import line — no allowlist, no central registry.

For dynamic icon names (resolved at runtime), use `DynamicIcon`:

```astro
import DynamicIcon from "@recetario/ui/DynamicIcon.astro";
<DynamicIcon name="lucide:check" size={16} />
```

`DynamicIcon` strips the `lucide:` prefix automatically.

### Responsive state enumeration

When a UI component behaves differently across breakpoints or page states, analysis reports and task files **must enumerate each discrete state** explicitly. Never describe responsive behavior as a single case.

**Required format** (use in analysis reports and task files):

| Condition | Mobile (< md) | Desktop (≥ md) |
|-----------|---------------|-----------------|
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

This goes beyond `pnpm astro check` — that only verifies types, not visual correctness.

## Process Conventions

### Task File Convention
Plans reference task files — they don't embed them. Each subagent task gets its own file at `docs/tasks/task-YYYYMMDD-HHmm-<agent>.md`. The plan's Tasks section lists summaries; the task file has full technical steps.

### Task Dependency Convention
Plans MUST include a `## Task Dependencies` table before the `## Tasks` section:

```markdown
## Task Dependencies
| Task | Depends On | Parallel-Safe |
|------|------------|---------------|
| Task 1 | — | yes |
| Task 2 | Task 1 | no |
```

Each task in the plan MUST specify:
- **Scope**: `new` | `extends-existing` | `fix` — what type of work
- **Pre-existing**: list components/files already implemented that this task builds on
- **Dependencies**: which tasks must complete first

This prevents task scope ambiguity where a builder discovers work already done.

### Pre-Flight Checks
Before dispatching builder tasks, the orchestrator should verify tool dependencies:

```bash
# Graphify dependencies
$(cat graphify-out/.graphify_python 2>/dev/null || echo python3) -c "import networkx" 2>/dev/null && echo "graphify: ok" || echo "graphify: networkx MISSING"
```

If dependencies are missing, document the gap in the task file's guardrails so the builder knows to use the fallback procedure (grep/glob instead of graphify).

### ESLint Cleanup
Unused imports and variables should be cleaned before validation, not after. Options:

1. **Pre-commit hook** (recommended): Add `pnpm eslint . --fix` to a pre-commit hook via `husky` + `lint-staged` to auto-remove unused imports on commit.
2. **CI check**: Add `pnpm eslint .` as a required CI check that blocks merge on lint errors.
3. **Builder self-check**: Builders already run `pnpm eslint .` as part of their verification checklist. Unused imports should be fixed in the same task, not deferred to a separate fix-ESLint task.

The goal is to eliminate the need for a dedicated fix-ESLint task after validation.


### Parallel Execution Notes
When a plan dispatches 2+ tasks in parallel, include a "Parallel Execution Notes" section listing any files touched by multiple tasks. State whether the overlap is expected conflict-free (different sections of the same file) or needs coordination.




## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
