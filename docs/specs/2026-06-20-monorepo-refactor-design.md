# Spec: Monorepo Refactor

Created: 2026-06-20 17:18
Orchestrator: orchestrator
Status: draft
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Explore: docs/tasks/task-20260620-1718-explore-report.md

## Problem / Need

The KitchCalc codebase is a single Astro 6 SSR fullstack project (~30 files in `src/lib/`, 22 app components, 8 UI primitives, 17 pages, 9 API routes, 8 Prisma models). All backend logic, data access, auth, billing, and UI live under one `src/` tree. As the team grows to 3-5 people and the surface area expands (production planner, fixed costs, password reset), coupling between modules makes builds slow, code review hard, and feature ownership unclear.

**Goal**: Reorganize into a logical monorepo (pnpm workspaces + Turborepo) with 6 packages (`db`, `auth`, `billing`, `ui`, `types`, `config`) under `apps/web/`. Single Vercel deploy. No physical API/backend split. No build infrastructure beyond pnpm + Turborepo.

**Why now**: Active work in flight (password reset) will become harder to merge as the codebase grows. Better to refactor while the surface is manageable.

**What this solves**:
- Code organization: clear package boundaries, easier to find what to change
- Build performance: Turborepo caching + incremental builds, especially for CI
- Team scaling: per-package code ownership, independent type-checking
- Future readiness: foundation for second frontend (admin/mobile) without rewrites

**What this does NOT solve**:
- API scalability (single deploy, no horizontal scaling)
- Multi-tenant isolation (still same DB)
- Build size (Astro SSR is already lean)

## Context (from Phase 1 Analysis)

Key findings from `analysis-20260620-1718-monorepo-refactor.md` and `task-20260620-1718-explore-report.md`:

- **Current state**: Single Astro project, pnpm 11.1.2, deploys to Vercel as one app. `pnpm-workspace.yaml` exists with only `allowBuilds` (no `packages:` key).
- **No circular dependencies** in current code. Refactor is feasible.
- **Most coupled file**: `src/lib/db/billing.ts` (imports prisma + stripe + cache + plans-config + formatters). Will move to `packages/stripe/`.
- **`.astro` in npm package is risky** — Button.astro imports from `astro-icon/components`. Need peerDeps on astro + astro-icon. Validate with 1-component spike first.
- **`middleware.ts` is Astro-bound** — stays in `apps/web/`. Touches 7 modules after refactor (down from current god-module pattern).
- **Prisma client output is non-standard** (`../generated/prisma`). Update `schema.prisma:7` to relative path within new `packages/db/`.
- **Active work in flight**: branch `006-password-reset-flow` (Draft, not merged) — must merge before refactor. Migration `20260612233154_costos_fijos_avanzados` already applied (low risk, files just move).
- **Graphify graph not useful** for code analysis (built on design tokens, 0 edges). kitchcalc-explore used grep fallback.

## Success Criteria

- [ ] `pnpm install` succeeds at root with workspaces configured (`apps/*` + `packages/*`)
- [ ] `pnpm build` produces identical Vercel build output (deployable, no functional regression)
- [ ] `pnpm dev` works from root with same behavior as before (`localhost:4321`)
- [ ] `pnpm turbo run build lint type-check` runs all packages in dependency order
- [ ] All 5 packages exist with valid `package.json` and `tsconfig.json` extending `packages/config/tsconfig.base.json`
- [ ] `packages/db/prisma/schema.prisma` generates client to `packages/db/generated/prisma`
- [ ] No `import { prisma } from "@/lib/prisma"` remains — all consumers use `@recetario/db` (or `@recetario/stripe` for billing queries)
- [ ] All `import.meta.env` (server) replaced with `process.env` in packages
- [ ] `src/middleware.ts` imports from `@recetario/{db,auth,billing}` — no direct `@/lib/*` for extracted modules
- [ ] Vercel deploy succeeds with root directory set to `apps/web/`
- [ ] Vercel build command updated to `pnpm turbo run build --filter=web` (or equivalent)
- [ ] All existing tests pass (currently no test infrastructure per AGENTS.md — verify build/lint/typecheck)
- [ ] No regression in any user-facing flow: sign-in, sign-up, password reset, recipe CRUD, ingredient CRUD, production, billing, settings

## User Stories

