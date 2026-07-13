# Builder Report: T3 Config + Types Packages

Date: 2026-06-20 18:05
Agent: kitchcalc-builder
Task File: docs/tasks/task-20260620-1718-builder-t3-config-types.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md

## Skills Used

- `graphify` — loaded for initial codebase context before reading files
- `caveman` (lite) — output compression

## Metadata

- Files read: 13/15
- Graphify queries: 0/3 (fallback to grep/glob — direct file reads more efficient for config analysis)
- Read discipline: obeyed

## Scope

Created `packages/config/` with shared tsconfig/eslint/prettier bases and `packages/types/` as an empty starter. Updated `apps/web/tsconfig.json` to extend the base. Created root `.eslintrc.cjs` and `.prettierrc.json` configs that extend the new bases.

### Key Adaptation from Task File

The task file assumed `.eslintrc.cjs` and `.prettierrc.json` already existed as the active root configs. In reality, the project uses:
- **ESLint**: `eslint.config.mjs` (flat config) at root, not `.eslintrc.cjs`  
- **Prettier**: `.prettierrc` at root, not `.prettierrc.json`

Both were left over from T1 (pre-monorepo roots). I created `.eslintrc.cjs` and `.prettierrc.json` as specified, but they are currently inert — ESLint flat config takes precedence over `.eslintrc.*`, and `.prettierrc` takes precedence over `.prettierrc.json` in Prettier's resolution order. A follow-up task (or T1 cleanup) should remove the old configs to activate the new ones.

## Files Created

| File | Description |
|------|-------------|
| `packages/config/tsconfig.base.json` | Shared TS base extending `astro/tsconfigs/base` (not strict — matching current behavior) |
| `packages/config/eslint.base.cjs` | Shared ESLint base (CJS format, eslint:recommended + @typescript-eslint) |
| `packages/config/prettier.base.json` | Shared Prettier base (semi/singleQuote/trailingComma defaults + astro plugins) |
| `packages/types/src/index.ts` | Empty placeholder with `export {}` |
| `.eslintrc.cjs` | Root ESLint config extending `@recetario/config/eslint.base.cjs` + astro overrides |
| `.prettierrc.json` | Root Prettier config extending `@recetario/config/prettier.base.json` |

## Files Modified

| File | Changes |
|------|---------|
| `packages/config/package.json` | Added `files` and `exports` for 3 base config files |
| `packages/types/package.json` | Added `main`, `types`, `exports`, `files` pointing to `src/index.ts` |
| `apps/web/tsconfig.json` | Changed `extends` from `astro/tsconfigs/base` to `../../packages/config/tsconfig.base.json` (relative path — `@recetario/config` not in package.json deps). Added `@recetario/*` path mapping. Fixed the known tsconfig exclude bug (separated single malformed string into proper array entries). Added package build output exclusions. Preserved `@astrojs/ts-plugin` plugin. |

## Verification Commands Run

| Command | Result |
|---------|--------|
| `pnpm install` | Pass (165ms, workspace resolved) |
| `pnpm turbo run type-check` | Pass (0 errors, 0 warnings, 12 hints — same pre-refactor hints) |
| `pnpm turbo run build` | Pass (build complete in 5.46s) |
| `pnpm eslint .` | FAILED — `Command "eslint" not found`. Pre-existing: ESLint isn't installed at root level (only in `apps/web/package.json`). The root `eslint.config.mjs` is a flat config that can't resolve `@eslint/js` because it's not hoisted. |
| `pnpm format` | FAILED — `Cannot find package 'prettier-plugin-astro'`. Pre-existing: Prettier/plugins aren't at root level. |
| `pnpm --filter @recetario/web exec eslint .` | FAILED — ESLint resolves root `eslint.config.mjs` which can't find `@eslint/js`. Config needs to be moved to `apps/web/` or deps need to be at root. |
| `cd apps/web && pnpm exec prettier --check .` | Warnings on 7 files — all generated/build output (`.astro/`, `.vercel/`, `dist/`). Pre-existing, not related to config changes. |

## Issues Encountered

### Issue 1: `astro/tsconfigs/strict` introduces 23 new type errors

Base config used `astro/tsconfigs/strict` per task spec, which enables `noUncheckedIndexedAccess` and other strict flags. The current project uses `astro/tsconfigs/base`. Changing to strict caused 23 new errors across the codebase.

**Fix**: Changed base to extend `astro/tsconfigs/base` (matching current behavior). Removed `noUncheckedIndexedAccess: true` from compilerOptions. Guardrails say "match current behavior — no new rules."

### Issue 2: Root ESLint (`eslint.config.mjs`) is broken after T1

The flat config at root imports `@eslint/js`, `typescript-eslint`, and `eslint-plugin-astro` — all installed only in `apps/web/`. Not hoisted to root. `pnpm eslint .` fails with `Command "eslint" not found`. Running from `apps/web/` resolves the binary but still uses the root config file, which can't resolve the imports.

**Status**: Pre-existing T1 residual. T1 report noted this: "ESLint: Not verified in this task." Cannot fix without adding eslint deps to root (blocked by "DO NOT add new dependencies" guardrail) or moving the config to `apps/web/`.

### Issue 3: Root `pnpm format` (`prettier --write .`) fails

Prettier and its plugins are only in `apps/web/`. Running from root fails with `Cannot find package 'prettier-plugin-astro'`.

**Status**: Pre-existing T1 residual. Same resolution needed as ESLint.

### Issue 4: `.eslintrc.cjs` and `.prettierrc.json` are inert

Created as specified, but existing configs (`eslint.config.mjs` and `.prettierrc`) take precedence. The new base configs in `packages/config/` exist and are properly exported, but the root configs don't actually use them yet.

**Follow-up needed**: A future task should delete `eslint.config.mjs` and `.prettierrc` and keep the new `.eslintrc.cjs`/`.prettierrc.json` (or adapt the flat config composition approach).

### Issue 5: `apps/web/tsconfig.json` uses relative path for extends

The task specified `"extends": "@recetario/config/tsconfig.base.json"` (package name). This requires `@recetario/config` to be a dependency of `@recetario/web` to resolve via `node_modules`. Since `apps/web/package.json` isn't in scope, I used `"../../packages/config/tsconfig.base.json"` (relative path). Functionally equivalent — TypeScript's `extends` supports both.

## Residual Risks

- **ESLint/Prettier not verified**: Both are pre-existing broken states from T1. The new base configs in `packages/config/` are available but not yet active at root level.
- **Root ESLint config file mismatch**: Two ESLint config files now exist (`eslint.config.mjs` and `.eslintrc.cjs`) — the flat config takes precedence. Same for Prettier (`.prettierrc` vs `.prettierrc.json`). Needs cleanup.
- **`@recetario/config` not a dependency of `@recetario/web`**: When packages eventually use `@recetario/config` imports, it needs to be added to `apps/web/package.json` (or the consuming package's deps).

## Conclusion

**PASS** — Core deliverables complete: config + types packages created, apps/web/tsconfig.json wired to base, verification commands pass where the infrastructure supports them. ESLint/Prettier root verification failures are pre-existing T1 residuals, not introduced by this task.
