# Analysis Report: ESLint Configuration Monorepo Resolution

## Task Question

Understand and fix a pre-existing ESLint configuration issue where `eslint.config.mjs` at the workspace root imports packages (`@eslint/js`, `typescript-eslint`, `eslint-plugin-astro`) that are only installed in `apps/web/node_modules`, not at the root. Running `pnpm eslint .` from root fails because ESLint 10 flat config resolves imports relative to the config file's location.

## Context Received

- Source files explored: root `eslint.config.mjs`, root `package.json`, `apps/web/package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.npmrc`, `packages/*`
- No spec/plan files — this is an ad-hoc exploration/analysis task

## Skills Used

Selected:
- `graphify` — architecture exploration; graph was available
- `ponytail` — baseline style, minimal fix principle

Discarded:
- `ui-ux-pro-max` — not a UI task
- All Prisma skills — not a database task
- All auth skills — not an auth task
- All Stripe skills — not a billing task
- `diagnose` — not a regression/failing behavior, it's a configuration gap

Added During Execution:
- None

## Memory Context Used

None — no previous run context was provided.

## Graphify Status

available

## Graphify Queries

Graph was not useful for this narrow config question — the file system is flat and the relationship is purely about dependency hoisting / config file location. No graph queries needed.

## Fallback Searches

| Search | Purpose | Result Summary |
|--------|---------|----------------|
| `glob eslint*` in `apps/web/` | Check for existing eslint config in web app | No matching files — no separate eslint config exists in `apps/web/` |
| `grep '"lint"' turbo.json` | Check turbo lint task config | `lint` task exists with `"dependsOn": ["^build"]` |
| `find . -name ".npmrc"` | Search for existing npm/pnpm config | No `.npmrc` anywhere in the repo |
| `ls node_modules/@eslint/js` | Check if eslint packages are hoisted to root | NOT FOUND in root `node_modules` |
| `ls apps/web/node_modules/@eslint/js` | Confirm packages exist in web app | Found in `apps/web/node_modules` |
| `ls node_modules/.bin/eslint` | Check eslint CLI availability at root | NOT FOUND |
| `ls apps/web/node_modules/.bin/eslint` | Check eslint CLI in web app | Found |
| `packages/* package.json` | Check if any packages have lint scripts | None have a `lint` script |

## Files Read

| File | Reason | Fact Learned |
|------|--------|--------------|
| `eslint.config.mjs` (root) | The problematic config | Imports `@eslint/js`, `typescript-eslint`, `eslint-plugin-astro`. Has `ignores` for dist, .vercel, .astro, .agent, node_modules, generated, .agents |
| `package.json` (root) | Check eslint deps at root | No eslint-related dependencies. Only `@astrojs/check`, `turbo`, `typescript`. `lint` script runs `turbo run lint` |
| `apps/web/package.json` | Check eslint deps in web app | Has all eslint deps: `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-astro`, `@typescript-eslint/parser`. NO `lint` script |
| `pnpm-workspace.yaml` | Check hoisting settings | No hoisting configuration. `packages: ["apps/*", "packages/*"]`. Only build-related `allowBuilds` entries |
| `.npmrc` (any location) | Check for existing hoisting config | Does not exist anywhere in the repo |
| `turbo.json` | Check lint task configuration | `lint` task defined with `"dependsOn": ["^build"]` |
| `packages/*` structure | Check if other packages need linting | auth/billing/db/types/ui all have .ts files (123 total) but none have a `lint` script |

## Key Findings

### Root cause

**`eslint.config.mjs` lives at the repo root but its dependency packages only exist in `apps/web/node_modules`.**

1. **Config location**: Root `eslint.config.mjs` (line 1-3) does `import pluginJs from "@eslint/js"`, `import tseslint from "typescript-eslint"`, `import pluginAstro from "eslint-plugin-astro"`.

2. **Missing dependencies at root**: Root `package.json` has no eslint deps. Root `node_modules` does not contain `@eslint/js`, `typescript-eslint`, `eslint-plugin-astro`, or even `eslint` itself.

3. **Dependencies exist in web app**: `apps/web/package.json` has all of these in `devDependencies`. `apps/web/node_modules` contains them all, including the `eslint` binary at `apps/web/node_modules/.bin/eslint`.

4. **No `.npmrc`**: No pnpm hoisting configuration exists, so pnpm's strict isolation keeps all packages in workspace `node_modules`.

5. **No `lint` script in web app**: `apps/web/package.json` has no `lint` script, so `turbo run lint` from root does nothing — it finds no workspace with a `lint` script to execute.

6. **ESLint import resolution**: ESLint 10 flat config resolves `import` statements relative to the config file's directory (root), not the current working directory. Even running eslint from `apps/web/` with the root config wouldn't work.

### Current behavior