- As a developer, I want my CI to only rebuild what changed so PR feedback is fast.
- As a developer, I want clear package boundaries so I know exactly where to add a new feature (db query? auth check? UI primitive?).
- As a developer joining the team, I want to understand the architecture from the package layout, not by reading every file.
- As a code owner, I want per-package ownership so I can review only what's relevant to my domain.
- As a future mobile/admin team, I want to reuse `@recetario/db` and `@recetario/auth` without copying code.

## Approaches Considered

### Approach A: Foundation + spike + iteration (RECOMMENDED, chosen)

**Description**: Build in 6 phases, each mergeable independently:
1. **Phase 0 — Foundation**: Move to `apps/web/`, add `pnpm-workspace.yaml` packages, install Turborepo, configure Vercel root. Verify deploy.
2. **Phase 1 — UI spike**: Extract `Button.astro` to `packages/ui/` as proof-of-concept. Validate it compiles + renders correctly. If success → Phase 2-3 extract all UI. If fail → skip `packages/ui/`, keep UI in `apps/web/`.
3. **Phase 2 — Config + types packages**: Create `packages/config/` (tsconfig base, eslint base, prettier base) and `packages/types/` (empty initially, populate incrementally).
4. **Phase 3 — DB package**: Move `prisma/` to `packages/db/prisma/`. Move `src/lib/prisma.ts` + `src/lib/db/*` (except `billing.ts`) + `src/lib/cache.ts` to `packages/db/src/`. Update all imports. Update Prisma output path.
5. **Phase 4 — Auth package**: Move `src/lib/{auth, auth-client, csrf, csrf-client, password-validation, password-reset, sign-in, sign-out}.ts` to `packages/auth/src/`. Wire `apps/web/middleware.ts` to import from `@recetario/auth`. API abuse protection is deferred to a future design.
6. **Phase 5 — Billing package**: Move `src/lib/{stripe, subscription, plans-config, formatters}.ts` + `src/lib/db/billing.ts` to `packages/stripe/src/`. Update 4 import sites (middleware, checkout, portal, webhook).

**Pros**: Each phase is a small PR. Easy rollback. UI spike de-risks the most uncertain piece.

**Cons**: More PRs to manage. 6 deploys to validate.

### Approach B: Big-bang

**Description**: One PR with all 6 packages, all file moves, all import updates, Vercel config change.

**Pros**: Faster end-to-end.

**Cons**: Hard to review (200+ file changes), hard to rollback if any step fails, high blast radius.

### Approach C: Physical split (rejected)

**Description**: Split into `apps/web` (Astro) + `apps/api` (Hono/Fastify) + shared packages. Two deploys.

**Pros**: Independent scaling. Cleaner separation.

**Cons**: Adds HTTP fetch from Astro to API (latency). Duplicate deploy config. Duplicate env vars. Premature for current scale. Not aligned with user direction.

## Design

### Architecture

**Before** (current):
```
recetario/
├── prisma/                # Schema + migrations + seed
├── src/
│   ├── lib/               # 30+ files: db/, auth, stripe, prisma, etc.
│   ├── components/        # 22 app components + 8 UI primitives
│   ├── pages/             # 17 pages + 9 API routes
│   ├── middleware.ts
│   ├── styles/global.css
│   └── ...
├── astro.config.mjs
├── tsconfig.json
└── pnpm-workspace.yaml    # only allowBuilds
```

