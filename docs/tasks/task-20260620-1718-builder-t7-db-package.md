# Task T7: DB package (prisma + data layer + cache)
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T1 (completed), parallel with T8 (auth) and T9 (billing)

## Goal

Move the Prisma schema, migrations, and seed scripts from `apps/web/prisma/` to `packages/db/prisma/`. Move `apps/web/src/lib/db/*` (except `billing.ts`) and `apps/web/src/lib/cache.ts` to `packages/db/src/`. Move `apps/web/src/lib/prisma.ts` to `packages/db/src/prisma.ts`. Update all imports across `apps/web/src/` from `@/lib/db`, `@/lib/cache`, `@/lib/prisma` to `@recetario/db`. Update Prisma client output path. Verify all DB operations work identically.

## Context

This is Phase 3 of the monorepo refactor. The DB package is the foundation that auth (T8) and billing (T9) depend on. After T7, `apps/web/src/lib/db/` should be empty (billing.ts is the only file left, which moves in T9). `apps/web/src/lib/prisma.ts` and `apps/web/src/lib/cache.ts` should be deleted (moved to package).

**Critical invariants to preserve** (from AGENTS.md and explore report):
- Every Prisma query includes `where: { ownerId: ... }` for multi-tenant scoping
- `RecipeIngredient` composite PK (`@@id([recipeId, ingredientId])`) preserved
- `updateRecipe` is destructive (`$transaction` deletes all `RecipeIngredient` then re-creates)
- `deleteIngredient` blocked when referenced
- Prisma client output path moves from `../generated/prisma` to relative path within new location

**Prisma client output path**:
- Current: `apps/web/prisma/schema.prisma` line 7: `output = "../generated/prisma"` → goes to `apps/web/generated/prisma/`
- New: `packages/db/prisma/schema.prisma` line 7: `output = "../generated/prisma"` → goes to `packages/db/generated/prisma/`
- Same effective relative path

**Import paths within db modules**:
- Current: `apps/web/src/lib/db/recipes.ts` imports `../../../generated/prisma/client.js` to reach `apps/web/generated/prisma/client.js` (3 levels up: db → lib → src, then to generated)
- New: `packages/db/src/recipes.ts` imports `../generated/prisma/client.js` to reach `packages/db/generated/prisma/client.js` (1 level up: src → packages/db, then to generated)
- **The import path changes from `../../../generated/prisma/...` to `../generated/prisma/...`**

## Task Scope

- **Type**: new + extends-existing
- **Pre-existing components**:
  - T1 output: `apps/web/prisma/` (schema, migrations, seed scripts)
  - T1 output: `apps/web/src/lib/db/` (8 files: index, types, helpers, ingredients, recipes, presentations, preferences, audit, billing)
  - T1 output: `apps/web/src/lib/cache.ts`, `apps/web/src/lib/prisma.ts`
  - T1 output: placeholder `packages/db/package.json`
- **New deliverables**:
  - `packages/db/prisma/` with schema, migrations, seed scripts
  - `packages/db/src/` with all 9 files (8 from db/ + cache + prisma.ts)
  - `packages/db/package.json` with peerDeps, exports
  - Updated `apps/web/package.json` (add `@recetario/db` dep, update postinstall)
  - Updated `apps/web/src/lib/db/billing.ts` (still here, will move in T9) — but remove from barrel
  - Updated all consumers of `@/lib/db/*`, `@/lib/cache`, `@/lib/prisma`
- **Dependencies**: T1 completed (verified ✓)

## Skills Required

- **prisma-client-api**: For prisma client setup, migrations, output path, query patterns

## Files Involved

