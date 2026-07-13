# Task T12: Operational validation
Agent: kitchcalc-validator
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T11 PASS (verified)

## Goal

Run the full operational validation suite. This is the final gate before the closer-analyze (T13). Verify:
- `pnpm install` works
- `pnpm turbo run build` (will fail — pre-existing Prisma SSR issue)
- `pnpm --filter @recetario/web astro check` (should pass)
- `pnpm --filter @recetario/web dev` (should boot)
- `pnpm --filter @recetario/db exec prisma migrate status` (should show all migrations applied)
- Visual QA on rendered pages (limited by no DATABASE_URL)

Give a clear PASS / PASS-with-caveats / FAIL verdict. Note that some failures are pre-existing (not introduced by the refactor).

## Context

T11 (semantic review) reported PASS. The refactor is structurally complete. The reviewer noted pre-existing issues:
- **Prisma SSR build error** (`"webcrypto" is not exported by "__vite-browser-external"`) — pre-existing before this refactor (verified by T10 via `git show HEAD:astro.config.mjs`)
- **ESLint/Prettier broken at root** — pre-existing T1 residual
- **11 astro check hints** — pre-existing (deprecated APIs, unused vars)

This task runs the operational checks and verifies what passes. The Prisma SSR build error should be confirmed as pre-existing (not a new regression) and the operational verdict should be PASS-with-caveats.

## Task Scope

- **Type**: validation
- **Pre-existing components**:
  - Complete refactor (T1-T11 done)
  - All packages, READMEs, configs in place
- **New deliverables**: report with operational verdict
- **Dependencies**: T11 PASS (verified)

## Skills Required

None. Operational checks only.

## Files Involved

- All configuration files (vercel.json, turbo.json, pnpm-workspace.yaml, package.json files)
- All package READMEs
- Modified source files (for spot-checks)

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `docs/tasks/task-20260620-1718-validator-t12-operational-report.md` — the report file (mandatory)

## Technical Steps

1. **Run `pnpm install`**:
   ```bash
   pnpm install
   ```
   - Should complete without errors
   - All workspace packages linked
   - Note time

2. **Run `pnpm turbo run build`**:
   ```bash
   pnpm turbo run build
   ```
   - **EXPECTED**: Will FAIL on pre-existing Prisma SSR error
   - Capture the full error output
   - Confirm the error is `"webcrypto" is not exported by "__vite-browser-external"` (the pre-existing issue, not a new one)
   - If the error is DIFFERENT (e.g., import path not found), it might be a NEW issue — flag this

3. **Run `pnpm --filter @recetario/web astro check`**:
   ```bash
   pnpm --filter @recetario/web astro check
   ```
   - Should report 0 errors, 0 warnings
   - 11 hints are expected (pre-existing)
   - Capture count

4. **Run `pnpm --filter @recetario/db exec prisma migrate status`**:
   ```bash
   pnpm --filter @recetario/db exec prisma migrate status
   ```
   - Should show all 7 migrations applied
   - No drift
   - Note: this command may fail if DATABASE_URL is not set — that's a different concern (operational, not refactor)
   - The migration FILES being in `packages/db/prisma/migrations/` is what matters for the refactor

5. **Run `pnpm --filter @recetario/web dev`** (boots):
   ```bash
   cd apps/web && timeout 15 pnpm dev
   ```
   - Should boot in <2s
   - The page may return 500 (DATABASE_URL not set in this validation env)
   - That's OK — the BOOT is what matters

6. **Run `pnpm --filter @recetario/web exec eslint .`**:
   - **EXPECTED**: Will FAIL on pre-existing T1 residual (deps only in apps/web, not root)
   - Capture error
   - Confirm it's the same pre-existing issue T3 documented

7. **Run `pnpm format`**:
   - **EXPECTED**: Will FAIL on pre-existing T1 residual (prettier not at root)
   - Capture error
   - Confirm it's the same pre-existing issue

8. **Visual QA — verify dev server can serve a page**:
   - Start dev server: `cd apps/web && pnpm dev &`
   - Wait for "ready"
   - `curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/`
   - Will likely return 500 (DATABASE_URL not set)
   - That's OK — the boot succeeded
   - Stop dev server: `kill $DEV_PID`

9. **Verify all 6 packages have valid package.json**:
   ```bash
   for pkg in db auth billing ui types config; do
     cat packages/$pkg/package.json | python3 -m json.tool > /dev/null 2>&1 && echo "$pkg: valid" || echo "$pkg: INVALID"
   done
   ```

10. **Verify workspace resolution**:
    ```bash
    ls -la apps/web/node_modules/@recetario/
    # Should show symlinks to packages/db, packages/auth, packages/billing, packages/ui
    ```

11. **Verify Turborepo cache**:
    ```bash
    ls -la node_modules/.cache/turbo/ 2>/dev/null
    # Should exist if any task has been cached
    ```

12. **Verify vercel.json is valid JSON**:
    ```bash
    cat vercel.json | python3 -m json.tool > /dev/null && echo "vercel.json: valid"
    ```

13. **Verify pnpm-workspace.yaml has packages**:
    ```bash
    cat pnpm-workspace.yaml
    # Should show packages: ['apps/*', 'packages/*']
    ```

14. **Spot-check one consumer file in each package**:
    - `apps/web/src/middleware.ts` — should use only @recetario/*
    - `apps/web/src/pages/api/stripe/webhook.ts` — should use @recetario/billing
    - `apps/web/src/pages/api/auth/[...all].ts` — should use @recetario/auth
    - `apps/web/src/pages/recipes/index.astro` — should use @recetario/db and @recetario/ui

15. **Compile summary**:
    - **PASS** checks: pnpm install, astro check, dev boot, prisma migrate status
    - **FAIL** checks (pre-existing): pnpm turbo run build (Prisma SSR), pnpm eslint, pnpm format
    - **Caveats**: DATABASE_URL not set (operational, not refactor)

16. **Decision**:
    - **PASS**: All new-introduced issues pass; pre-existing issues documented
    - **PASS-with-caveats**: Same as PASS, but with explicit list of pre-existing issues
    - **FAIL**: A NEW issue was found that wasn't pre-existing

17. **Write report** to `docs/tasks/task-20260620-1718-validator-t12-operational-report.md` with:
    - **Skills Used**: list (likely `none`)
    - **Operational checks**: results table
    - **Pre-existing failures documented**: list (Prisma SSR, ESLint, Prettier)
    - **Visual QA**: dev server boot + page response
    - **Package validation**: all 6 valid
    - **Workspace resolution**: symlinks verified
    - **Vercel config**: valid
    - **Turborepo**: pipeline verified
    - **Spot-checks**: 4 consumer files checked
    - **Decision**: PASS / PASS-with-caveats / FAIL
    - **Recommendation**: proceed to T13 (closer) or rework

## Expected Output

- **Report**: `docs/tasks/task-20260620-1718-validator-t12-operational-report.md` with operational verdict

## Guardrails

- **DO NOT** modify any code (this is validation only)
- **DO NOT** commit anything
- **DO NOT** trigger a Vercel deploy
- **DO NOT** attempt to fix the pre-existing Prisma SSR build error
- **DO NOT** attempt to fix the pre-existing ESLint/Prettier breakage
- **MUST** document all pre-existing failures with their root cause
- **MUST** confirm whether build/lint failures are pre-existing or new
- **MUST** verify dev server boots successfully
- **MUST** give a clear verdict
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Only create the report file. Nothing else.
- **Read discipline**: Max 15 file reads. Should be ~5 reads (configs + spot-checks).