**After** (target):
```
recetario/
├── apps/
│   └── web/                          # Astro app
│       ├── src/
│       │   ├── lib/                  # Only web-specific helpers (form-utils, etc.)
│       │   ├── components/           # Only app components (Recipe*, Production*, etc.)
│       │   ├── pages/                # All pages + API routes stay
│       │   ├── middleware.ts         # Astro-bound, stays
│       │   ├── styles/global.css     # App-specific CSS (animations, custom)
│       │   └── env.d.ts
│       ├── astro.config.mjs
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   ├── config/                       # Shared tsconfig + eslint + prettier
│   │   ├── tsconfig.base.json
│   │   ├── eslint.base.cjs
│   │   └── package.json
│   ├── types/                        # Shared TS types (initially empty)
│   │   ├── src/index.ts
│   │   └── package.json
│   ├── db/                           # Prisma + data access
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   ├── migrations/
│   │   │   ├── seed.ts
│   │   │   ├── fix-failed-migration.ts
│   │   │   └── fix-sequences.ts
│   │   ├── generated/                # Prisma client output (gitignored)
│   │   ├── src/
│   │   │   ├── index.ts              # barrel
│   │   │   ├── prisma.ts             # PrismaClient singleton
│   │   │   ├── cache.ts
│   │   │   ├── helpers.ts
│   │   │   ├── types.ts              # data shapes
│   │   │   ├── ingredients.ts
│   │   │   ├── recipes.ts
│   │   │   ├── presentations.ts
│   │   │   ├── preferences.ts
│   │   │   └── audit.ts
│   │   └── package.json
│   ├── auth/                         # Better Auth + CSRF + password
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── auth.ts
│   │   │   ├── auth-client.ts
│   │   │   ├── csrf.ts
│   │   │   ├── csrf-client.ts
│   │   │   ├── password-validation.ts
│   │   │   ├── password-reset.ts
│   │   │   ├── sign-in.ts
│   │   │   └── sign-out.ts
│   │   └── package.json
│   ├── billing/                      # Stripe + subscription + plans
│   │   ├── src/
│   │   │   ├── index.ts
│   │   │   ├── stripe.ts
│   │   │   ├── subscription.ts
│   │   │   ├── plans-config.ts
│   │   │   ├── formatters.ts
│   │   │   └── billing.ts            # moved from src/lib/db/billing.ts
│   │   └── package.json
│   └── ui/                           # Astro components + CSS tokens (if spike passes)
│       ├── src/
│       │   ├── index.ts              # barrel of .astro exports
│       │   ├── tokens.css            # @theme block from global.css
│       │   ├── accent-colors.ts
│       │   ├── dialog.ts
│       │   ├── loading-overlay.ts
│       │   ├── password-toggle.ts
│       │   ├── Button.astro
│       │   ├── Card.astro
│       │   ├── Input.astro
│       │   ├── Badge.astro
│       │   ├── Dialog.astro
│       │   ├── FinancialSummary.astro
│       │   ├── SectionHeading.astro
│       │   └── PasswordInput.astro
│       └── package.json
├── turbo.json
├── pnpm-workspace.yaml               # packages: ['apps/*', 'packages/*']
├── package.json                      # workspace root, scripts delegate via turbo
├── tsconfig.json                     # extends packages/config/tsconfig.base.json
├── .eslintrc.cjs                     # extends packages/config/eslint.base.cjs
└── .prettierrc.json                  # extends packages/config/prettier.base.json
```

### Flow Analysis

For every flow affected by the refactor, the spec traces the actual code:

#### Flow 1: Application boot (middleware)

**Before** (`src/middleware.ts:1-100`):
1. Imports: `auth`, `db/billing`, `subscription`, `cache`, `csrf`, `audit`, `prisma` (7 modules from `src/lib/`)
2. `onRequest` populates `Astro.locals.{user, session, subscription, csrfToken}` for every request
3. Cache check on subscription: 60s TTL via `cacheGet('subscription:...')` → `cacheSet(...)` if miss
4. Audit log on auth events

**After** (Phase 4 complete, `apps/web/src/middleware.ts:1-100`):
1. Imports: `@recetario/auth` (betterAuth, csrf helpers), `@recetario/stripe` (getUserSubscription, seedSubscriptionPlans), `@recetario/db` (audit, cache) — same 7 logical concerns, but from packages
2. Same `onRequest` logic, identical Astro.locals population
3. Cache still Prisma-backed (in `@recetario/db`), accessed via `@recetario/db`
4. Same audit logging

**Design implication**: Middleware becomes a thin orchestration layer. Each package owns one concern. Easier to test middleware in isolation with package mocks.

#### Flow 2: Page render (e.g., `recipes/[recipe].astro`)

**Before**:
1. Frontmatter: `if (!Astro.locals.session) return Astro.redirect("/sign-in")`
2. Data fetch: `import { getRecipeWithIngredients } from "@/lib/db/recipes"` (barrel)
3. Subscription check: `hasFeature(Astro.locals.subscription, "production_planner")` from `@/lib/subscription`
4. Template renders UI: `import { FinancialSummary } from "@/components/ui"`
5. Form handler: `Astro.request.formData()`, `parseNumberInput()`, `validateCsrf()`, then call `@/lib/db/recipes` mutators

