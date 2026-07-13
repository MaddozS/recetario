# Plan: Monorepo Refactor

Created: 2026-06-20 17:18
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Explore: docs/tasks/task-20260620-1718-explore-report.md

## Goal

Refactor KitchCalc from a single Astro 6 SSR fullstack project into a logical pnpm workspaces + Turborepo monorepo with `apps/web/` + `packages/{db,auth,billing,ui,types,config}/`. Single Vercel deploy. No physical API split. Preserve all functionality, invariants, and multi-tenant security (ownerId scoping).

## Acceptance Criteria

- [ ] `pnpm install` at root succeeds; workspaces resolve (`apps/*` + `packages/*`)
- [ ] `apps/web/` contains the current Astro project (src/, astro.config.mjs, public/, etc.)
- [ ] `pnpm-workspace.yaml` has `packages: ['apps/*', 'packages/*']` in addition to existing `allowBuilds`
- [ ] `turbo.json` defines pipeline for `build`, `lint`, `type-check`, `test`
- [ ] `packages/db/`, `packages/auth/`, `packages/billing/`, `packages/config/`, `packages/types/` exist with valid `package.json`
- [ ] `packages/ui/` exists IF UI spike (T5) passes; otherwise UI stays in `apps/web/src/components/ui/`
- [ ] All `import { prisma } from "@/lib/prisma"` replaced with `import { prisma } from "@recetario/db"` (or `@recetario/billing` for billing queries)
- [ ] All `import { ... } from "@/lib/db/*"` replaced with `import { ... } from "@recetario/db"`
- [ ] All `import { ... } from "@/lib/auth*"` replaced with `import { ... } from "@recetario/auth"`
- [ ] All `import { ... } from "@/lib/stripe"` + `@/lib/subscription` + `@/lib/plans-config` + `@/lib/db/billing` replaced with `@recetario/billing`
- [ ] `src/middleware.ts` imports only from `@recetario/*` (or `@/lib/*` for app-specific helpers like formatters)
- [ ] `prisma/schema.prisma` line 7 `output` is relative to new location (`packages/db/prisma/`)
- [ ] Vercel root directory = `apps/web/`; build command runs turbo
- [ ] `pnpm turbo run build lint type-check` passes for all packages
- [ ] `pnpm dev` works from root
- [ ] No `ownerId` regression — reviewer audits every Prisma query in `@recetario/db` and `@recetario/billing`
- [ ] No regression in: sign-in, sign-up, password reset, recipe CRUD, ingredient CRUD, production, billing, settings
- [ ] Visual QA: no visual regression at desktop (1280px) and mobile (375px)

## Analysis Summary

Key findings from `analysis-20260620-1718-monorepo-refactor.md`:

- **Current state**: Single Astro 6 SSR project, pnpm 11.1.2, Vercel deploy. `pnpm-workspace.yaml` exists but only with `allowBuilds`.
- **No circular deps** in current code. Refactor is feasible.
- **Most coupled file**: `src/lib/db/billing.ts` (imports prisma + stripe + cache + plans-config + formatters). Will move to `packages/billing/`.
- **`.astro` in npm package is risky** — Button.astro imports from `astro-icon/components`. Validate with 1-component spike (T5).
- **`middleware.ts` is Astro-bound** — stays in `apps/web/`. Refactor simplifies it.
- **Prisma client output non-standard** (`../generated/prisma`). Update on move.
- **Active work**: password reset branch (must merge first) + costos fijos migration (already applied, just moves).

## User Stories

- As a developer, I want my CI to only rebuild what changed so PR feedback is fast.
- As a developer, I want clear package boundaries so I know exactly where to add a new feature.
- As a developer joining the team, I want to understand the architecture from the package layout.
- As a code owner, I want per-package ownership so I can review only what's relevant to my domain.
- As a future mobile/admin team, I want to reuse `@recetario/db` and `@recetario/auth` without copying code.

## Design Rationale

**Why logical monorepo, not physical API split**: User scale (3-5 devs, single deploy target) doesn't justify the operational overhead of a separate API. Astro API routes cover all current needs. If a second frontend or API scale becomes critical, evaluate later.

**Why Turborepo over Nx**: Smaller learning curve, native pnpm support, less opinionated, sufficient for 5-7 packages. Nx's plugin ecosystem is overkill at this scale.