- `apps/web/prisma/schema.prisma` — read + move
- `apps/web/prisma/migrations/` — read + move
- `apps/web/prisma/seed.ts` — read + move
- `apps/web/prisma/seed-fixed-costs.ts` — read + move
- `apps/web/prisma/fix-sequences.ts` — read + move
- `apps/web/prisma/fix-failed-migration.ts` — read + move
- `apps/web/src/lib/prisma.ts` — read + move
- `apps/web/src/lib/db/index.ts` — read + modify (remove billing re-export)
- `apps/web/src/lib/db/types.ts` — read + move
- `apps/web/src/lib/db/helpers.ts` — read + move
- `apps/web/src/lib/db/ingredients.ts` — read + move
- `apps/web/src/lib/db/recipes.ts` — read + move
- `apps/web/src/lib/db/presentations.ts` — read + move
- `apps/web/src/lib/db/preferences.ts` — read + move
- `apps/web/src/lib/db/audit.ts` — read + move
- `apps/web/src/lib/db/billing.ts` — read (DO NOT move, moves in T9) + modify imports
- `apps/web/src/lib/cache.ts` — read + move

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `packages/db/package.json` — modify (peerDeps, exports, files)
- [ ] `packages/db/prisma/schema.prisma` — new (moved from apps/web)
- [ ] `packages/db/prisma/migrations/**` — new (moved from apps/web)
- [ ] `packages/db/prisma/seed.ts` — new (moved)
- [ ] `packages/db/prisma/seed-fixed-costs.ts` — new (moved)
- [ ] `packages/db/prisma/fix-sequences.ts` — new (moved)
- [ ] `packages/db/prisma/fix-failed-migration.ts` — new (moved)
- [ ] `packages/db/src/index.ts` — new (moved from apps/web, modified to remove billing re-export)
- [ ] `packages/db/src/prisma.ts` — new (moved)
- [ ] `packages/db/src/types.ts` — new (moved)
- [ ] `packages/db/src/helpers.ts` — new (moved)
- [ ] `packages/db/src/ingredients.ts` — new (moved)
- [ ] `packages/db/src/recipes.ts` — new (moved)
- [ ] `packages/db/src/presentations.ts` — new (moved)
- [ ] `packages/db/src/preferences.ts` — new (moved)
- [ ] `packages/db/src/audit.ts` — new (moved)
- [ ] `packages/db/src/cache.ts` — new (moved)
- [ ] `packages/db/README.md` — new (optional)
- [ ] `apps/web/package.json` — modify (add `@recetario/db` dep, update postinstall)
- [ ] `apps/web/src/lib/db/billing.ts` — modify (update import paths to use `@recetario/db`)
- [ ] All consumer files in `apps/web/src/` — modify (update import paths)
- [ ] `docs/tasks/task-20260620-1718-builder-t7-db-package-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skill**: `prisma-client-api`

2. **Read all files to be moved** (batch reads):
   - `apps/web/prisma/schema.prisma` — note line 7 `output = "../generated/prisma"`, all models
   - `apps/web/src/lib/db/index.ts` — note current re-exports (including billing)
   - `apps/web/src/lib/db/recipes.ts` — note imports of `../../../generated/prisma/...`
   - `apps/web/src/lib/db/ingredients.ts` — same
   - `apps/web/src/lib/db/presentations.ts` — same
   - `apps/web/src/lib/db/preferences.ts` — same
   - `apps/web/src/lib/db/audit.ts` — same
   - `apps/web/src/lib/db/helpers.ts` — note relative imports
   - `apps/web/src/lib/db/types.ts` — note type-only imports
   - `apps/web/src/lib/db/billing.ts` — note its imports (will stay in apps/web for now, will move in T9)
   - `apps/web/src/lib/cache.ts` — note its imports
   - `apps/web/src/lib/prisma.ts` — note its imports

3. **Find all consumers** of `@/lib/db/*`, `@/lib/cache`, `@/lib/prisma` in `apps/web/src/`:
   ```bash
   grep -rln "from \"@/lib/db/" apps/web/src/ | wc -l
   grep -rln "from \"@/lib/cache\"" apps/web/src/ | wc -l
   grep -rln "from \"@/lib/prisma\"" apps/web/src/ | wc -l
   grep -rln "from \"../../../generated/prisma" apps/web/src/ | wc -l
   ```
   - Get a count of files that need import updates
   - List specific files for the most common imports (recipients, ingredients, etc.)

4. **Create `packages/db/prisma/` directory**:
   ```bash
   mkdir -p packages/db/prisma/migrations
   ```

5. **Move prisma files**:
   ```bash
   mv apps/web/prisma/schema.prisma packages/db/prisma/schema.prisma
   mv apps/web/prisma/migrations/* packages/db/prisma/migrations/
   mv apps/web/prisma/seed.ts packages/db/prisma/seed.ts
   mv apps/web/prisma/seed-fixed-costs.ts packages/db/prisma/seed-fixed-costs.ts
   mv apps/web/prisma/fix-sequences.ts packages/db/prisma/fix-sequences.ts
   mv apps/web/prisma/fix-failed-migration.ts packages/db/prisma/fix-failed-migration.ts
   rmdir apps/web/prisma/migrations 2>/dev/null
   rmdir apps/web/prisma
   ```

6. **Verify `packages/db/prisma/schema.prisma` line 7** is correct:
   - Should still be `output = "../generated/prisma"`
   - Effective: `packages/db/generated/prisma/`
   - This is the same relative path; no change needed

7. **Create `packages/db/src/` directory**:
   ```bash
   mkdir -p packages/db/src
   ```

8. **Move lib files**:
   ```bash
   mv apps/web/src/lib/prisma.ts packages/db/src/prisma.ts
   mv apps/web/src/lib/db/index.ts packages/db/src/index.ts
   mv apps/web/src/lib/db/types.ts packages/db/src/types.ts
   mv apps/web/src/lib/db/helpers.ts packages/db/src/helpers.ts
   mv apps/web/src/lib/db/ingredients.ts packages/db/src/ingredients.ts
   mv apps/web/src/lib/db/recipes.ts packages/db/src/recipes.ts
   mv apps/web/src/lib/db/presentations.ts packages/db/src/presentations.ts
   mv apps/web/src/lib/db/preferences.ts packages/db/src/preferences.ts
   mv apps/web/src/lib/db/audit.ts packages/db/src/audit.ts
   mv apps/web/src/lib/cache.ts packages/db/src/cache.ts
   ```
   - **DO NOT** move `apps/web/src/lib/db/billing.ts` (moves in T9)

9. **Update `packages/db/src/index.ts`** to:
   - Keep all re-exports EXCEPT `billing`
   - Add `prisma` re-export (so consumers can `import { prisma } from "@recetario/db"`)
   - Add `cacheGet`, `cacheSet`, `cacheDelete` re-exports
   - Final barrel should export: `prisma`, `cache*`, `helpers`, `types`, `ingredients`, `recipes`, `presentations`, `preferences`, `audit`

10. **Update Prisma client import paths** in each db module:
    - Replace `import { ... } from "../../../generated/prisma/client.js"` with `import { ... } from "../generated/prisma/client.js"`
    - Files to update: `types.ts`, `helpers.ts`, `ingredients.ts`, `recipes.ts`, `presentations.ts`, `preferences.ts`, `audit.ts`
    - Use sed or manual edit for each

11. **Update `packages/db/src/prisma.ts`** if needed:
    - Current imports: `pg`, `@prisma/adapter-pg`, possibly `../../../generated/prisma/client.js` for types
    - New: should import from `./../generated/prisma/client.js` (or use the prisma client import in prisma.ts directly)
    - Verify the imports resolve

12. **Update `packages/db/src/cache.ts`** if it has internal references:
    - May import from `./prisma` (for the cacheEntry model)
    - May import from `./types` (for type defs)
    - These relative imports are now correct (`./prisma` from `src/cache.ts` reaches `src/prisma.ts`)

13. **Update `apps/web/src/lib/db/billing.ts`** to use `@recetario/db`:
    - Replace `import { prisma } from "@/lib/prisma"` with `import { prisma } from "@recetario/db"`
    - Replace `import { ... } from "../../../generated/prisma/client.js"` with `import { ... } from "@recetario/db/generated/prisma/client.js"` (or `import { ... } from "@recetario/db"` if billing.ts re-exports the types)
    - Replace `import { ... } from "@/lib/cache"` with `import { ... } from "@recetario/db"`
    - Replace `import { ... } from "@/lib/db/types"` with `import { ... } from "@recetario/db"`
    - **Note**: `billing.ts` stays in `apps/web/` for now; in T9 it moves to `packages/billing/`. So this is a temporary in-place update.

14. **Update `apps/web/src/components/ui/index.ts`** (from T4):
    - Currently re-exports Button from `@recetario/ui`
    - No DB-related changes here

15. **Find and update all consumers in `apps/web/src/`**:
    - For each file that imports from `@/lib/db/*`:
      - Replace with `@recetario/db`
    - For each file that imports from `@/lib/cache`:
      - Replace with `@recetario/db`
    - For each file that imports from `@/lib/prisma`:
      - Replace with `@recetario/db`
    - Use grep + sed:
      ```bash
      grep -rln "from \"@/lib/db/" apps/web/src/ | xargs sed -i '' 's|from "@/lib/db/|from "@recetario/db/|g'
      grep -rln "from \"@/lib/cache\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/cache"|from "@recetario/db"|g'
      grep -rln "from \"@/lib/prisma\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/prisma"|from "@recetario/db"|g'
      ```

16. **Update `apps/web/package.json`**:
    - Add `"@recetario/db": "workspace:^"` to `dependencies`
    - Update `postinstall` script to also run prisma generate in the package:
      ```json
      "postinstall": "pnpm --filter @recetario/db prisma generate"
      ```
    - Or keep current `npx prisma generate` and add it after the package's generate:
      ```json
      "postinstall": "pnpm --filter @recetario/db prisma generate && npx prisma generate"
      ```
      (this is belt-and-suspenders; the second one runs in apps/web/prisma/ which no longer exists, so only the first is needed)

17. **Update `packages/db/package.json`**:
    ```json
    {
      "name": "@recetario/db",
      "version": "0.0.0",
      "private": true,
      "type": "module",
      "main": "./src/index.ts",
      "types": "./src/index.ts",
      "exports": {
        ".": {
          "types": "./src/index.ts",
          "default": "./src/index.ts"
        },
        "./generated/prisma/client": "./generated/prisma/client.ts",
        "./generated/prisma/client.js": "./generated/prisma/client.js"
      },
      "files": ["src", "prisma"],
      "scripts": {
        "generate": "prisma generate",
        "migrate": "prisma migrate dev",
        "deploy": "prisma migrate deploy",
        "studio": "prisma studio",
        "seed": "tsx prisma/seed.ts",
        "seed:fixed-costs": "tsx prisma/seed-fixed-costs.ts"
      },
      "dependencies": {
        "@prisma/adapter-pg": "7.8.0",
        "@prisma/client": "7.8.0",
        "pg": "8.20.0"
      },
      "devDependencies": {
        "prisma": "7.8.0",
        "tsx": "4.22.0"
      }
    }
    ```
    - Move `@prisma/*` and `pg` deps from `apps/web/package.json` to here
    - Move `prisma` and `tsx` devDeps to here (used for migrations + seeds)
    - Remove these from `apps/web/package.json` (no longer needed there)

18. **Reinstall**:
    ```bash
    pnpm install
    ```

19. **Verify Prisma client generation**:
    ```bash
    pnpm --filter @recetario/db exec prisma generate
    ```
    - Should generate to `packages/db/generated/prisma/`
    - Check that `packages/db/src/index.ts` and consumers can import correctly

20. **Verify build**:
    ```bash
    pnpm turbo run build
    ```
    - Should succeed
    - DB operations should work the same

21. **Verify dev server**:
    ```bash
    cd apps/web && timeout 15 pnpm dev
    ```
    - Should boot
    - Should be able to sign in / sign up / load recipes

22. **Verify astro check**:
    ```bash
    pnpm --filter @recetario/web astro check
    ```
    - Should report 0 errors
    - No new type errors

23. **Verify Prisma migrate status**:
    ```bash
    pnpm --filter @recetario/db exec prisma migrate status
    ```
    - Should show all 7 migrations (1 init, plus 6 applied)
    - No drift

24. **Verify ownerId scoping preserved** (CRITICAL invariant):
    - Spot-check: pick 3-5 db queries across different files
    - Verify each has `where: { ownerId: ... }` (or is the prisma.ts client file itself)
    - If any query is missing ownerId, **STOP** and report — this is a security bug per AGENTS.md

25. **Write report** to `docs/tasks/task-20260620-1718-builder-t7-db-package-report.md` with:
    - **Skills Used**: `prisma-client-api` etc.
    - **Files moved**: list
    - **Files modified**: list with diff summary
    - **Consumer count updated**: how many files had imports updated
    - **Prisma generate output**: success
    - **Migrate status**: all migrations applied
    - **Build / dev / astro check**: all pass
    - **OwnerId audit**: spot-check results
    - **Issues encountered**: any + how resolved

## Expected Output

- **Code changes**:
  - `packages/db/prisma/` with schema + migrations + seeds
  - `packages/db/src/` with 9 files (8 db modules + cache + prisma)
  - `packages/db/package.json` with prisma deps
  - `apps/web/package.json` with `@recetario/db` dep, updated postinstall
  - `apps/web/src/lib/db/billing.ts` updated imports (stays in apps/web until T9)
  - All `apps/web/src/` consumers updated
- **Report**: `docs/tasks/task-20260620-1718-builder-t7-db-package-report.md`

## Guardrails

- **DO NOT** move `apps/web/src/lib/db/billing.ts` to `packages/billing/` (that's T9)
- **DO NOT** modify any other src/lib/* files beyond db/, cache.ts, prisma.ts
- **DO NOT** change any DB query logic — pure file move + import update
- **DO NOT** change the Prisma schema (no new models, no migrations added)
- **DO NOT** change `output = "../generated/prisma"` in schema.prisma line 7 (already correct)
- **DO NOT** run `prisma migrate dev` (would create a new migration)
- **MUST** verify `prisma migrate status` shows no drift
- **MUST** verify `pnpm turbo run build` passes
- **MUST** verify dev server boots and serves a page
- **MUST** spot-check ownerId scoping (CRITICAL invariant per AGENTS.md)
- **MUST** verify `astro check` has no new errors
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If new files are needed, STOP and report.
- **Read discipline**: Max 15 file reads. Should be ~10 reads (the 8 db modules + cache + prisma + billing + schema).