**After**:
1. Frontmatter: `if (!Astro.locals.session) return Astro.redirect("/sign-in")` (unchanged)
2. Data fetch: `import { getRecipeWithIngredients } from "@recetario/db"`
3. Subscription check: `import { hasFeature } from "@recetario/stripe"`
4. Template renders UI: `import { FinancialSummary } from "@recetario/ui"` (if spike passes) OR `"@/components/ui"` (if spike fails)
5. Form handler: `parseNumberInput()` (web-local), `validateCsrf()` from `@recetario/auth`, call `@recetario/db` mutators

**Design implication**: Import paths change everywhere. Mechanical refactor, no logic change. CSRF stays in `@recetario/auth` because it crosses auth + session concerns.

#### Flow 3: Stripe webhook (signature verification)

**Before** (`src/pages/api/stripe/webhook.ts`):
1. `APIRoute` POST handler
2. Read raw body via `request.text()` (Astro-specific)
3. Verify Stripe signature: `stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET || import.meta.env.STRIPE_WEBHOOK_SECRET)`
4. Switch on event type → call `db/billing` mutators (`createOrUpdateSubscription`, etc.)

**After** (`apps/web/src/pages/api/stripe/webhook.ts`):
1. `APIRoute` POST handler (unchanged, stays in apps/web)
2. Read raw body (unchanged)
3. Verify signature using `process.env.STRIPE_WEBHOOK_SECRET` only (Vercel sets this)
4. Switch on event → call `@recetario/stripe` mutators (moved from `db/billing`)

**Design implication**: Webhook stays in `apps/web` (uses APIRoute). Only the mutator import path changes.

#### Flow 4: Build pipeline (Turborepo)

**Before**:
- `pnpm install` → installs all deps
- `pnpm build` → `astro build` (one project)
- Vercel: builds whole project

**After**:
- `pnpm install` → pnpm workspaces, hoists to root `node_modules`
- `pnpm turbo run build` → builds each package in dep order (config → types → db → auth → billing → ui → web)
- Vercel: builds `apps/web/` which transitively builds deps
- `turbo.json` defines pipeline: `build`, `lint`, `type-check`, `test`
- Cache: Turborepo caches outputs in `node_modules/.cache/turbo`

**Design implication**: First build is same speed. Subsequent builds (CI, dev) only rebuild changed packages + dependents.

### Parallel Code Paths Enumerated

The refactor touches these parallel entry points (each must update):

**Stripe API routes (4 sites importing from `@/lib/db/billing`)**:
1. `apps/web/src/middleware.ts:3` — `import { getUserSubscription, seedSubscriptionPlans } from "@/lib/db/billing"` → `@recetario/stripe`
2. `apps/web/src/pages/api/stripe/checkout.ts:3` — `import { getPlanByStripePriceId, getStripeCustomerId } from "@/lib/db/billing"` → `@recetario/stripe`
3. `apps/web/src/pages/api/stripe/portal.ts:3` — `import { getUserSubscription } from "@/lib/db/billing"` → `@recetario/stripe`
4. `apps/web/src/pages/api/stripe/webhook.ts:4-9` — `import { createOrUpdateSubscription, cancelSubscription, markSubscriptionPastDue, seedSubscriptionPlans } from "@/lib/db/billing"` → `@recetario/stripe`

**Cache consumers (5 sites importing from `@/lib/cache`)**:
1. `src/lib/db/recipes.ts` → `@recetario/db`
2. `src/lib/db/ingredients.ts` → `@recetario/db`
3. `src/lib/db/presentations.ts` → `@recetario/db`
4. `src/lib/db/billing.ts` → `@recetario/stripe` (file itself moves to billing)
5. `src/middleware.ts` → `@recetario/db`

**Prisma direct imports (currently bypasses barrel, will be normalized)**:
1. `src/lib/auth.ts:4` — `import { prisma } from "@/lib/prisma"` → `import { prisma } from "@recetario/db"`
2. `src/lib/cache.ts` — moves to `@recetario/db/src/cache.ts`
3. API rate limiting is deferred until a replacement abuse-protection design is approved.
4. `src/lib/password-reset.ts` — moves to `@recetario/auth/src/password-reset.ts`, imports prisma from `@recetario/db`
5. `src/pages/api/auth/update-name.ts` — direct prisma import, update to `@recetario/db`

**UI components (8 files in `src/components/ui/`)**:
1. Button.astro — imports `Icon` from `astro-icon/components` (Astro-specific)
2. Card.astro
3. Input.astro
4. Badge.astro
5. Dialog.astro
6. FinancialSummary.astro
7. SectionHeading.astro
8. PasswordInput.astro

