# Analysis Report: Monorepo Refactor

Created: 2026-06-20 17:18
Orchestrator: orchestrator
Complexity: feature
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md (to be created)
Explore: docs/tasks/task-20260620-1718-explore-report.md

## Request Summary

Refactor KitchCalc (single Astro 6 SSR fullstack project) into a logical monorepo: `apps/web` (Astro) + `packages/{db,auth,billing,ui,types,config}`. Use pnpm workspaces + Turborepo. Stay single deploy (Vercel) — no physical API split.

User drivers: better code organization + better build performance. Team 3-5 people. No second frontend on the roadmap today.

## Target Location

**Primary anchor(s)** (full refactor — no single anchor):
- Root config: `pnpm-workspace.yaml`, `package.json`, `tsconfig.json`, `.eslintrc*`, `.prettierrc*`
- New: `apps/web/` (current Astro project moves here)
- New: `packages/db/`, `packages/auth/`, `packages/billing/`, `packages/ui/`, `packages/types/`, `packages/config/`
- Existing moved: `prisma/`, `src/lib/db/`, `src/lib/auth*.ts`, `src/lib/csrf*.ts`, `src/lib/rate-limiter.ts`, `src/lib/password-*.ts`, `src/lib/sign-in/out.ts`, `src/lib/stripe.ts`, `src/lib/subscription.ts`, `src/lib/plans-config.ts`, `src/lib/cache.ts`, `src/lib/db/billing.ts`, `src/lib/formatters.ts`, `src/components/ui/`, `src/styles/global.css` (tokens only), `src/lib/accent-colors.ts`, `src/lib/dialog.ts`, `src/lib/loading-overlay.ts`, `src/lib/password-toggle.ts`

**Layer**: build system + workspace config (foundation), then db, auth, billing, ui, types, config (extraction)

## Surrounding Context

**Current architecture (verified by kitchcalc-explore)**:
- Astro 6 SSR + `@astrojs/vercel` deploy. Single deploy target.
- pnpm 11.1.2 already used. `pnpm-workspace.yaml` exists but only with `allowBuilds` (no `packages:` key).
- 8 models in Prisma (Ingredient, Recipe, RecipeIngredient composite PK, RecipePresentation, RecipeFixedCost, PresentationFixedCost, plus 2 enums). All with `ownerId` for multi-tenancy.
- Prisma client output: `../generated/prisma` (non-standard, set in `schema.prisma:7`).
- 30+ files in `src/lib/`. Key modules: db barrel (8 files), auth, stripe, prisma, subscription, csrf, rate-limiter, cache, email, formatters.
- 8 UI primitives in `src/components/ui/` (`.astro` files). 22 app components. 17 pages. 9 API routes.
- Alias `@/ → ./src` in both `tsconfig.json` and `astro.config.mjs`.
- Tailwind 4 via `@tailwindcss/vite`. Semantic tokens defined in `src/styles/global.css` via `@theme`.
- 6 migrations applied. Most recent: `20260612233154_costos_fijos_avanzados` (RecipeFixedCost + PresentationFixedCost models).

**Active work in flight**:
- Branch `006-password-reset-flow` — Draft plan at `specs/006-password-reset-flow/plan.md`. Touches `src/lib/password-reset.ts`, `src/lib/password-validation.ts`, `src/pages/api/auth/{reset,forgot}-password.ts`, `src/pages/{forgot,reset}-password.astro`.
- Costos fijos avanzados: `analysis-20260612-143000-costos-fijos-avanzados.md`. Migration already applied. Files: `src/lib/db/{recipes,presentations,helpers,types}.ts`.

**Coupling map (key findings from explore)**:

| File | Imports | Used By |
|------|---------|---------|
| `src/lib/db/billing.ts` | prisma + cache + stripe + plans-config + formatters | middleware, 3 stripe API routes (4 parallel imports) |
| `src/lib/auth.ts` | prisma (direct, bypasses barrel) + email + password-* | middleware, 6 API routes |
| `src/middleware.ts` | auth, billing, subscription, cache, csrf, audit, prisma (7 modules) | — |
| `src/lib/cache.ts` | prisma (Prisma-backed CacheEntry table) | 5 consumers across db + middleware |
| `src/lib/rate-limiter.ts`, `src/lib/password-reset.ts` | prisma (direct) | auth, API routes |

**No circular dependencies** in current code. Refactor is feasible.

## Detected Tech Debt / Potential Refactors

1. **`db/billing.ts` cross-domain coupling** — imports stripe SDK. Belongs in `packages/billing/`, not `packages/db/`. **Must address during refactor.**
2. **`auth.ts` bypasses db barrel** — line 4 imports `prisma` directly. Refactor will normalize this.
3. **Prisma client in non-standard path** (`generated/prisma/`) — complicates the move. Update `schema.prisma:7` to relative path within `packages/db/`.
4. **`import.meta.env` vs `process.env` inconsistency** — `auth-client.ts` and `webhook.ts` use Vite env. Server packages should standardize on `process.env`.
5. **No Zod schemas** — validation scattered across `helpers.ts`, inline in db modules, client-side. `packages/types/` starts empty; incrementally add.
6. **`middleware.ts` god module** — 7 imports. Refactor improves this by giving it a single packages-based interface.
7. **`.astro` components in npm package** — risky pattern. Validate early with a minimal extraction before committing all 8 components.

## Graphify Findings

Graphify graph at `graphify-out/graph.json` is **not useful for this analysis**: 10,650 nodes from design tokens only, 0 edges. Contains color palettes, typography tokens, component specs — no code dependency graph. `kitchcalc-explore` fell back to `grep` indexed searches for all dependency analysis (10 grep queries). This is a known limitation of the current graph: it was built from design token docs, not from code.

**Action item**: Rebuild graphify with `--mode deep` on `src/` before any future dependency-aware analysis. For this refactor, grep was sufficient.

## Codebase Patterns to Follow