**Why 6 phases, not big-bang**: Each phase is a small PR. UI spike de-risks the most uncertain piece. Easy rollback if any phase breaks.

**Why move `db/billing.ts` to `packages/billing/`**: It's the only file that violates the "db is pure data access" principle. Moving it gives `packages/db/` a clean interface (queries + types + cache, no external SDKs).

**Why no test infrastructure in this refactor**: AGENTS.md says no test infra exists. Adding Vitest as part of a refactor mixes two concerns. Tests can be a follow-up per package.

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| `.astro` components fail to compile in `packages/ui/` | High | Medium | T5 spike with Button.astro. If fail, skip T6, keep UI in `apps/web/`. |
| Prisma client output path breaks type imports | High | Low | T7 updates `schema.prisma:7` to relative path within new location. Reviewer audits. |
| `db/billing.ts` move creates circular dep | High | Low | One-way: `billing` → `db`. `db` never imports from `billing`. Enforce in reviewer. |
| Vercel root directory change breaks deploy | High | Low | T2 verifies preview deploy. Roll back to old root if failure. |
| `import.meta.env` vs `process.env` causes env loss | Medium | Medium | T8 standardizes auth + auth-client. Vercel sets `process.env` for all. |
| Active password reset branch needs rebase | Medium | Low | User decision: merge password reset to main BEFORE starting T1. |
| Cache module creates wide dep surface | Medium | Low | T7 moves cache with prisma. 5 consumers update in single phase. |
| Turborepo cache misses on first CI run | Low | High | First CI is same speed. Subsequent get cache hits. Document. |
| `seed-fixed-costs.ts` script path breaks | Low | Medium | T7 updates `prisma/seed-fixed-costs.ts` path references. |
| Vite alias `@/` breaks in package imports | Low | Low | `@/` alias only in `apps/web/`. Packages use workspace names. Verified in spec. |
| Password reset branch not merged before refactor starts | High | Low | Orchestrator must confirm password reset merged before T1 dispatch. |

## Task Dependencies

| Task | Depends On | Parallel-Safe | Agent |
|------|------------|---------------|-------|
| T1: Foundation (workspaces + apps/web + Turborepo) | password reset merged to main | — | kitchcalc-builder |
| T2: Vercel config update | T1 | no | kitchcalc-builder |
| T3: Config + Types packages | T1 | yes (with T4) | kitchcalc-builder |
| T4: UI spike (Button.astro) | T1 | yes (with T3) | kitchcalc-builder |
| T5: UI spike validation (decision: continue or stop) | T4 | — | kitchcalc-validator |
| T6: Full UI extraction | T5 PASS | no | kitchcalc-builder |
| T7: DB package (prisma + data layer + cache) | T1 | yes (with T8, T9) | kitchcalc-builder |
| T8: Auth package | T7 | yes (with T9) | kitchcalc-builder |
| T9: Billing package | T7 | yes (with T8) | kitchcalc-builder |
| T10: Middleware cleanup + final integration | T7, T8, T9 | no | kitchcalc-builder |
| T11: Semantic review (ownerId audit, invariants) | T10 | no | kitchcalc-reviewer |
| T12: Operational validation (astro check, eslint, build, visual QA) | T11 PASS | no | kitchcalc-validator |
| T13: Post-implementation analysis | T12 | — | kitchcalc-closer-analyze |

Notes on parallel execution:
- T3 (config) and T4 (UI spike) can run in parallel — both only depend on T1
- T8 (auth) and T9 (billing) can run in parallel after T7 (db) — both depend on `@recetario/db` only
- T7 (db) must complete before T8 and T9 — auth and billing need `@recetario/db`
- No file is touched by multiple tasks in the same parallel group (no conflict risk)

## Tasks

### Task T1: Foundation (workspaces + apps/web + Turborepo)

- **Agent**: kitchcalc-builder
- **Skills**: `prisma-client-api` (for verifying prisma generate still works)
- **Summary**: Create pnpm workspaces config, install Turborepo, move current project to `apps/web/`, create empty placeholder packages.
- **Scope**: new + extends-existing
- **Pre-existing**: current single-project root (`package.json`, `pnpm-workspace.yaml`, `astro.config.mjs`, `tsconfig.json`, `src/`, `prisma/`, `public/`)
- **Dependencies**: password reset branch `006-password-reset-flow` merged to main