All 8 will move to `packages/ui/src/` if Phase 1 spike succeeds. `apps/web/src/components/` will lose the `ui/` subdirectory; app components (Recipe*, Production*, etc.) stay in `apps/web/src/components/`.

**DB module imports (8 files currently in `src/lib/db/`)**:
- `index.ts` (barrel) → `packages/db/src/index.ts` (re-exports all + prisma + cache)
- `types.ts` → `packages/db/src/types.ts` (data shapes)
- `helpers.ts` → `packages/db/src/helpers.ts`
- `ingredients.ts` → `packages/db/src/ingredients.ts`
- `recipes.ts` → `packages/db/src/recipes.ts`
- `presentations.ts` → `packages/db/src/presentations.ts`
- `preferences.ts` → `packages/db/src/preferences.ts`
- `audit.ts` → `packages/db/src/audit.ts`
- `billing.ts` → `packages/stripe/src/billing.ts` (DIFFERENT package)

**Auth module imports (9 files currently in `src/lib/`)**:
- `auth.ts` → `packages/auth/src/auth.ts`
- `auth-client.ts` → `packages/auth/src/auth-client.ts`
- `csrf.ts` → `packages/auth/src/csrf.ts`
- `csrf-client.ts` → `packages/auth/src/csrf-client.ts`
- `password-validation.ts` → `packages/auth/src/password-validation.ts`
- `password-reset.ts` → `packages/auth/src/password-reset.ts`
- `sign-in.ts` → `packages/auth/src/sign-in.ts`
- `sign-out.ts` → `packages/auth/src/sign-out.ts`

### Pages / Components

- **New packages** (none are user-facing pages):
  - `apps/web/` — already exists, just moves location
  - `packages/{config,types,db,auth,billing,ui}/` — internal
- **Modified**:
  - All `src/pages/**/*.astro` and `src/pages/api/**/*.ts` — import paths change
  - `src/middleware.ts` — import paths change
  - `astro.config.mjs` — alias path updates if needed (likely no change; alias still `@/ → ./src` in apps/web)
  - `tsconfig.json` (root) — extends `packages/config/tsconfig.base.json`

### Data Layer (Prisma)

- **Schema location**: `packages/db/prisma/schema.prisma` (moved from `prisma/`)
- **Client output path**: `output = "../generated/prisma"` (relative to new schema location, was `../generated/prisma` at root — same effective path)
- **Migrations**: `packages/db/prisma/migrations/` (6 existing + future)
- **Seed scripts**: `packages/db/prisma/seed.ts` + `seed-fixed-costs.ts` + `fix-sequences.ts` + `fix-failed-migration.ts`
- **PrismaClient singleton**: `packages/db/src/prisma.ts` (moved from `src/lib/prisma.ts`)
- **Barrel**: `packages/db/src/index.ts` re-exports `prisma`, `cache`, `helpers`, `types`, `ingredients`, `recipes`, `presentations`, `preferences`, `audit`
- **CRITICAL**: Every Prisma query in `@recetario/db` MUST include `where: { ownerId: ... }` (AGENTS.md invariant)
- **Destructive updates**: Recipe update `$transaction` deletes + re-creates `RecipeIngredient` — preserved
- **Composite PK**: `RecipeIngredient @@id([recipeId, ingredientId])` — preserved
- **Billing queries move to `@recetario/stripe`**: `getUserSubscription`, `seedSubscriptionPlans`, `getStripeCustomerId`, `getPlanByStripePriceId`, `createOrUpdateSubscription`, `cancelSubscription`, `markSubscriptionPastDue`, `syncPlansFromStripe`. They import `prisma` from `@recetario/db` and Prisma model types from `@recetario/db/generated/prisma`.
- **No circular dependency**: `billing` → `db` (one-way). `db` does not import from `billing`.

### Auth

