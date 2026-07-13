# Task: Fix ESLint config — move to apps/web

## Assigned Agent
kitchcalc-builder

## Context Received
- Analysis: `docs/analysis/analysis-20260702-eslint-config-fix.md`
- State: `docs/tasks/task-20260702-closer-fixes-state.json`

## Skills
Selected:
- `ponytail` — minimal fix, move + adjust

Discarded:
- `security-best-practices` — no auth changes
- `monorepo-practices` — not needed for this simple move

May load if needed:
- none

## Scope
Editable files:
- `eslint.config.mjs` (root) → move to `apps/web/eslint.config.mjs`
- `apps/web/package.json` — add `lint` script

Forbidden files:
- Everything else

## Instructions

### Step 1: Move the config
Move `eslint.config.mjs` from root to `apps/web/eslint.config.mjs`.

### Step 2: Adjust ignores paths
The current `ignores` entries use relative paths from root. After moving to `apps/web/`, verify and adjust:

Current ignores: `["dist/", ".vercel/", ".astro/", ".agent/", "node_modules/", "generated/", ".agents/", ".opencode/", "seeds/", "run_migration.mjs"]`

Check which of these paths exist under `apps/web/` vs root vs neither:
- `dist/` — exists under `apps/web/dist/` ✅
- `.vercel/` — exists under `apps/web/.vercel/` ✅  
- `.astro/` — exists under `apps/web/.astro/` ✅
- `.agent/` — check if this exists under `apps/web/` or is root-level
- `node_modules/` — exists at root AND `apps/web/node_modules/`. Keep as-is (matches both)
- `generated/` — check location. If it's `packages/db/generated/`, it won't match from `apps/web/`. Remove or adjust.
- `.agents/` — exists at root level. From `apps/web/`, this won't match. Remove or adjust.
- `.opencode/` — exists at root level. Remove or adjust.
- `seeds/` — check location
- `run_migration.mjs` — check location

Each path that doesn't exist under `apps/web/` should be removed or adjusted with `../` prefix for root-level paths.

### Step 3: Add lint script
In `apps/web/package.json`, add to `scripts`:
```json
"lint": "eslint ."
```

### Step 4: Verify
```bash
cd apps/web && pnpm exec eslint .
```

## Acceptance Criteria
- `cd apps/web && pnpm exec eslint .` completes (0 errors or only pre-existing warnings)
- Root `eslint.config.mjs` no longer exists (moved)
- `apps/web/package.json` has `"lint": "eslint ."` script
- `pnpm astro check` still passes

## Reporting
Write report to: `docs/tasks/task-20260702-closer-fixes-builder-eslint-report.md`
Return only: done <path>