- **Page pattern**: Astro `.astro` with frontmatter + template. Auth guard: `if (!Astro.locals.session) return Astro.redirect("/sign-in")`. Forms: POST to same page, `Astro.request.formData()`, `parseNumberInput()`, CSRF via hidden `_csrf` input.
- **Data layer**: Prisma queries via `@/lib/db/*` barrel. Every query MUST include `where: { ownerId: ... }`. Direct `@/lib/prisma` access only for raw client.
- **Auth**: `Astro.locals.{user, session, subscription, csrfToken}` populated by `src/middleware.ts`. Better Auth singleton in `src/lib/auth.ts`.
- **UI**: `@/components/ui` barrel (Button, Card, Input, Badge, Dialog, FinancialSummary, SectionHeading, PasswordInput). Semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`). No hardcoded colors.
- **Forms**: POST to same page, `parseNumberInput()` for Spanish decimals, `showFeedback()` client-side DOM updates.
- **Client bindings**: `data-*-bound="1"` guards. Lifecycle on both `astro:page-load` and `astro:after-swap`.
- **Imports**: `import { Button } from "@/components/ui"`. `import { prisma } from "@/lib/db"`. Cross-package: will become `import { Button } from "@recetario/ui"`.

## Complexity Assessment

- **Decision**: **feature** (not ajuste)
- **Rationale**:
  - Multi-package extraction (6 new packages)
  - Build system change (Turborepo + workspaces)
  - All imports change (`@/lib/*` → `@recetario/*`)
  - Prisma client output path moves
  - New dependency boundaries (db ↔ auth ↔ billing)
  - Vercel deploy config change (root directory)
  - Requires spec (Phase 2) for design decisions
  - Cross-cuts active work (password reset in flight)

## Dependencies & Prerequisites

1. **Decide on UI package strategy** — extract `.astro` components into a separate npm package, or keep in `apps/web/`. Recommend validate first with a minimal extraction. Fallback: keep UI in `apps/web` (still monorepo, just no `packages/ui`).
2. **Decide on env var strategy** — `process.env` for server packages, `import.meta.env` only for Astro-specific (webhook, auth-client). Need env resolution layer for packages.
3. **Decide on `db/billing.ts` target** — recommended: move to `packages/billing/`. Updates import in 4 files (middleware, checkout, portal, webhook).
4. **Resolve password reset branch** — either merge `006-password-reset-flow` first, or coordinate rebase. Recommend merge first (lower risk).
5. **Turborepo install** — add as dev dep, create `turbo.json` with pipeline (`build`, `lint`, `type-check`, `test`).
6. **Vercel project config** — change root directory to `apps/web`. Build command to `pnpm --filter web build` or use turbo.
7. **Shared tsconfig/eslint/prettier** — create `packages/config/` with base configs. Each package extends.

## Past Related Work

- `docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md` — feature in flight, migration already applied
- `specs/006-password-reset-flow/plan.md` — Draft plan, branch `006-password-reset-flow`
- `docs/analysis/analysis-20260608-1200-agent-improvements.md` — orchestrator process improvements
- `docs/analysis/analysis-20260607-1630-orchestrator-anti-loop.md` — read discipline protocols
- `docs/analysis/analysis-20260607-1630-closer-agent-merge.md` — closer agent consolidation
- Prisma migration history: 6 migrations, all owned by `prisma/` directory (no migrations in any package yet)

## Explore Report Summary

Full coupling analysis at `docs/tasks/task-20260620-1718-explore-report.md`. Key conclusions:

- **Verdict: PASS with caveats** — refactor is feasible
- **Top risk**: `.astro` components in `packages/ui/` (HIGH severity)
- **Critical issue**: `db/billing.ts` cross-domain coupling (must split)
- **Foundation priority**: extract `packages/db/` first (everything depends on it)
- **Effort estimate**: 2-3 days extraction + 1 day validation/CI = ~4-6 days
- **Sequential order**: config → ui/billing(sans db) → db → auth → billing+db/billing → middleware cleanup

## Active Work Conflicts (must resolve before refactor)

### 1. Password Reset Flow (MEDIUM risk)

Branch `006-password-reset-flow` touches 6 files across `src/lib/` and `src/pages/api/auth/`. These are prime candidates for `packages/auth/`. If the refactor moves `password-reset.ts` and `password-validation.ts` to `packages/auth/`, the password reset branch will need rebase.

**Recommendation**: Complete and merge the password reset flow first. Then refactor. Lower coordination cost.

### 2. Costos Fijos Avanzados (LOW risk)

Migration `20260612233154_costos_fijos_avanzados` already applied. New models `RecipeFixedCost`, `PresentationFixedCost` added. Files updated: `src/lib/db/{recipes,presentations,helpers,types}.ts`. All these files move cleanly to `packages/db/` with no logic changes. The only verification needed: confirm the `advanced_costs` feature flag is properly enabled for Basic/Pro tiers.

**Recommendation**: No special handling needed. Verify feature flag state during refactor validation.

## Recommended Phase 2 Spec Topics

The spec should explicitly design:

1. **Package boundaries**: what lives where, who imports from whom, no circular deps
2. **`.astro` extraction strategy**: peerDeps on astro, package structure, CSS token sharing
3. **Prisma output path**: relative path within `packages/db/`, barrel exports
4. **Env var strategy**: `process.env` for server packages, `import.meta.env` for Astro-only
5. **`db/billing.ts` split**: which functions move, which stay, types ownership
6. **Cache placement**: `packages/db/src/cache.ts` with re-export from main barrel
7. **Vercel deploy config**: root directory, build command, env var scope
8. **Turborepo pipeline**: build/lint/typecheck/test tasks, dependency graph
9. **Active work timing**: password reset merge order vs refactor
10. **Testing strategy**: per-package Vitest setup, mock boundaries