- **Better Auth config**: `packages/auth/src/auth.ts` (moved). Imports: `@recetario/db` (for prisma), `@recetario/email` (or inline email for now), better-auth npm package.
- **Better Auth client**: `packages/auth/src/auth-client.ts`. Uses `process.env.BETTER_AUTH_URL` (standardized from `import.meta.env.PUBLIC_BETTER_AUTH_URL`).
- **Middleware (Astro)**: stays in `apps/web/src/middleware.ts`. Imports from `@recetario/auth` for `betterAuth` instance, `validateCsrf` for token check. Reads session from `Astro.locals.request` per Astro convention.
- **API handler**: `apps/web/src/pages/api/auth/[...all].ts` — calls `auth.handler(request)` from `@recetario/auth`.
- **API routes for password reset**: `apps/web/src/pages/api/auth/{reset-password,forgot-password}.ts` — import token logic from `@recetario/auth/src/password-reset`.
- **Env vars**: `BETTER_AUTH_URL`, `BETTER_AUTH_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (already in Vercel project).
- **Feature flags**: `hasFeature(subscription, 'key')` lives in `@recetario/stripe/src/subscription.ts`. Used by middleware and pages.

### Stripe / Billing

- **Routes**: `apps/web/src/pages/api/stripe/{checkout,portal,webhook}.ts` — stay in `apps/web` (use `APIRoute`).
- **Webhook secret**: `process.env.STRIPE_WEBHOOK_SECRET` (Vercel sets this).
- **Stripe client**: `packages/stripe/src/stripe.ts` (zero-dep, exports `stripe` singleton).
- **Subscription logic**: `packages/stripe/src/subscription.ts` (moved from `src/lib/subscription.ts`).
- **Plan config**: `packages/stripe/src/plans-config.ts` (FREE_FEATURES, Basic/Pro feature maps).
- **Billing data layer**: `packages/stripe/src/billing.ts` (moved from `src/lib/db/billing.ts`). Imports `prisma` from `@recetario/db` for subscription/subscriptionPlan model queries.
- **Env vars**: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*` (Vercel project).

### UI / UX

- **Strategy decision**: Phase 1 spike validates whether `.astro` components can live in a separate package. If yes → `packages/ui/` exists. If no → UI stays in `apps/web/src/components/ui/`, no `packages/ui/`.
- **If `packages/ui/` exists**:
  - Each component imports `Icon` from `astro-icon/components` (peerDep)
  - CSS tokens (`@theme` block) extracted to `packages/ui/src/tokens.css`
  - `apps/web/src/styles/global.css` becomes app-specific (animations, custom styles only); imports `@recetario/ui/tokens.css` at top
  - Tailwind config in `apps/web/astro.config.mjs` references token CSS via `@import`
  - Component barrel: `packages/ui/src/index.ts` re-exports all 8 .astro components
- **If `packages/ui/` does NOT exist**:
  - UI stays in `apps/web/src/components/ui/`
  - CSS tokens stay in `apps/web/src/styles/global.css`
  - All other packages still build via Turborepo
- **App components** (Recipe*, Production*, etc.) stay in `apps/web/src/components/` — they're app-specific
- **astro-icon allowlist**: stays in `apps/web/astro.config.mjs` (Vite plugin config is app-level)
- **All semantic tokens preserved** (no hardcoded colors, per AGENTS.md)

### Error Handling

- **No logic change**. Same error patterns:
  - DB queries return `null` for not-found, throw for constraint violations
  - Auth: Better Auth handles 401/403 responses
  - Stripe webhook: returns 400 on signature failure, 200 on success, retries on 500
  - API routes: return JSON `{ error: "..." }` for client errors, throw for server errors
  - Middleware: redirects to `/sign-in` if no session, `/settings/billing` if feature flag missing

### Invariants

The refactor MUST preserve these invariants (per AGENTS.md and explore findings):

1. **Recipe update is destructive**: `updateRecipe` in `@recetario/db/src/recipes.ts` must continue to use `$transaction` that deletes all `RecipeIngredient` rows then re-creates them. Code moves, semantics unchanged.

2. **Ingredient delete is blocked when referenced**: `deleteIngredient` returns `{ status: "blocked", recipes: [...] }` when `RecipeIngredient` references exist. Code moves, semantics unchanged.

3. **`RecipeIngredient` composite PK**: `@@id([recipeId, ingredientId])` preserved in schema.

4. **Every Prisma query includes `ownerId`**: AGENTS.md "CRITICAL" requirement. Verified by `design-system-verify` skill + reviewer. After refactor, queries live in `packages/db/src/*` and `packages/stripe/src/billing.ts`. Reviewer must audit both packages.

5. **`recipe.totalCost == sum(ingredient.cost)`** (existing data invariant, not modified by refactor).

6. **Feature flag tiers preserved**: `FREE_FEATURES` (12 keys, all false), Basic enables 5, Pro enables all 12. Logic unchanged. Code moves from `src/lib/subscription.ts` to `@recetario/stripe/src/subscription.ts`.