**File moves**:
- `src/` → `apps/web/src/`
- `prisma/` → stays at root for now (moves to `packages/db/prisma/` in T7)
- `public/` → `apps/web/public/`
- `astro.config.mjs` → `apps/web/astro.config.mjs`
- `tsconfig.json` → `apps/web/tsconfig.json`

**New files**:
- `apps/web/package.json` (move all current deps from root)
- Root `package.json` (workspaces, scripts delegate to turbo)
- `pnpm-workspace.yaml` (add `packages: ['apps/*', 'packages/*']` while keeping `allowBuilds`)
- `turbo.json` (pipeline: build, lint, type-check, test)
- `packages/{db,auth,billing,ui,types,config}/package.json` (empty placeholders, will be filled in later tasks)

**Modifications**:
- `apps/web/astro.config.mjs` — update alias path if needed (likely no change: `@/` → `path.resolve(__dirname, "./src")` still works)
- `apps/web/tsconfig.json` — same as astro config

**Acceptance**:
- `pnpm install` succeeds at root
- `pnpm turbo run build` builds apps/web successfully
- Vercel preview deploy works from new structure (verified in T2)

---

### Task T2: Vercel config update

- **Agent**: kitchcalc-builder
- **Skills**: none
- **Summary**: Update Vercel project settings to point to new structure. Verify preview deploy.
- **Scope**: extends-existing
- **Pre-existing**: Vercel project
- **Dependencies**: T1

**Changes**:
- Vercel project root directory: `apps/web`
- Vercel build command: `pnpm install && pnpm turbo run build --filter=web`
- (Cannot execute from orchestrator — kitchcalc-builder triggers via Vercel CLI or by pushing and observing)

**Acceptance**:
- Vercel preview deploy succeeds from new branch
- Build output matches pre-refactor (same `dist/` structure)

---

### Task T3: Config + Types packages

- **Agent**: kitchcalc-builder
- **Skills**: none
- **Summary**: Create `packages/config/` (shared tsconfig, eslint, prettier bases) and `packages/types/` (empty starter).
- **Scope**: new
- **Pre-existing**: root `tsconfig.json`, `.eslintrc.cjs`, `.prettierrc.json`
- **Dependencies**: T1

**New files**:
- `packages/config/tsconfig.base.json` (extends `astro/tsconfigs/base`, with path mappings for cross-package imports)
- `packages/config/eslint.base.cjs` (extends current eslint config, removes app-specific rules)
- `packages/config/prettier.base.json` (same as current)
- `packages/config/package.json` (name: `@recetario/config`, exports)
- `packages/types/src/index.ts` (placeholder export)
- `packages/types/package.json` (name: `@recetario/types`)

**Modifications**:
- `apps/web/tsconfig.json` — extends `@recetario/config/tsconfig.base.json`
- Root `.eslintrc.cjs` — extends `@recetario/config/eslint.base.cjs`
- Root `.prettierrc.json` — extends `@recetario/config/prettier.base.json`

**Acceptance**:
- `pnpm turbo run type-check` passes
- `pnpm eslint .` passes (no new errors vs. pre-refactor)
- `pnpm format` works (prettier resolves)

---

### Task T4: UI spike (Button.astro)

- **Agent**: kitchcalc-builder
- **Skills**: none
- **Summary**: Validate that `.astro` components can live in a separate package. Extract `Button.astro` as proof-of-concept.
- **Scope**: new + extends-existing
- **Pre-existing**: `apps/web/src/components/ui/Button.astro` (after T1)
- **Dependencies**: T1 (parallel with T3)

**New files**:
- `packages/ui/package.json` (name: `@recetario/ui`, peerDeps on `astro` and `astro-icon`)
- `packages/ui/src/Button.astro` (moved from `apps/web/src/components/ui/Button.astro`)
- `packages/ui/src/index.ts` (barrel: `export { default as Button } from "./Button.astro"`)

**Modifications**:
- `apps/web/src/components/ui/Button.astro` → delete (now in package)
- `apps/web/src/components/ui/index.ts` → re-export Button from `@recetario/ui` (or update all consumers)
- Find all `import { Button } from "@/components/ui"` in `apps/web/src/` and update to `import { Button } from "@recetario/ui"` (temporary — will be moved to barrel in T6)

