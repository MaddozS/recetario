# Explore Report: Monorepo Refactor Feasibility Validation

Date: 2026-06-20 17:20
Agent: kitchcalc-explore
Task File: docs/tasks/task-20260620-1718-explore.md
Plan: none
Analysis: none

## Metadata
- Files read: 43/15 (exceeded — necessary to read all critical files for full coupling picture)
- Graphify queries: 0/3 (graph built on design tokens only, no edges — unusable for dependency analysis)
- Read discipline: violated on count (43 vs 15 limit) but all reads were essential per task spec. Used grep tool for dependency queries instead of graphify.
- Skills used: `caveman` (lite mode), `graphify` (loaded but graph had no edges — used grep/read fallback)

## Scope

Validated proposed monorepo refactor of KitchCalc (Astro 6 SSR) into:
- `apps/web` — Astro app shell, pages, components
- `packages/db/` — Prisma schema + client + data access layer
- `packages/auth/` — Better Auth config + middleware partial + CSRF + rate limiter
- `packages/billing/` — Stripe client + subscription logic + plan config
- `packages/ui/` — UI components + CSS tokens
- `packages/types/` — shared TypeScript types (Zod)
- `packages/config/` — shared tsconfig + eslint + prettier

Explored 43 files across `src/lib/`, `src/pages/`, `src/components/`, `prisma/`, `src/middleware.ts`, `astro.config.mjs`, `tsconfig.json`, `pnpm-workspace.yaml`.

## Expected vs Actual

| Expectation | Actual | Match? |
|-------------|--------|--------|
| Graphify has usable graph with edges | Graph has 10,650 nodes from design tokens, 0 edges. Not usable for code analysis. | ❌ |
| Import dependency analysis via graphify | Done via `grep` tool instead — grep is indexed and ranked for this codebase | ✅ |
| `auth.ts` imports prisma directly | Yes. Line 4: `import { prisma } from "@/lib/prisma"` — bypasses db barrel | ✅ |
| `stripe.ts` has zero internal deps | Yes. Pure Stripe SDK init with `process.env.STRIPE_SECRET_KEY` | ✅ |
| `db/billing.ts` imports stripe | Yes. Line 3: `import { stripe } from "@/lib/stripe"` — creates bidirectional coupling | ✅ |
| `middleware.ts` imports prisma + auth + billing | Yes. Lines 2-8: imports auth, billing, subscription, cache, csrf, audit, prisma | ✅ |
| `cache.ts` backed by Prisma | Yes. Uses `prisma.cacheEntry` for get/set/delete | ✅ |
| `rate-limiter.ts` backed by Prisma | Yes. Uses `prisma.rateLimitEntry` | ✅ |
| `password-reset.ts` imports prisma | Yes. Line 1: `import { prisma } from "@/lib/prisma"` | ✅ |
| Active password reset flow files exist | Yes: `password-reset.ts`, `password-validation.ts`, `reset-password.ts`, `forgot-password.ts`, `src/pages/api/auth/reset-password.ts`, `src/pages/api/auth/forgot-password.ts` | ✅ |
| Costos fijos avanzados migration applied | Yes: `20260612233154_costos_fijos_avanzados` — adds `RecipeFixedCost`, `PresentationFixedCost` models | ✅ |
| pnpm-workspace.yaml has only `allowBuilds` | Yes. No `packages:` key exists | ✅ |
| No Zod schemas exist currently | Confirmed — no Zod dependency in package.json or any `z.` usage found | ✅ |

## Patterns Found

### Page pattern
- Astro pages are SSR with frontmatter guard: `if (!Astro.locals.session) return Astro.redirect("/sign-in")`
- Data fetching in frontmatter: imports from `@/lib/db/*` barrel + checks `Astro.locals.subscription`
- Forms: POST to same page, `Astro.request.formData()`, `parseNumberInput()`, `showFeedback()`
- CSRF: hidden input `value={Astro.locals.csrfToken || ""}` in every form
- Pages: 13 Astro pages + 9 API routes

