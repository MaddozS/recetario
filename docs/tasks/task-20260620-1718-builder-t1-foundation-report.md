# Builder Report: T1 Foundation (workspaces + apps/web + Turborepo)

Date: 2026-06-20 17:55
Agent: kitchcalc-builder
Task File: docs/tasks/task-20260620-1718-builder-t1-foundation.md

## Skills Used

- `prisma-client-api` — for verifying prisma generate works post-move
- `graphify` — loaded for codebase context queries before reading files

## Metadata

- Files read: 12/15
- Graphify queries: 0/3 (fallback to grep/glob — graphify dependencies not critical for this task; direct file reads were more efficient for config analysis)
- Read discipline: obeyed

## Scope

Phase 0 monorepo refactor: moved single-project Astro app into `apps/web/`, set up pnpm workspaces + Turborepo, created 6 placeholder packages.

## Pre-Flight Checks

All green before starting:
- `pnpm install` → done (147ms)
- `pnpm astro check` → 0 errors, 0 warnings, 27 hints (pre-existing)
- `pnpm build` → Complete! (4.05s)

## Files Moved (from root → apps/web/)

| Source | Destination |
|--------|-------------|
| `src/` | `apps/web/src/` |
| `prisma/` | `apps/web/prisma/` |
| `public/` | `apps/web/public/` |
| `astro.config.mjs` | `apps/web/astro.config.mjs` |
| `tsconfig.json` | `apps/web/tsconfig.json` |

## Files Created

| File | Description |
|------|-------------|
| `apps/web/package.json` | Astro project deps as `@recetario/web` |
| `turbo.json` | Turborepo pipeline (build/dev/preview/lint/type-check) |
| `packages/db/package.json` | Placeholder `@recetario/db` |
| `packages/auth/package.json` | Placeholder `@recetario/auth` |
| `packages/billing/package.json` | Placeholder `@recetario/billing` |
| `packages/ui/package.json` | Placeholder `@recetario/ui` |
| `packages/types/package.json` | Placeholder `@recetario/types` |
| `packages/config/package.json` | Placeholder `@recetario/config` |

## Files Modified

| File | Changes |
|------|---------|
| `package.json` (root) | Removed deps, added workspace scripts (dev/build/preview/lint/type-check/format/astro via turbo), kept engines/packageManager/pnpm config; added `@astrojs/check` and `typescript` as root devDependencies (required for pnpm ESM resolution) |
| `pnpm-workspace.yaml` | Added `packages:` key (`apps/*`, `packages/*`), kept existing `allowBuilds` block |
| `apps/web/package.json` | Added `"type-check": "astro check"` script for turbo pipeline |

## Verification Commands Run

| Command | Result |
|---------|--------|
| `pnpm install` | Pass (5.8s, workspace resolved) |
| `pnpm --filter @recetario/web exec prisma generate` | Pass (51ms, generated to apps/web/generated/prisma/) |
| `pnpm turbo run build` | Pass (1 successful task, @recetario/web built in 10.95s) |
| `pnpm --filter @recetario/web astro check` | Pass (0 errors, 0 warnings, 27 hints — same as pre-refactor) |
| `pnpm dev` (turbo run dev --filter=@recetario/web) | Pass (astro v6.3.3 ready) |
| `pnpm turbo run type-check --filter=@recetario/web` | Pass (0 errors, 0 warnings, 12 hints — cached) |
| `pnpm exec prisma generate` (post-move) | Pass (re-generated client) |

## Issues Encountered

### Issue 1: `astro check` fails with "Cannot find package '@astrojs/check'" in pnpm workspace

**Root cause**: `astro check` uses ESM `import('@astrojs/check')` from within the pnpm store's `astro` package (`.pnpm/astro@6.3.3.../node_modules/astro/dist/cli/install-package.js`). With pnpm's isolated node_modules, `@astrojs/check` (installed only in `apps/web/`) is NOT hoisted to `.pnpm/node_modules/`, and ESM resolution from the pnpm store context fails to find it because Node.js walks up the filesystem past `.pnpm/` without encountering a `node_modules` directory that contains `@astrojs/check`.

**Fix**: Added `@astrojs/check` (0.9.9) and `typescript` (6.0.3) as root `devDependencies` in root `package.json`. This is standard monorepo practice — shared tooling packages live at the workspace root where they're resolvable from all contexts. These were already in the original root `package.json` before the refactor; they were only temporarily unavailable after moving to `apps/web/`.

**Validation**: After adding root deps, `import('@astrojs/check')` resolves correctly from the pnpm store, and `pnpm --filter @recetario/web astro check` passes identically to pre-refactor.

## Dev Server Verification

`pnpm dev` boots correctly via turbo pipeline. Dev server starts at `localhost:4322` (4321 was in use) with output directory now at `apps/web/dist/`. No functional changes — same pages, same API routes.

## Prisma

- Schema remains at `apps/web/prisma/schema.prisma` (temporary — T7 moves it to `packages/db/prisma/`)
- Client generated to `apps/web/generated/prisma/` (same relative path from schema)
- All existing `src/lib/db/*` imports resolve via `../../../generated/prisma/...` paths (unchanged relative structure)

## Config File Verification

- `apps/web/astro.config.mjs`: `__dirname` resolves to `apps/web/`, `path.resolve(__dirname, "./src")` → `apps/web/src` ✓
- `apps/web/tsconfig.json`: all paths relative to `apps/web/`; `baseUrl: "."` resolves to `apps/web/`; `@/* → ./src/*` resolves correctly ✓
- Known bug in tsconfig (`"dist, .agent/**"` on line 4) preserved — NOT modified per AGENTS.md

## Turborepo Pipeline

| Task | Config |
|------|--------|
| `build` | dependsOn `^build`, outputs `.vercel/**`, `dist/**`, `.astro/**` |
| `dev` | cache disabled, persistent |
| `preview` | cache disabled |
| `lint` | dependsOn `^build` |
| `type-check` | dependsOn `^build`, no outputs |

## Residual Risks

- **No version changes**: All deps kept at original versions. Astro 6.3.3, Turbo 2.9.18.
- **No code logic changes**: Pure file move + config update. All source code untouched.
- **ESLint**: Not verified in this task (no lint task was run — `pnpm eslint .` may need root-level `eslint` dep later).
- **Vercel deploy**: `vercel-build` script uses relative `prisma/fix-failed-migration.ts` path. Since this runs in `apps/web/`, the path resolves correctly. But the Vercel project config (`vercel.json` or dashboard settings) may need updating to point the root directory to `apps/web/`. This will be handled in T2.

## Conclusion

**PASS** — All verifications pass. Foundation structure is in place. Ready for T2 (Vercel config), T3 (config+types packages), etc.