**Acceptance**:
- `pnpm build` succeeds
- `pnpm astro check` passes
- Button renders identically at desktop + mobile (visual QA in T5)

---

### Task T5: UI spike validation (decision: continue or stop)

- **Agent**: kitchcalc-validator
- **Skills**: `design-system-verify`
- **Summary**: Run operational validation on the Button.astro spike. Make go/no-go decision for T6.
- **Scope**: validation
- **Pre-existing**: T4 output
- **Dependencies**: T4

**Operational checks**:
- `pnpm install` succeeds
- `pnpm turbo run build` succeeds
- `pnpm astro check` passes
- `pnpm eslint .` passes
- `pnpm dev` starts, Button renders on at least one page (e.g., `/recipes` or landing)
- Visual QA: Button renders identically to pre-spike at desktop (1280px) and mobile (375px)

**Decision**:
- **PASS**: continue to T6 (full UI extraction)
- **FAIL**: skip T6, keep UI in `apps/web/src/components/ui/`, document the failure for closer-analyze

**Report**:
- Save decision to `docs/tasks/task-20260620-1718-validator-ui-spike-report.md`

---

### Task T6: Full UI extraction (conditional on T5 PASS)

- **Agent**: kitchcalc-builder
- **Skills**: `design-system-verify` (for visual QA)
- **Summary**: Extract remaining 7 `.astro` UI components, CSS tokens, and supporting utils to `packages/ui/`. Update all consumers.
- **Scope**: extends-existing
- **Pre-existing**: T5 spike (Button.astro already in `packages/ui/`)
- **Dependencies**: T5 PASS

**File moves**:
- `apps/web/src/components/ui/{Card,Input,Badge,Dialog,FinancialSummary,SectionHeading,PasswordInput}.astro` → `packages/ui/src/`
- `apps/web/src/lib/accent-colors.ts` → `packages/ui/src/accent-colors.ts`
- `apps/web/src/lib/dialog.ts` → `packages/ui/src/dialog.ts`
- `apps/web/src/lib/loading-overlay.ts` → `packages/ui/src/loading-overlay.ts`
- `apps/web/src/lib/password-toggle.ts` → `packages/ui/src/password-toggle.ts`
- `apps/web/src/styles/global.css` (only the `@theme` block + CSS variables) → `packages/ui/src/tokens.css`

**New files**:
- `packages/ui/src/index.ts` (barrel: re-export all 8 components + utils)
- `packages/ui/README.md`

**Modifications**:
- `apps/web/src/styles/global.css` — remove `@theme` block, add `@import "@recetario/ui/tokens.css"` at top
- `apps/web/src/components/ui/index.ts` — delete (replaced by package barrel)
- All `import { ... } from "@/components/ui"` in `apps/web/src/` → `import { ... } from "@recetario/ui"`
- All `import { accentColors } from "@/lib/accent-colors"` → `import { accentColors } from "@recetario/ui"`
- `apps/web/astro.config.mjs` — keep `lucide` allowlist as-is (Vite plugin stays in app)

**Acceptance**:
- `pnpm turbo run build` succeeds
- `pnpm astro check` passes
- `pnpm eslint .` passes
- All 8 UI components render identically to pre-refactor at desktop + mobile (visual QA)
- No hardcoded colors introduced (semantic tokens preserved)

---

### Task T7: DB package (prisma + data layer + cache)

- **Agent**: kitchcalc-builder
- **Skills**: `prisma-client-api` (for prisma client setup, migrations, output path)
- **Summary**: Move `prisma/` to `packages/db/prisma/`, move `src/lib/db/*` (except `billing.ts`) and `src/lib/cache.ts` to `packages/db/src/`. Update all imports.
- **Scope**: new + extends-existing
- **Pre-existing**: `prisma/`, `src/lib/prisma.ts`, `src/lib/db/*` (8 files), `src/lib/cache.ts`
- **Dependencies**: T1 (parallel with T8, T9)