`pnpm eslint .` from root —> ESLint is not available (bin not in root `node_modules/.bin`). Even if it were, the imports in `eslint.config.mjs` would fail because `@eslint/js` etc. aren't resolvable from root.

`pnpm exec eslint .` from root —> Same problem, pnpm resolves executables from root's `node_modules/.bin`.

`cd apps/web && pnpm exec eslint .` —> Would work IF there were an eslint config in `apps/web/`, but there isn't; ESLint 10 doesn't auto-detect the root config from a subdirectory in practice because of import resolution.

`turbo run lint` —> Does nothing because no workspace has a `lint` script.

### Side note: Node.js version

The current environment runs Node 20.20.2, which is below the project requirement (`"node": ">=22.12.0"`). The pnpm CLI itself fails to initialize as a result. This is an environment issue separate from the eslint config problem.

## Candidate Files

| File | Why It Matters | Suggested Owner |
|------|----------------|-----------------|
| `eslint.config.mjs` (root) | Must be moved to `apps/web/` or deps must be hoisted | Builder |
| `apps/web/package.json` | Needs a `lint` script added | Builder |
| `apps/web/eslint.config.mjs` | New location for the config (if moved) | Builder |
| `.npmrc` | Only needed if hoisting approach is chosen | Builder |

## Risks And Unknowns

- **Root `eslint.config.mjs` ignores** use relative paths (`"dist/"`, `".vercel/"`, `".astro/"`, `".agent/"`, `"node_modules/"`, `"generated/"`, `".agents/"`). If the config moves to `apps/web/`, these paths need to be verified against the `apps/web/` directory structure.
- **Package linting**: `packages/*` contain `.ts` files (auth: 25, billing: 12, db: 74, types: 2, ui: 10) that are currently excluded from linting. If lint is added later, the config location determines whether those packages can be linted by the same config or need their own.
- **`turbo.json` lint task**: Currently `"dependsOn": ["^build"]` — once a `lint` script exists in a workspace, turbo will run builds first. This is fine but worth noting.
- **The `eslint.config.mjs` `ignores` list**: `.agents/` appears at root level but no such directory exists at root or `apps/web/`. `run_migration.mjs` also appears as an ignore — if the config moves, this path becomes relative.

## Orchestrator Decisions Supported

- **Repo scope**: `apps/web` — the fix is confined to the web app workspace.
- **Candidate builder scope**: Small, single file move + script addition.
- **Risk level**: Low. The config exists but was never actually functional in CI or via `pnpm eslint .` — moving it doesn't break what never worked. The only risk is incorrect `ignores` paths.
- **Human approval gates**: Verify `ignores` paths after move.
- **Suggested validation**: `cd apps/web && pnpm exec eslint .` after fix.

## Suggested Skills For Next Agents

Builder:
- `ponytail` — the fix is straightforward, keep it minimal
- No other skills needed — not a design, auth, or database task

Reviewer:
- `ponytail` — verify no over-engineering crept in

Validator:
- Run `cd apps/web && pnpm exec eslint .` and confirm zero lint errors (or only pre-existing ones)

## Proposed Minimal Fix

**Option A — Move config into `apps/web/` (recommended, ponytail)**

This is the minimal viable fix. Three changes:

1. **Rename/move**: `eslint.config.mjs` → `apps/web/eslint.config.mjs`
   - Adjust `ignores` paths to be relative to `apps/web/` (verify each entry)
   - `dist/`, `.vercel/`, `.astro/` → confirm these paths exist under `apps/web/`
   - `node_modules/` → `apps/web/node_modules/` (or keep `node_modules/` since it's the workspace root)
   - `generated/` → verify this doesn't exist under `apps/web/`

2. **Add script**: In `apps/web/package.json`, add `"lint": "eslint ."` to `scripts`

3. **Optionally**: Remove the old root `eslint.config.mjs` (or leave a stub that re-exports from `apps/web/` for discoverability — though this adds complexity).

After this, `turbo run lint` will find `apps/web`'s `lint` script and run `eslint .` from `apps/web/`. ESLint will find `apps/web/eslint.config.mjs` and its imports will resolve from `apps/web/node_modules`.

**Option B — Add `.npmrc` hoisting (not recommended)**
- Create `.npmrc` with `public-hoist-pattern[]=*eslint*` and related patterns
- Doesn't solve the eslint CLI bin location problem
- pnpm hoisting patterns are fragile across versions

**Option C — Install deps at root (not recommended)**
- Add duplicate eslint deps to root `package.json`
- Version drift risk between root and `apps/web`

**Option A is the clear winner**: co-locates config with its dependencies, aligns with the monorepo workspace pattern, and requires no fragile pnpm config changes.

## Budget Used

- Graphify queries: 0/3
- Searches: 11/12
- Files read: 7/12

## Decision

complete