7. **Cache TTL unchanged**: 60s for subscription cache (`src/lib/cache.ts` semantics preserved in `@recetario/db/src/cache.ts`).

8. **CSRF token format unchanged**: hidden `_csrf` input on every form, validated server-side.

9. **Stripe webhook idempotency**: `createOrUpdateSubscription` upserts, not creates. Code moves, semantics unchanged.

10. **Spanish locale parsing**: `parseNumberInput(value)` for comma-to-dot conversion. Stays in `apps/web/src/lib/form-utils.ts` (UI-specific).

### Verification

After each phase, verify:
- `pnpm install` succeeds (no peer dep warnings)
- `pnpm turbo run build` builds all packages
- `pnpm turbo run lint` passes
- `pnpm turbo run type-check` passes
- `pnpm dev` works (`localhost:4321` serves correctly)
- Vercel deploy succeeds (preview deploy per phase, production at end)
- Manual smoke test: sign-in, recipe CRUD, billing flow, password reset
- Visual QA: render at desktop (1280px) + mobile (375px), per AGENTS.md

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| `.astro` components fail to compile in `packages/ui/` | High | Medium | Phase 1 spike with 1 component. If fails, skip `packages/ui/`, keep UI in `apps/web`. |
| Prisma client output path breaks type imports | High | Low | Update all `../../../generated/prisma/client.js` imports. Use barrel export from `@recetario/db`. |
| `db/billing.ts` move creates circular dep | High | Low | One-way: `billing` → `db`. `db` never imports from `billing`. Enforce in code review. |
| Vercel root directory change breaks deploy | High | Low | Preview deploy per phase. Roll back to old root if failure. |
| `import.meta.env` vs `process.env` causes env var loss | Medium | Medium | Standardize on `process.env` for server packages. Document in package README. |
| Active password reset branch needs rebase | Medium | Low | User decision: merge password reset to main FIRST, then start refactor. |
| Cache module creates wide dep surface | Medium | Low | All consumers (5) update import in single phase. Mechanical change. |
| Turborepo cache misses on first CI run | Low | High | First CI run is same as current. Subsequent runs get cache hits. |
| `seed-fixed-costs.ts` script path breaks | Low | Medium | Update package.json scripts to point to `packages/db/prisma/seed-fixed-costs.ts`. |
| Multiple workspaces slow down `pnpm install` | Low | Medium | pnpm workspaces are efficient (symlinks). Test with full install. |
| Vite alias `@/` breaks in package imports | Low | Low | `@/` alias only in `apps/web/`. Packages use workspace names. Verified. |
| `prisma generate` doesn't run on workspace install | Low | Medium | Add `postinstall` script in `packages/db/package.json` to run `prisma generate`. |

## Out of Scope

Explicitly NOT part of this refactor:

1. **Adding test infrastructure** — AGENTS.md says no test infrastructure exists. Don't add Vitest/Jest as part of this. (Per-package Vitest can be a follow-up.)
2. **Physical API split** — User decision: no separate `apps/api/`. All backend stays in Astro API routes.
3. **Second frontend** — No `apps/admin/` or `apps/mobile/`. Just `apps/web/`.
4. **Changesets / npm publishing** — Packages are internal-only. No need for versioning infrastructure. If we ever need to publish, add Changesets later.
5. **Nx migration** — User chose Turborepo. Not Nx.
6. **ESLint/Prettier config rewrites** — Extend `packages/config/*` from existing config. Don't rewrite rules.
7. **Renaming packages** — Use `@recetario/*` as the convention. No experiments with `@kitchcalc/*` etc.
8. **Better Auth upgrade** — Don't change Better Auth version as part of this refactor.
9. **Prisma version upgrade** — Don't change Prisma version.
10. **Migration of in-flight features** — Active password reset branch must merge BEFORE refactor starts. Active costos fijos just moves (no logic change).
11. **CSS restructure** — Only tokens move. Component-specific styles stay where they are. No Tailwind preset extraction unless spike shows it's trivial.
12. **Type-only package population** — `packages/types/` starts empty. Zod schemas are added incrementally as needed by future features, not as part of this refactor.

## Implementation Plan Reference

See `docs/plans/plan-20260620-1718-monorepo-refactor.md` (created in Phase 3) for the task breakdown, dependencies, and dispatch order.