**File moves**:
- `prisma/schema.prisma` → `packages/db/prisma/schema.prisma` (update `output = "../generated/prisma"` — same effective path)
- `prisma/migrations/` → `packages/db/prisma/migrations/`
- `prisma/seed.ts` → `packages/db/prisma/seed.ts`
- `prisma/seed-fixed-costs.ts` → `packages/db/prisma/seed-fixed-costs.ts`
- `prisma/fix-sequences.ts` → `packages/db/prisma/fix-sequences.ts`
- `prisma/fix-failed-migration.ts` → `packages/db/prisma/fix-failed-migration.ts`
- `apps/web/src/lib/prisma.ts` (after T1) → `packages/db/src/prisma.ts`
- `apps/web/src/lib/db/{index,types,helpers,ingredients,recipes,presentations,preferences,audit}.ts` → `packages/db/src/` (NOT `billing.ts` — moves in T9)
- `apps/web/src/lib/cache.ts` → `packages/db/src/cache.ts`

**New files**:
- `packages/db/package.json` (name: `@recetario/db`, exports `./prisma/client` for types, main entry for runtime)
- `packages/db/README.md`

**Modifications** (all in `apps/web/src/`):
- `import { prisma } from "@/lib/prisma"` → `import { prisma } from "@recetario/db"`
- `import { ... } from "@/lib/db/ingredients"` etc. → `import { ... } from "@recetario/db"`
- `import { cacheGet, cacheSet, cacheDelete } from "@/lib/cache"` → `import { cacheGet, cacheSet, cacheDelete } from "@recetario/db"`
- Update `apps/web/package.json` postinstall to also run `pnpm --filter @recetario/db prisma generate`
- Update `prisma/seed.ts` path references (if hardcoded)
- `prisma/` directory at root → delete (now in package)

**Acceptance**:
- `pnpm install` succeeds
- `pnpm --filter @recetario/db prisma generate` produces client
- `pnpm --filter @recetario/db prisma migrate status` shows all migrations applied
- `pnpm turbo run build` succeeds
- `pnpm dev` works
- All DB queries return identical results to pre-refactor (manual smoke test: sign-in, recipe CRUD, ingredients)

---

### Task T8: Auth package

- **Agent**: kitchcalc-builder
- **Skills**: `better-auth-best-practices` (for Better Auth setup in a package context)
- **Summary**: Move Better Auth + CSRF + rate limiter + password utilities + sign-in/out to `packages/auth/`. Update middleware and API routes.
- **Scope**: new + extends-existing
- **Pre-existing**: `apps/web/src/lib/{auth, auth-client, csrf, csrf-client, rate-limiter, password-validation, password-reset, sign-in, sign-out}.ts`
- **Dependencies**: T7 (parallel with T9)

**File moves** (from `apps/web/src/lib/` to `packages/auth/src/`):
- `auth.ts`
- `auth-client.ts` (change `import.meta.env.PUBLIC_BETTER_AUTH_URL` to `process.env.BETTER_AUTH_URL` — Vercel sets this; document in README)
- `csrf.ts`
- `csrf-client.ts`
- `rate-limiter.ts` (imports prisma from `@recetario/db` instead of `@/lib/prisma`)
- `password-validation.ts`
- `password-reset.ts` (imports prisma from `@recetario/db`)
- `sign-in.ts`
- `sign-out.ts`

**New files**:
- `packages/auth/package.json` (name: `@recetario/auth`, deps: `@recetario/db`, `better-auth`)
- `packages/auth/src/index.ts` (barrel: re-export all)
- `packages/auth/README.md`

**Modifications** (in `apps/web/src/`):
- `middleware.ts` — `import { auth, ... } from "@/lib/auth"` → `import { auth, ... } from "@recetario/auth"`
- `pages/api/auth/[...all].ts` — `import { auth } from "@/lib/auth"` → `import { auth } from "@recetario/auth"`
- `pages/api/auth/reset-password.ts` — `import { ... } from "@/lib/password-reset"` → `import { ... } from "@recetario/auth"`
- `pages/api/auth/forgot-password.ts` — same
- `pages/sign-in.astro` — `import { signInWithGoogle } from "@/lib/sign-in"` → `import { signInWithGoogle } from "@recetario/auth"`
- `pages/sign-up.astro` — same if used
- `lib/sign-in.ts`, `lib/sign-out.ts` — delete (now in package)

**Acceptance**:
- `pnpm turbo run build` succeeds
- Sign-in flow works (Google OAuth)
- Sign-up works
- Password reset works (forgot-password → email → reset-password)
- Rate limiting still enforced
- CSRF tokens validate

---

