# Task T10: Middleware cleanup + final integration verification
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T6, T7, T8, T9 all completed (T6 + T8 + T9 with caveats)

## Goal

Verify the refactor is in a clean, consistent state. Resolve any leftover import issues, build errors, or pre-existing issues surfaced by the parallel task execution. Refactor `apps/web/src/middleware.ts` to be a thin orchestration layer (now possible since all packages are extracted). Add package READMEs. Run full verification suite.

## Context

T6, T7, T8, T9 all completed in parallel. Each reported PASS with caveats:
- T6: noted a "pre-existing" Prisma SSR build error
- T8: noted a Layout.astro `@/lib/accent-colors` import issue
- T9: same as T8

Because these tasks ran in parallel, their reports were based on intermediate state. Now that they're all complete, the actual state needs verification.

**Expected issues to resolve**:
1. **Layout.astro `@/lib/accent-colors` import** (single-quote): T6 says it fixed this, but T8/T9 reports (from before T6's fix) saw it broken. Verify it's actually fixed.
2. **Prisma SSR build error**: T6 reported `"webcrypto" is not exported by __vite-browser-external`. This might be a Vite/Prisma SSR config issue. Investigate and fix if persistent.
3. **ESLint/Prettier pre-existing breakage**: Not blocking refactor (T3 noted as pre-existing T1 residual). Document but don't fix.
4. **Middleware cleanup**: T8 updated middleware.ts to import from @recetario/* but it might still have some direct @/lib/* imports for non-extracted utilities.

**Middleware refactor**:
- `apps/web/src/middleware.ts` is currently a "god middleware" (touches 7 modules)
- After T7/T8/T9, most imports should be from `@recetario/*`
- Should be reduced to: auth, db (audit + cache), billing (subscription + plans), and Astro's APIContext
- Verify no remaining `@/lib/*` imports for extracted modules

**Package READMEs**:
- T7 created `packages/db/README.md` (per its task file)
- T8 created `packages/auth/README.md`
- T9 created `packages/billing/README.md`
- T6 should have created one for `packages/ui/` (verify)
- `packages/types/` and `packages/config/` don't have READMEs (low priority — they're placeholders)

## Task Scope

- **Type**: extends-existing
- **Pre-existing components**:
  - T6 output: full UI extraction
  - T7 output: db package
  - T8 output: auth package
  - T9 output: billing package
  - `apps/web/src/middleware.ts` (7 imports)
- **New deliverables**:
  - Fixed `apps/web/src/layouts/Layout.astro` if accent-colors import still broken
  - Fixed production build if Prisma SSR error persists
  - Cleaner `apps/web/src/middleware.ts` (thin orchestration)
  - Verified package READMEs
  - Full verification report
- **Dependencies**: T6, T7, T8, T9 all completed

## Skills Required

- **prisma-client-api**: For diagnosing Prisma SSR build error

## Files Involved

- `apps/web/src/middleware.ts` — read + refactor
- `apps/web/src/layouts/Layout.astro` — read + fix if accent-colors import still broken
- `apps/web/astro.config.mjs` — read + potentially add Vite SSR config
- `apps/web/vite.config.*` — may not exist; create if needed for Prisma SSR fix
- All package READMEs — verify exist

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `apps/web/src/middleware.ts` — modify (clean up imports, document orchestration role)
- [ ] `apps/web/src/layouts/Layout.astro` — modify (fix accent-colors import if still broken)
- [ ] `apps/web/astro.config.mjs` — modify (if Prisma SSR fix needed)
- [ ] `apps/web/vite.config.mjs` — new (if Prisma SSR fix needed)
- [ ] `packages/ui/README.md` — new (if T6 didn't create it)
- [ ] `packages/types/README.md` — new (optional, placeholder package)
- [ ] `packages/config/README.md` — new (optional, placeholder package)
- [ ] `docs/tasks/task-20260620-1718-builder-t10-middleware-final-report.md` — the report file (mandatory)

## Technical Steps

1. **Verify current state of Layout.astro**:
   ```bash
   grep -n "accent-colors" apps/web/src/layouts/Layout.astro
   ```
   - If still shows `@/lib/accent-colors`, fix to `@recetario/ui/accent-colors`
   - If shows `@recetario/ui/accent-colors`, it's fixed — proceed

2. **Verify production build**:
   ```bash
   pnpm turbo run build
   ```
   - If passes: great, no Prisma SSR issue
   - If fails on Prisma SSR: investigate and fix

3. **If Prisma SSR error persists**, diagnose:
   - Error: `"webcrypto" is not exported by "__vite-browser-external"`
   - Common fix: add `vite.ssr.noExternal: ['@prisma/client', '@prisma/adapter-pg']` to `astro.config.mjs`
   - Or: add `vite.optimizeDeps.exclude: ['@prisma/client']`
   - Or: add `vite.ssr.external: ['@prisma/client']`
   - The exact fix depends on Astro's Vite version

4. **Try the Prisma SSR fix** in `apps/web/astro.config.mjs`:
   ```js
   vite: {
     resolve: {
       alias: { "@/": path.resolve(__dirname, "./src") },
     },
     plugins: [tailwindcss()],
     ssr: {
       noExternal: ["@recetario/db", "@recetario/auth", "@recetario/billing", "@recetario/ui"],
     },
   },
   ```
   - This tells Vite to bundle these packages (don't try to use them as external at runtime)
   - May or may not work — try and see

5. **If Vite SSR config doesn't fix it**, try alternative:
   - Add `vite.ssr.external: ["@prisma/client", "@prisma/adapter-pg"]`
   - This tells Vite to NOT bundle these (use Node's require)
   - May resolve the webcrypto issue

6. **Run build again**:
   ```bash
   pnpm turbo run build
   ```
   - Should pass now (or surface another error to address)
   - If still fails, STOP and report to orchestrator with full error

7. **Verify dev server**:
   ```bash
   cd apps/web && timeout 15 pnpm dev
   ```
   - Should boot

8. **Verify astro check**:
   ```bash
   pnpm --filter @recetario/web astro check
   ```
   - 0 errors expected

9. **Refactor `apps/web/src/middleware.ts`** to be thin orchestration:
   - Should only import from `@recetario/*` (no direct @/lib/* for extracted modules)
   - Keep Astro-bound logic: `defineMiddleware`, `onRequest`, locals population
   - Move complex logic to package-level helpers if possible (e.g., `populateSessionLocals()`)
   - Add inline comments explaining what each step does

10. **Check for any remaining `@/lib/*` imports** for extracted modules:
    ```bash
    grep -rln "from \"@/lib/db" apps/web/src/  # Should return nothing (all moved)
    grep -rln "from \"@/lib/auth" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/stripe" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/subscription" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/cache" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/prisma" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/csrf" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/password" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/sign-in" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/sign-out" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/rate-limiter" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/formatters" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/plans-config" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/email" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/accent-colors" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/dialog" apps/web/src/  # Should return nothing (different from billing)
    grep -rln "from \"@/lib/loading-overlay" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/password-toggle" apps/web/src/  # Should return nothing
    grep -rln "from \"@/lib/production-calculator" apps/web/src/  # Should return SOMETHING (stays in apps/web)
    grep -rln "from \"@/lib/production-types" apps/web/src/  # Should return SOMETHING (stays)
    grep -rln "from \"@/lib/form-utils" apps/web/src/  # Should return SOMETHING (stays)
    ```
    - The last 3 should have results (they're app-specific, not extracted)
    - Everything else should return 0 files

11. **Verify package READMEs exist**:
    ```bash
    ls packages/db/README.md packages/auth/README.md packages/billing/README.md packages/ui/README.md 2>/dev/null
    ```
    - T7, T8, T9 should have created READMEs
    - T6 may or may not have created one for ui — verify
    - If any missing, create a simple one explaining the package

12. **Create `packages/ui/README.md`** if missing:
    - Purpose: Astro UI components + CSS tokens + utility helpers
    - Usage: `import { Button, Card, ... } from "@recetario/ui"`
    - Peer deps: astro, astro-icon
    - CSS tokens: `@import "@recetario/ui/tokens.css"`

13. **Create `packages/types/README.md`** (optional, placeholder):
    - Purpose: Shared TypeScript types (currently empty)
    - Future: Zod schemas, cross-package types

14. **Create `packages/config/README.md`** (optional, placeholder):
    - Purpose: Shared tsconfig, eslint, prettier bases
    - Usage: extend in package tsconfig.json

15. **Run full verification suite**:
    - `pnpm install` — workspaces resolve
    - `pnpm turbo run build` — all packages build
    - `pnpm --filter @recetario/web astro check` — type check
    - `pnpm --filter @recetario/web dev` (boots) — verify
    - `pnpm --filter @recetario/db exec prisma migrate status` — migrations current

16. **Document any unresolved issues** in the report:
    - If ESLint/Prettier still broken: note as pre-existing, not blocking
    - If any other issue persists: document with steps to reproduce

17. **Write report** to `docs/tasks/task-20260620-1718-builder-t10-middleware-final-report.md` with:
    - **Skills Used**: list (e.g., `prisma-client-api`)
    - **Layout.astro fix**: was it needed? What was done?
    - **Prisma SSR fix**: was it needed? What was done?
    - **Middleware refactor**: how it was simplified
    - **Remaining @/lib/* imports**: list of any (should only be app-specific helpers)
    - **Package READMEs**: status (created/verified)
    - **Build / check / dev**: all pass
    - **Pre-existing issues**: documented
    - **Issues encountered**: any + how resolved

## Expected Output

- **Code changes**:
  - `apps/web/src/middleware.ts` cleaned up
  - `apps/web/src/layouts/Layout.astro` fixed (if needed)
  - `apps/web/astro.config.mjs` updated (if Prisma SSR fix needed)
  - Any missing package READMEs created
- **Report**: `docs/tasks/task-20260620-1718-builder-t10-middleware-final-report.md`

## Guardrails

- **DO NOT** modify any package source code (db, auth, billing, ui) — this task is app-level cleanup
- **DO NOT** change any business logic
- **DO NOT** add new dependencies
- **DO NOT** commit changes
- **DO NOT** run `pnpm eslint .` or `pnpm format` (pre-existing T1 broken state)
- **DO NOT** fix ESLint/Prettier pre-existing issues (out of scope for this refactor)
- **MUST** verify the production build passes
- **MUST** verify dev server boots
- **MUST** verify no leftover `@/lib/*` imports for extracted modules
- **MUST** document all unresolved issues in the report
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If new files are needed, STOP and report.
- **Read discipline**: Max 15 file reads. Should be ~8 reads (middleware, Layout, astro.config, vite config, READMEs).
