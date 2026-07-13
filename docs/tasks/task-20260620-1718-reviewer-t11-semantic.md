# Task T11: Semantic review (ownerId audit + invariants)
Agent: kitchcalc-reviewer
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T10 PASS (verified)

## Goal

Audit the monorepo refactor for:
- **ownerId scoping on every Prisma query** (CRITICAL security invariant per AGENTS.md)
- **10 invariants preserved** (recipe destructive update, composite PK, feature flag tiers, etc.)
- **Naming consistency** (all packages use `@recetario/*`)
- **Import consistency** (no remaining `@/lib/*` for extracted modules)
- **Env var standardization**
- **No circular dependencies** (`billing` → `db` only, not vice versa)
- **No logic changes** (refactor is structural)
- **Package READMEs** documentation quality

Give a clear PASS/FAIL verdict. This is the semantic review gate before T12 (operational validation).

## Context

The monorepo refactor moved the codebase from a single Astro 6 SSR project to a pnpm workspaces + Turborepo structure with 5 active packages (db, auth, billing, ui) + 2 placeholders (types, config) + apps/web.

**Key facts**:
- T7 (db): all 8 data layer files + cache + prisma client moved to `packages/db/`
- T8 (auth): 9 auth files + email moved to `packages/auth/`
- T9 (billing): 5 files including the cross-domain `db/billing.ts` moved to `packages/billing/`
- T6 (UI): 7 components + 4 utilities + CSS tokens moved to `packages/ui/`
- T10 (cleanup): middleware refactored, READMEs created, leftover imports verified

**Pre-existing issues** (NOT introduced by this refactor):
- Prisma SSR build error (`"webcrypto" is not exported by "__vite-browser-external"`) — verified pre-existing via `git show HEAD:astro.config.mjs`
- ESLint/Prettier broken — pre-existing T1 residual
- 11 astro check hints (deprecated APIs, unused vars) — pre-existing

The reviewer should focus on what the refactor CHANGED, not on pre-existing issues.

## Task Scope

- **Type**: validation
- **Pre-existing components**:
  - All subagent reports: T1, T2, T3, T4, T5, T6, T7, T8, T9, T10
  - Modified code in apps/web and packages/*
- **New deliverables**: report with verdict
- **Dependencies**: T10 PASS (verified)

## Skills Required

- **prisma-client-api**: For ownerId scoping audit on Prisma queries
- **design-system-verify**: For UI consistency check

## Files Involved

**Files to read**:
- All 10 subagent reports (T1-T10)
- `docs/specs/2026-06-20-monorepo-refactor-design.md` (for invariants list)
- `docs/plans/plan-20260620-1718-monorepo-refactor.md` (for expected behavior)
- All Prisma query files in `packages/db/src/` and `packages/billing/src/`
- All `package.json` files in `packages/*/`
- Key consumer files in `apps/web/src/`

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `docs/tasks/task-20260620-1718-reviewer-t11-semantic-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skills**: `prisma-client-api`, `design-system-verify`

2. **Read all subagent reports** for context:
   - T1-T10 reports
   - Note any issues, decisions, residual risks

3. **Audit ownerId scoping** (CRITICAL — per AGENTS.md "CRITICAL" requirement):
   - For each query in `packages/db/src/*.ts` (ingredients, recipes, presentations, preferences, audit):
     - Verify `where: { ownerId: ... }` is present
     - Or the query is for an unauthenticated operation (e.g., seed scripts)
   - For each query in `packages/billing/src/billing.ts`:
     - Same check
   - For raw `prisma.*` calls in middleware or API routes:
     - Same check
   - Spot-check at least 10 queries across different files
   - If ANY query is missing ownerId, **FAIL** the review (security bug per AGENTS.md)

4. **Verify 10 invariants preserved** (from spec):
   1. **Recipe update is destructive**: `updateRecipe` uses `$transaction` to delete + recreate `RecipeIngredient`
   2. **Ingredient delete is blocked when referenced**: `deleteIngredient` checks for references
   3. **`RecipeIngredient` composite PK**: `@@id([recipeId, ingredientId])` in schema
   4. **Every Prisma query has ownerId**: already covered in step 3
   5. **`recipe.totalCost == sum(ingredient.cost)`**: data invariant, not modified by refactor
   6. **Feature flag tiers preserved**: `FREE_FEATURES` 12 keys, Basic 5, Pro 12
   7. **Cache TTL unchanged**: 60s for subscription cache
   8. **CSRF token format unchanged**: hidden `_csrf` input
   9. **Stripe webhook idempotency**: `createOrUpdateSubscription` upserts
   10. **Spanish locale parsing**: `parseNumberInput()` unchanged

5. **Verify naming consistency**:
   - All packages use `@recetario/*` prefix
   - No `kitchcalc/*` or other prefixes
   - Folder names match package names (kebab-case)