### Task T9: Billing package

- **Agent**: kitchcalc-builder
- **Skills**: `stripe-best-practices`
- **Summary**: Move Stripe + subscription + plan config + formatters + `db/billing.ts` to `packages/billing/`. Update 4 import sites.
- **Scope**: new + extends-existing
- **Pre-existing**: `apps/web/src/lib/{stripe, subscription, plans-config, formatters}.ts`, `apps/web/src/lib/db/billing.ts`
- **Dependencies**: T7 (parallel with T8)

**File moves**:
- `apps/web/src/lib/stripe.ts` → `packages/billing/src/stripe.ts`
- `apps/web/src/lib/subscription.ts` → `packages/billing/src/subscription.ts`
- `apps/web/src/lib/plans-config.ts` → `packages/billing/src/plans-config.ts`
- `apps/web/src/lib/formatters.ts` → `packages/billing/src/formatters.ts`
- `apps/web/src/lib/db/billing.ts` → `packages/billing/src/billing.ts` (update `import { prisma } from "@/lib/prisma"` to `import { prisma } from "@recetario/db"`; update `import { stripe } from "@/lib/stripe"` to local relative)

**New files**:
- `packages/billing/package.json` (name: `@recetario/billing`, deps: `@recetario/db`, `stripe`)
- `packages/billing/src/index.ts` (barrel: re-export all)
- `packages/billing/README.md`

**Modifications**:
- `apps/web/src/middleware.ts` — `import { getUserSubscription, seedSubscriptionPlans } from "@/lib/db/billing"` → `import { getUserSubscription, seedSubscriptionPlans } from "@recetario/billing"`
- `apps/web/src/pages/api/stripe/checkout.ts` — `import { getPlanByStripePriceId, getStripeCustomerId } from "@/lib/db/billing"` → `import { getPlanByStripePriceId, getStripeCustomerId } from "@recetario/billing"`
- `apps/web/src/pages/api/stripe/portal.ts` — `import { getUserSubscription } from "@/lib/db/billing"` → `import { getUserSubscription } from "@recetario/billing"`
- `apps/web/src/pages/api/stripe/webhook.ts` — `import { createOrUpdateSubscription, cancelSubscription, markSubscriptionPastDue, seedSubscriptionPlans } from "@/lib/db/billing"` → `import { createOrUpdateSubscription, cancelSubscription, markSubscriptionPastDue, seedSubscriptionPlans } from "@recetario/billing"`
- `packages/db/src/index.ts` — remove `billing` re-export
- `apps/web/src/lib/db/index.ts` — delete (no longer needed; everything in `apps/web/src/lib/db/` moved)

**Acceptance**:
- `pnpm turbo run build` succeeds
- Stripe checkout flow works
- Stripe customer portal works
- Stripe webhook receives and processes events (checkout.session.completed, invoice.paid, etc.)
- Feature flag checks (`hasFeature(subscription, 'key')`) work
- Subscription caching works (60s TTL)

---

### Task T10: Middleware cleanup + final integration

- **Agent**: kitchcalc-builder
- **Skills**: none
- **Summary**: Refactor `apps/web/src/middleware.ts` to be a thin orchestration layer. Verify no leftover `@/lib/*` imports for extracted modules. Add package READMEs.
- **Scope**: extends-existing
- **Pre-existing**: T7, T8, T9 outputs
- **Dependencies**: T7, T8, T9