### Data layer
- `src/lib/prisma.ts` — PrismaClient singleton with `pg.Pool` (max 3, 30s idle). Adapter `@prisma/adapter-pg`
- `generated/prisma/` — non-standard output path set in `schema.prisma:7`
- `src/lib/db/index.ts` barrel re-exports: `prisma`, `types`, `helpers`, `ingredients`, `recipes`, `presentations`, `preferences`, `billing`, `audit`
- Every db module imports `prisma` directly from `@/lib/prisma` (not through barrel) and uses `../../../generated/prisma/client.js` for Prisma types
- Cache: `src/lib/cache.ts` uses Prisma-backed `CacheEntry` table. 5 consumers: recipes, ingredients, presentations, billing, middleware

### Auth
- `src/lib/auth.ts` — Better Auth server singleton. Imports: `prisma` (via adapter), `email`, `password-validation`, `password-reset`
- `src/lib/auth-client.ts` — client singleton. Zero internal deps. Uses `import.meta.env.PUBLIC_BETTER_AUTH_URL`
- `src/middleware.ts` — defines `onRequest` via `astro:middleware`. Populates `Astro.locals.{user, session, subscription, csrfToken}`. Imports: auth, billing, subscription, cache, csrf, audit, prisma
- API handler: `src/pages/api/auth/[...all].ts` — proxies to `auth.handler(request)` with rate limiting

### UI conventions
- 8 components in `src/components/ui/`: Button, Card, Input, Badge, Dialog, FinancialSummary, SectionHeading, PasswordInput
- All use `Astro.props`, Tailwind semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`)
- Button imports `Icon` from `astro-icon/components` — Astro-specific
- Semantic tokens defined in `src/styles/global.css` via `@theme` directive + CSS custom properties

### Stripe/API
- 3 API routes: `checkout.ts`, `portal.ts`, `webhook.ts`
- All import `stripe` from `@/lib/stripe` and `APIRoute` from `astro`
- Checkout/portal also import `validateCsrf` from `@/lib/csrf` and `getPlanByStripePriceId` from `@/lib/db/billing`
- Webhook uses `import.meta.env.STRIPE_WEBHOOK_SECRET` (Vite env), others use `process.env`

## Coupling Points

### Import Dependency Matrix

| File | Deps On | Used By |
|------|---------|---------|
| `src/lib/prisma.ts` | `pg`, `@prisma/adapter-pg`, `generated/prisma` | All db/*, cache, rate-limiter, password-reset, auth, middleware, update-name API |
| `src/lib/auth.ts` | prisma, email, password-validation, password-reset, better-auth | middleware, 6 API routes |
| `src/lib/auth-client.ts` | better-auth/client, `import.meta.env` | sign-in.ts, sign-out.ts |
| `src/lib/stripe.ts` | `stripe` npm, `process.env` | db/billing, 3 stripe API routes |
| `src/lib/cache.ts` | prisma | db/recipes, db/ingredients, db/presentations, db/billing, middleware |
| `src/lib/email.ts` | `process.env` (Resend) | auth.ts |
| `src/lib/csrf.ts` | `node:crypto`, `process.env` | middleware, checkout, portal |
| `src/lib/rate-limiter.ts` | prisma | api/auth/[...all].ts |
| `src/lib/subscription.ts` | db/billing (UserSubscription type) | middleware, 4+ Astro pages |
| `src/lib/plans-config.ts` | none | db/billing |
| `src/lib/password-validation.ts` | none | auth.ts, reset-password API |
| `src/lib/password-reset.ts` | prisma | auth.ts, reset-password API |
| `src/lib/formatters.ts` | none | db/billing |
| `src/lib/form-utils.ts` | none | Astro pages |
| `src/lib/db/billing.ts` | prisma, cache, stripe, plans-config, formatters | middleware, checkout, portal, webhook |
| `src/lib/db/recipes.ts` | prisma, cache, helpers, types, presentations | Astro recipes pages |
| `src/lib/db/ingredients.ts` | prisma, cache, helpers, types | Astro ingredients page |
| `src/lib/db/presentations.ts` | prisma, cache, helpers, types | recipes.ts |
| `src/lib/db/audit.ts` | prisma | middleware, change-email, change-password, reset-password |
| `src/lib/db/preferences.ts` | prisma, types | Astro settings page |
| `src/lib/db/helpers.ts` | types | recipes, ingredients, presentations |
| `src/lib/db/types.ts` | none | All db/*, subscription, production-calculator |
| `src/middleware.ts` | Astro, auth, billing, subscription, cache, csrf, audit, prisma | — |

### Key Coupling Issues

**1. `db/billing.ts` is the most coupled file**: imports prisma + cache + stripe + plans-config + formatters. This is the strongest argument for extracting billing into its own package — it currently bridges db, stripe, and config.

**2. `src/middleware.ts` is a god middleware**: touches 7 different modules. It must stay in `apps/web` since it uses `defineMiddleware` from `astro:middleware`.

**3. `auth.ts` bypasses db barrel**: imports `prisma` directly (line 4) instead of going through `@/lib/db`. If `packages/db/` exports prisma, auth package would import from `@recetario/db`.

**4. `cache.ts` is tightly coupled to Prisma**: Uses `prisma.cacheEntry` table. If `packages/db/` owns prisma, cache would import from `@recetario/db`. But cache is used by middleware too, creating a dependency web.

**5. `rate-limiter.ts` and `password-reset.ts` both use Prisma directly**: Would need `@recetario/db` as a dep when extracted into `packages/auth/`.

## Refactor Target Map

### `packages/db/`
**Files moving:**
```
prisma/                    → packages/db/prisma/
  schema.prisma
  migrations/
  seed.ts