6. **Verify import consistency** (no leftover @/lib/* for extracted modules):
   ```bash
   grep -rln "from \"@/lib/db" apps/web/src/   # Should be 0
   grep -rln "from \"@/lib/auth" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/stripe" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/subscription" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/cache" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/prisma" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/csrf" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/password" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/sign-in" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/sign-out" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/rate-limiter" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/formatters" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/plans-config" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/email" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/accent-colors" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/dialog" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/loading-overlay" apps/web/src/  # Should be 0
   grep -rln "from \"@/lib/password-toggle" apps/web/src/  # Should be 0
   ```
   - All should return 0 files
   - Note: `production-calculator`, `production-types`, `form-utils` should still have results (they're app-specific)

7. **Verify no circular dependencies**:
   ```bash
   # billing should not import from auth, ui, types
   grep -rln "from \"@recetario/auth" packages/billing/src/  # Should be 0
   grep -rln "from \"@recetario/ui" packages/billing/src/  # Should be 0
   
   # db should not import from auth, billing, ui
   grep -rln "from \"@recetario/auth" packages/db/src/  # Should be 0
   grep -rln "from \"@recetario/billing" packages/db/src/  # Should be 0
   grep -rln "from \"@recetario/ui" packages/db/src/  # Should be 0
   
   # auth should not import from billing, ui
   grep -rln "from \"@recetario/billing" packages/auth/src/  # Should be 0
   grep -rln "from \"@recetario/ui" packages/auth/src/  # Should be 0
   
   # ui should not import from auth, db, billing
   grep -rln "from \"@recetario/auth" packages/ui/src/  # Should be 0
   grep -rln "from \"@recetario/db" packages/ui/src/  # Should be 0
   grep -rln "from \"@recetario/billing" packages/ui/src/  # Should be 0
   ```
   - Allowed: `db` is the foundation (other packages depend on it)
   - Allowed: `auth` can depend on `db`
   - Allowed: `billing` can depend on `db`
   - Disallowed: anything importing from siblings (no lateral deps)
   - Disallowed: `db` depending on anything

8. **Verify env var usage**:
   - Server packages (`packages/auth/src/auth.ts`, `packages/billing/src/stripe.ts`, etc.) use `process.env`
   - Client packages (`packages/auth/src/auth-client.ts`) use `import.meta.env.PUBLIC_*`
   - Document any inconsistencies

9. **Verify package READMEs exist and have content**:
   ```bash
   for pkg in db auth billing ui types config; do
     ls -la packages/$pkg/README.md 2>/dev/null || echo "MISSING: packages/$pkg/README.md"
     wc -l packages/$pkg/README.md 2>/dev/null
   done
   ```
   - Each README should have: purpose, usage, env vars (if any), peer deps

10. **Verify Vercel config** (T2):
    - `vercel.json` exists at root
    - Has `buildCommand`, `outputDirectory`, `installCommand`
    - Build command includes turbo filter for `@recetario/web`

11. **Verify Turborepo pipeline**:
    - `turbo.json` has `build`, `dev`, `lint`, `type-check`, `preview` tasks
    - `build` dependsOn `^build`
    - `dev` is cache: false, persistent: true

12. **Verify no logic changes** (sample audit):
    - Compare `apps/web/src/middleware.ts` (current) with what it was before T1
    - Use `git show HEAD:apps/web/src/middleware.ts` to see original
    - The middleware should be the same logic, just refactored imports
    - Spot-check 2-3 other key files

13. **Cross-check subagent reports for inconsistencies**:
    - T6 said "fix Layout.astro accent-colors" → T10 verified it's fixed
    - T8/T9 said "build fails on accent-colors" → T10 explained T6's fix was applied before T8/T9's reports
    - These are timing artifacts, not actual issues
    - Document in report

14. **Identify any NEW issues introduced by the refactor** (not pre-existing):
    - Read T10's report for "Issues Encountered" section
    - Note any issues that were introduced (vs pre-existing)

15. **Decision**:
    - **PASS** if all critical checks pass (ownerId, invariants, naming, imports, no circular deps)
    - **FAIL** if any critical issue is found
    - **PASS with caveats** if only non-critical issues (e.g., pre-existing build, ESLint, etc.)

16. **Write report** to `docs/tasks/task-20260620-1718-reviewer-t11-semantic-report.md` with:
    - **Skills Used**: list (e.g., `prisma-client-api`, `design-system-verify`)
    - **OwnerId audit**: results of 10+ spot checks
    - **Invariant audit**: 10 invariants, status of each
    - **Naming consistency**: findings
    - **Import consistency**: leftover @/lib/* for extracted modules (should be 0)
    - **Circular dependency check**: results
    - **Env var audit**: server vs client usage
    - **README audit**: 6 packages, status
    - **Vercel config audit**: T2 verification
    - **Turborepo pipeline audit**: T1 verification
    - **No-logic-changes audit**: 2-3 file comparisons
    - **Pre-existing issues**: documented
    - **NEW issues introduced**: list (if any)
    - **Verdict**: PASS / PASS with caveats / FAIL
    - **Recommendation**: proceed to T12 or rework

## Expected Output

- **Report**: `docs/tasks/task-20260620-1718-reviewer-t11-semantic-report.md` with detailed audit results and verdict

## Guardrails

- **DO NOT** modify any code (this is review only)
- **DO NOT** commit anything
- **DO NOT** run `pnpm eslint .` or `pnpm format` (pre-existing T1 broken state)
- **DO NOT** fix the Prisma SSR build error (pre-existing, out of scope)
- **MUST** audit at least 10 Prisma queries for ownerId scoping
- **MUST** verify all 10 invariants from spec
- **MUST** verify no circular dependencies between packages
- **MUST** give a clear PASS/FAIL/PASS-with-caveats verdict
- **MUST** document any NEW issues introduced by the refactor (vs pre-existing)
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Only create the report file. Nothing else.
- **Read discipline**: Max 15 file reads. Should be ~12 reads (10 subagent reports + spec invariants + a few code spot-checks).