**Modifications**:
- `apps/web/src/middleware.ts` — keep only Astro-bound logic, import everything else from `@recetario/*`
- `apps/web/src/lib/` — keep only app-specific helpers (form-utils, dialog utils, etc. that didn't move to packages)
- Add README to each package (purpose, usage, env vars, exports)
- Update root `package.json` scripts: `dev`, `build`, `preview`, `format`, `astro`, `lint`, `type-check` all delegate to `pnpm turbo run ...` or `pnpm --filter web ...`
- Add per-package scripts: `lint`, `type-check`, `build` (for Turborepo)

**Verification (manual, before T11)**:
- `grep -r "from \"@/lib/db\"" apps/web/src/` returns no results
- `grep -r "from \"@/lib/auth" apps/web/src/` returns no results
- `grep -r "from \"@/lib/stripe\"" apps/web/src/` returns no results
- `grep -r "from \"@/lib/subscription\"" apps/web/src/` returns no results
- `grep -r "from \"@/lib/cache\"" apps/web/src/` returns no results
- `grep -r "from \"@/lib/prisma\"" apps/web/src/` returns no results

**Acceptance**:
- `pnpm turbo run build` succeeds
- `pnpm dev` works
- All previous flows still work (smoke test)
- No `@/lib/*` imports remain for extracted modules

---

### Task T11: Semantic review (ownerId audit + invariants)

- **Agent**: kitchcalc-reviewer
- **Skills**: `prisma-client-api` (for ownerId pattern check), `design-system-verify`
- **Summary**: Read all subagent reports + modified code. Audit ownerId scoping, invariants preservation, naming consistency.
- **Scope**: validation
- **Pre-existing**: T10 output
- **Dependencies**: T10

**Review checklist**:
- Every Prisma query in `@recetario/db` and `@recetario/billing` includes `where: { ownerId: ... }` (CRITICAL invariant from AGENTS.md)
- All 10 invariants from spec preserved (recipe destructive update, composite PK, feature flag tiers, cache TTL, CSRF format, etc.)
- Naming consistency: all packages use `@recetario/*` prefix
- Import consistency: no remaining `@/lib/db/*`, `@/lib/auth*`, `@/lib/stripe`, `@/lib/subscription`, `@/lib/cache`, `@/lib/prisma`
- Env var standardization: `process.env` for server packages, `import.meta.env` only for Astro-specific
- No circular dependencies: `billing` → `db`, not vice versa
- No logic changes: code moves only (per spec)
- Package READMEs document purpose, exports, env vars

**Report**: `docs/tasks/task-20260620-1718-reviewer-final-report.md`

**Decision**:
- **PASS**: proceed to T12
- **FAIL with blockers**: enter Phase 6b rework loop
- **FAIL with minor issues**: continue to T12 with documented issues

---

### Task T12: Operational validation

- **Agent**: kitchcalc-validator
- **Skills**: none (operational checks)
- **Summary**: Run all operational checks. Visual QA at desktop + mobile.
- **Scope**: validation
- **Pre-existing**: T11 PASS
- **Dependencies**: T11

**Operational checks**:
- `pnpm install` at root
- `pnpm turbo run build` (all packages)
- `pnpm turbo run lint` (all packages)
- `pnpm turbo run type-check` (all packages)
- `pnpm --filter web astro check`
- `pnpm --filter web eslint .`
- `pnpm dev` (verify it starts)
- `pnpm --filter @recetario/db prisma migrate status` (verify all migrations applied)

**Visual QA** (per AGENTS.md):
- Desktop (1280px): landing page, sign-in, recipes list, recipe detail, production, settings, billing
- Mobile (375px): same pages
- Mobile/desktop parity check: equivalent information at both breakpoints

**Report**: `docs/tasks/task-20260620-1718-validator-final-report.md`

**Decision**:
- **PASS**: proceed to T13
- **FAIL**: enter Phase 6b rework loop

---

### Task T13: Post-implementation analysis

- **Agent**: kitchcalc-closer-analyze
- **Skills**: none (read-only analysis)
- **Summary**: Read all reports, plan, spec, modified code. Suggest improvements to agents, skills, code patterns, processes. Detect cross-session patterns.
- **Scope**: read-only
- **Pre-existing**: T12 output
- **Dependencies**: T12

**Analysis**:
- What worked well in the refactor process
- What could be improved in kitchcalc-builder / kitchcalc-reviewer / kitchcalc-validator agents
- What could be improved in skills (prisma-client-api, better-auth-best-practices, stripe-best-practices, design-system-verify)
- Code patterns observed: any tech debt to address
- Process patterns: any orchestrator improvements
- Cross-session patterns: any recurring issues from historical analyses

**Report**: `docs/tasks/task-20260620-1718-closer-analyze-report.md`

**Decision**:
- User reviews top-3 suggestions
- User approves which to apply
- Approved improvements → separate mini cycle (Phase 7b)

---

## Retrospective

To be filled by orchestrator after Phase 7 (closer analyze).

- **Total rework iterations**: TBD
- **Most impactful task**: TBD
- **Most challenging task**: TBD
- **Time spent per phase**: TBD
- **Lessons learned**: TBD
- **Suggested agent/skill improvements**: TBD