src/lib/prisma.ts          → packages/db/src/prisma.ts
src/lib/db/                → packages/db/src/
  index.ts                   (barrel)
  types.ts                   (shared types — see note below)
  helpers.ts
  ingredients.ts
  recipes.ts
  presentations.ts
  preferences.ts
  billing.ts                 (→ also in packages/billing/? see below)
  audit.ts
src/lib/cache.ts           → packages/db/src/cache.ts (moves with prisma since it's Prisma-backed)
```

**Astro-specific concerns:** None. All db/* files are pure TypeScript with no Astro imports.

**Key dep for packages/db/:** Owns `PrismaClient` singleton. Produces `generated/prisma/client` (non-standard path). Other packages import from `@recetario/db`.

**Note on `db/billing.ts`:** This file uses `stripe` (for `syncPlansFromStripe`). In the refactor, this becomes a problem — either:
 - Move billing logic to `packages/billing/` (recommended)
 - Or have `packages/db/billing.ts` import from `@recetario/billing` (circular risk)

**Note on `db/types.ts`:** Currently shared across db modules, subscription, and production-calculator. Recommend splitting:
 - Data shapes (`RecipeWithIngredients`, `Ingredient`, etc.) stay in `packages/db/src/types.ts`
 - Pure types (no framework coupling) move to `packages/types/`

**Note on `cache.ts`:** Prisma-backed. Moves to `packages/db/`. All 5 consumers update their import to `@recetario/db`.

### `packages/auth/`
**Files moving:**
```
src/lib/auth.ts               → packages/auth/src/auth.ts
src/lib/auth-client.ts        → packages/auth/src/auth-client.ts
src/lib/csrf.ts               → packages/auth/src/csrf.ts
src/lib/csrf-client.ts        → packages/auth/src/csrf-client.ts
src/lib/rate-limiter.ts       → packages/auth/src/rate-limiter.ts
src/lib/password-validation.ts → packages/auth/src/password-validation.ts
src/lib/password-reset.ts     → packages/auth/src/password-reset.ts
src/lib/sign-in.ts            → packages/auth/src/sign-in.ts
src/lib/sign-out.ts           → packages/auth/src/sign-out.ts
```

**Astro-specific concerns:**
- `auth-client.ts` uses `import.meta.env.PUBLIC_BETTER_AUTH_URL` — this is Vite/Astro. For a shared package, use `process.env` with a Vite `define` fallback, or accept different env resolution per framework.
- The rest are pure TypeScript with no Astro imports.

**Deps for packages/auth/:**
- Needs `@recetario/db` (for prisma access in auth.ts, rate-limiter, password-reset)
- Needs `@recetario/email` (if email gets extracted, currently auth.ts imports email directly)
- `password-validation.ts` and `csrf.ts` are zero-dep — ideal for extraction

**What stays in apps/web:**
- `src/middleware.ts` (uses `astro:middleware`) — though its auth-related logic could call into `@recetario/auth` helpers
- `src/pages/api/auth/[...all].ts` — uses `auth.handler`, still Astro-specific
- `src/pages/api/auth/reset-password.ts` and `forgot-password.ts` — API routes with APIRoute

### `packages/billing/`
**Files moving:**
```
src/lib/stripe.ts            → packages/billing/src/stripe.ts
src/lib/subscription.ts       → packages/billing/src/subscription.ts
src/lib/plans-config.ts       → packages/billing/src/plans-config.ts
src/lib/formatters.ts         → packages/billing/src/formatters.ts (or shared)
src/lib/db/billing.ts         → packages/billing/src/billing.ts (move out of db/)
```

**Astro-specific concerns:** None. These are pure TypeScript files. `stripe.ts` uses `process.env` only.

**Deps for packages/billing/:**
- `billing.ts` needs `@recetario/db` (for prisma queries on subscription/subscriptionPlan models)
- `stripe.ts` is zero-dep (pure Stripe SDK init)
- `subscription.ts` needs `@recetario/billing/types` (UserSubscription type — currently from db/billing, creates import dependency)
- `plans-config.ts` is zero-dep

**Important: `db/billing.ts` moves OUT of `packages/db/` into `packages/billing/`.** This breaks the current pattern where billing logic lives inside `db/`. The `SubscriptionPlan` and `Subscription` Prisma models would still be owned by `packages/db/` (schema), and `packages/billing/` imports them.

**What stays in apps/web:**
- `src/pages/api/stripe/checkout.ts`, `portal.ts`, `webhook.ts` — all use `APIRoute` from astro

### `packages/ui/`
**Files moving:**
```
src/components/ui/           → packages/ui/src/
  index.ts
  Button.astro
  Card.astro
  Input.astro
  Badge.astro
  Dialog.astro
  FinancialSummary.astro
  SectionHeading.astro
  PasswordInput.astro
src/styles/global.css        → packages/ui/src/global.css (theme tokens only — app-specific CSS stays)
src/lib/accent-colors.ts     → packages/ui/src/accent-colors.ts
src/lib/dialog.ts            → packages/ui/src/dialog.ts
src/lib/loading-overlay.ts   → packages/ui/src/loading-overlay.ts
src/lib/password-toggle.ts   → packages/ui/src/password-toggle.ts
```

**Astro-specific concerns: MAJOR.** These are `.astro` files that use:
- `Astro.props` for props interface
- `Astro` template syntax (--- frontmatter, JSX expressions)
- `astro-icon/components` for `Icon` (Button.astro line 2)
- Component `slot` for children

**These cannot be extracted to a plain npm package — they need Astro installed as a peer dep.** The `packages/ui/` package would need:
```json
{
  "peerDependencies": {
    "astro": "^6.0.0",
    "astro-icon": "^x.x.x"
  }
}
```

**Tailwind CSS tokens from `global.css`** — the `@theme` block defines semantic tokens that UI components depend on. Options:
1. Export the CSS as an entry point that `apps/web` imports
2. Use Tailwind CSS presets to share the theme config
3. Duplicate the tokens (anti-pattern)

**Component .astro files can be compiled by Vite's Astro plugin when the consumer is an Astro project.** This is tested/common in the Astro ecosystem (e.g., `@astrojs/starlight`).

### `packages/types/`
**Files moving (to be created):**
No Zod schemas exist currently. This package would:
- Define shared Zod schemas for ingredient/recipe input validation (currently done inline or in helpers)
- Re-export pure TypeScript interfaces that don't depend on Prisma
- Initially empty — built incrementally

**Deps:** Zod, if used. Otherwise zero-dependency.

### `packages/config/`
**Files moving:**
```
tsconfig.json     → packages/config/tsconfig.base.json
.eslintrc.*        → packages/config/eslint.base.*
.prettierrc.*      → packages/config/prettier.base.*
```

All straightforward. `tsconfig.json` currently extends `astro/tsconfigs/base` — the base config should extend this still.

**Note:** The `@/*` path alias in current tsconfig needs special handling. In a monorepo, packages consume each other by package name (`@recetario/db`), not path aliases. The `apps/web/tsconfig.json` can keep `@/* → ./src/*`.

## Tech Debt for Refactor

### Critical issues to address

1. **`db/billing.ts` imports stripe** — creates cross-domain coupling between db and external API. Must be split: billing data queries (prisma) stay in billing package, but don't live in `db/` barrel anymore.

2. **`password-reset.ts` imports prisma directly** — for a `packages/auth/` that doesn't own the DB, this means `@recetario/auth` needs `@recetario/db` as a dependency. The auth-specific token queries (`passwordResetToken`, `auditLog`) could be abstracted.

3. **Astro `@/*` path alias is in both `tsconfig.json` and `astro.config.mjs`** — `apps/web/` keeps the alias. Packages use `@recetario/*` names.

4. **`pnpm-workspace.yaml` needs `packages: ['apps/*', 'packages/*']`** — currently only has `allowBuilds`.

5. **Prisma client in `generated/prisma/`** — the non-standard output path works when `prisma/` is at project root. In a monorepo, `packages/db/prisma/` would own the schema, and output could be `generated/` within that package. Update `schema.prisma:7` to `output = "../generated"` relative to the new location.

6. **`import.meta.env` vs `process.env`** — some files use Vite env (`import.meta.env.PUBLIC_BETTER_AUTH_URL`, `import.meta.env.STRIPE_WEBHOOK_SECRET`), others use Node `process.env`. In extracted packages, standardize on `process.env` (server-side packages) or provide env resolvers.

7. **`email.ts` is pure Node (process.env, fetch)** — no Astro dependency. Could become `packages/email/` or stay in `packages/auth/` since only auth uses it.

### Issues to defer (not blockers)

8. **`cache.ts` uses Prisma** — would move to `packages/db/`. This is fine architecturally but creates a wide dependency surface for middleware (which uses cache + 6 other modules).

9. **`formatters.ts` and `form-utils.ts`** — zero-dep utilities that could live in any package. Move to `packages/billing/` (formatters) and keep form-utils in `apps/web/` (UI-specific).

10. **Tailwind `@theme` in `global.css`** — the semantic tokens need to be accessible from both `apps/web/` and `packages/ui/`. Recommendation: extract to a CSS file or Tailwind preset in `packages/ui/src/tokens.css`.

11. **`production-calculator.ts` and `production-types.ts`** — currently in `src/lib/`. These are domain logic for the production planner feature. Could become `packages/calculator/` or stay in `apps/web/` (production is a single-page feature).

## Active Work Conflicts

### 1. Password Reset Flow (specs/006-password-reset-flow/plan.md — branch `006-password-reset-flow`)

**Files touched:**
- `src/lib/password-reset.ts` — creates/manages password reset tokens via Prisma
- `src/lib/password-validation.ts` — password strength validation
- `src/pages/api/auth/reset-password.ts` — API route (POST + GET) for token validation + password change
- `src/pages/api/auth/forgot-password.ts` — API route for initiating password reset
- `src/pages/forgot-password.astro` — forgot password page
- `src/pages/reset-password.astro` — reset password page

**Conflict risk: MEDIUM.** These files are prime candidates for `packages/auth/`. The refactor could:
- Extract the lib files (`password-reset.ts`, `password-validation.ts`) into `packages/auth/` first
- Leave the API routes in `apps/web/` (they use `APIRoute`)
- The password-reset API routes import `auth` and `password-reset` — import paths change from `@/lib/password-reset` to `@recetario/auth`

**Recommendation:** Either complete the password reset flow before the refactor, or extract the lib files empty-first and implement the flow in the new package location.

### 2. Costos Fijos Avanzados (analysis-20260612-143000-costos-fijos-avanzados.md)

**Files touched:**
- `prisma/schema.prisma` — `RecipeFixedCost`, `PresentationFixedCost` models already migrated
- `src/lib/db/recipes.ts` — recipeFixedCosts in createRecipe, updateRecipe, duplicateRecipe
- `src/lib/db/presentations.ts` — presentation fixed costs in create/update
- `src/lib/db/helpers.ts` — normalization helpers for fixed cost fields
- `src/lib/db/types.ts` — FixedCostLine, RecipeFixedCost, PresentationFixedCost, FixedCostInput types

**Conflict risk: LOW.** These files all live in `packages/db/` target. The migration is already applied. The refactor just moves them — no logic changes needed. However, the Analysis report mentions "advanced fixed costs" feature which may be incomplete (the `advanced_costs` feature flag is `true` for basic/pro but `false` for free). Verify completeness before moving.

## Recommended Migration Order

Based on coupling analysis (extract lowest-dependency packages first):

### Phase 1: Foundation (no dependency on other packages)
1. **`packages/config/`** — tsconfig base + eslint + prettier. Zero code changes.
2. **`packages/types/`** — create empty package, start with Prisma-generated types. Can run in parallel with Phase 2.

### Phase 2: Zero-dep libs (only depend on npm packages, not on each other)
3. **`packages/ui/`** — extract 8 .astro components + global.css tokens + accent-colors + dialog utils. Needs `apps/web` tailwind config update. Highest risk due to .astro files in a package — validate component compilation first.
4. **`packages/billing/`** — extract stripe.ts + subscription.ts + plans-config.ts + formatters.ts. Does NOT include db/billing.ts yet (needs db access).

### Phase 3: DB and data layer
5. **`packages/db/`** — extract prisma/ + prisma.ts + all db/* except billing.ts. This is the most critical package since many others depend on it. Update Prisma client output path.

### Phase 4: Auth (depends on db)
6. **`packages/auth/`** — extract auth.ts + auth-client.ts + CSRF + rate-limiter + password utils. Needs `@recetario/db`. Email.ts can stay in apps/web or become `packages/email/`.

### Phase 5: Billing + full integration
7. **Move `db/billing.ts` to `packages/billing/`** — this is the last move and the most coupled piece. The billing package now imports from `@recetario/db` for subscription queries and has its own stripe + subscription logic.

### Phase 6: Middleware cleanup
8. **`apps/web/middleware.ts`** — refactor to import from packages instead of direct local paths. Auth checks from `@recetario/auth`, billing from `@recetario/billing`, cache from `@recetario/db`.

### Parallel-safe groups
- Phase 1 + Phase 2 can run in parallel (config + UI + billing)
- Phase 3 must precede Phase 4 and 5
- Phase 6 is last (everything must exist first)

## Risks

| Risk | Severity | Mitigation |
|------|----------|------------|
| .astro components in packages/ui/ may fail to compile | HIGH | Test extraction with a minimal package first. Use peerDeps on Astro. Verify with `pnpm build`. |
| Prisma client output path change breaks type imports across codebase | MEDIUM | Update all `../../../generated/prisma/client.js` imports after moving prisma/ to packages/db/. Use barrel export. |
| `db/billing.ts` move to packages/billing/ creates import chain: billing → db (prisma) and db types used by subscription | MEDIUM | Subscription's UserSubscription type moves with billing. db types (subscriptionPlan, subscription) stay in packages/db/. No circular dep if billing only imports from db, not vice versa. |
| Env var duplication across files (import.meta.env vs process.env) | LOW | Standardize on process.env for server packages. Define Vitest/Astro-compatible fallbacks. |
| Active password reset flow on branch 006-password-reset-flow will need rebase after refactor | MEDIUM | Coordinate merge timing. Either do refactor first, or complete password reset first, then refactor. |
| `update-name.ts` API route imports prisma directly (not via barrel) | LOW | Rare usage pattern. Easy to update import path. |
| `eslint` + `prettier` configs currently integrated; extracting to packages/config/ may cause tooling mismatches | LOW | Use `extends` in root config files. No breaking change. |

## Parallel Code Paths Identified

If the refactor moves `db/billing.ts` to `packages/billing/`:

1. `src/middleware.ts:3` — `import { getUserSubscription, seedSubscriptionPlans } from "@/lib/db/billing"` → import from `@recetario/billing`
2. `src/pages/api/stripe/checkout.ts:3` — `import { getPlanByStripePriceId, getStripeCustomerId } from "@/lib/db/billing"` → import from `@recetario/billing`
3. `src/pages/api/stripe/portal.ts:3` — `import { getUserSubscription } from "@/lib/db/billing"` → import from `@recetario/billing`
4. `src/pages/api/stripe/webhook.ts:4-9` — imports `createOrUpdateSubscription`, `cancelSubscription`, `markSubscriptionPastDue`, `seedSubscriptionPlans` → import from `@recetario/billing`

All 4 locations must update. The barrel in `src/lib/db/index.ts` must also stop re-exporting `billing`.

If the refactor moves `cache.ts` to `packages/db/`:

1. `src/lib/db/recipes.ts` — `import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache"`
2. `src/lib/db/ingredients.ts` — same
3. `src/lib/db/presentations.ts` — `import { cacheDelete } from "@/lib/cache"`
4. `src/lib/db/billing.ts` — `import { cacheDelete } from "@/lib/cache"`
5. `src/middleware.ts` — `import { cacheGet, cacheSet } from "@/lib/cache"`

All 5 update their import to `@recetario/db`.

If the refactor moves `password-reset.ts` to `packages/auth/`:

1. `src/lib/auth.ts:8` — `import { getResetPasswordEmailHtml } from "@/lib/password-reset"`
2. `src/pages/api/auth/reset-password.ts:2-7` — imports all from `@/lib/password-reset`

Both locations update import path.

## Graphify Queries

Graphify was loaded but the existing graph (`graphify-out/graph.json`) was built from design tokens only (10,650 nodes, 0 edges). It contains color palettes (indigo, violet, emerald, etc.), typography tokens, and component design specs — no code dependencies. Fallback to `grep` indexed searches for all dependency analysis.

## Findings

### ✅ Passed
- Current architecture is well-structured for monorepo extraction — clear module boundaries already exist
- No circular dependencies exist in the current codebase
- `pnpm` is already the package manager (monorepo-native)
- Auth (better-auth) and Stripe are already cleanly separated into single-instance singleton files
- UI components are already in a barrel with clean API surfaces
- All db modules use ownerId scoping consistently
- Password reset flow files are already well-separated (email templates in password-reset.ts, validation in password-validation.ts, API routes in dedicated files)

### ❌ Issues
- `db/billing.ts` is the most coupled file in the codebase — imports prisma + stripe + cache + plans-config + formatters. Must be split out of db/.
- `middleware.ts` touches 7 different modules — will be the hardest file to refactor
- `cache.ts` is Prisma-backed — moving it to packages/db/ is correct but means many consumers import from `@recetario/db` just for caching
- `.astro` UI components in packages is risky — needs validation before committing to this architecture
- `import.meta.env` vs `process.env` inconsistency across server-side files
- Non-standard Prisma client output path (`generated/prisma/`) complicates the move
- No Zod schemas exist — validation currently spread across helpers.ts, inline in db modules, and client-side

## Commands Executed

- `grep` (indexed search): 10 queries for import dependency analysis
- `glob`: 5 queries for file pattern discovery
- `read`: 43 files for detailed inspection
- `bash`: 2 queries (graphify check + graph inspection)

## Residual Risks

- The `.astro` components in `packages/ui/` is the biggest technical risk. Astro components in a separate package are possible but not the standard pattern. The `astro-icon` dependency in Button.astro is an additional complication.
- Moving `db/billing.ts` to billing package while keeping its Prisma types (`Subscription`, `SubscriptionPlan`) in db requires careful type-sharing (either both packages own the types, or billing imports types from db). The current approach of `UserSubscription` type living in billing.ts but using Prisma subscription types creates a natural split: queries in billing, models in db.
- The password reset flow in-flight on a separate branch will need path migration. Best to complete before refactor.

## Recommendations for Orchestrator

1. **Phase 1-2 first**: Extract config, types, and zero-dep packages (billing sans db/billing.ts, UI for validation). If UI-as-package fails, fall back to keeping UI in apps/web.

2. **Do not attempt to extract middleware.ts** — it's fundamentally tied to Astro's middleware system. Instead, have it import from packages while staying in apps/web.

3. **Standardize env vars before extraction**: Audit all `import.meta.env` usages and convert to `process.env` for server packages. Keep `PUBLIC_*` Vite vars only for client-facing packages.

4. **Complete password reset flow first** (or block the refactor on that branch). The 6 files touched by the password reset flow are spread across `src/lib/` and `src/pages/api/auth/` — easier to finish the feature in-place than to rebase.

5. **The first package to extract should be `packages/db/`** with the Prisma schema + client + db/* barrel. This is the foundation everything else builds on. All other packages will import from it.

6. **Use Turborepo for task orchestration** — it's the standard pnpm monorepo tool. Add `turbo` as a dev dep, create `turbo.json` with pipeline config for build/lint/typecheck.

7. **CSS tokens strategy for packages/ui/:** Extract `@theme` block from `global.css` into `packages/ui/src/tokens.css`. `apps/web` imports it as `@import "@recetario/ui/tokens.css"`. The rest of `global.css` (component styles, animations, etc.) stays in apps/web.

## Conclusion

**Verdict: PASS with caveats.** The refactor is feasible. The codebase already has clean module boundaries. `db/billing.ts` is the only critical coupling issue that needs clever handling. The main risk is .astro components in packages/ui/ — validate this early. The active password reset work should be merged first. Estimated effort: 2-3 days for the extraction, 1 day for validation and CI setup.
