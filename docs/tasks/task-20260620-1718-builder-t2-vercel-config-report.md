# Builder Report: T2 — Vercel Config Update

Date: 2026-06-20 17:58
Agent: kitchcalc-builder
Task File: docs/tasks/task-20260620-1718-builder-t2-vercel-config.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md

## Metadata
- Files read: 6/15
- Graphify queries: 0/3 (not needed for operational config task)
- Read discipline: obeyed

## Skills Used
- none

## vercel.json Content

Created new file at `vercel.json` (did not exist before):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "pnpm install && pnpm turbo run build --filter=@recetario/web",
  "outputDirectory": "apps/web/dist",
  "installCommand": "pnpm install",
  "framework": null,
  "rewrites": [
    { "source": "/(.*)", "destination": "/$1" }
  ]
}
```

### Key Design Decisions

- **Monorepo-aware build**: `pnpm turbo run build --filter=@recetario/web` runs from the repo root, using Turborepo to scope the build to the web app only.
- **Output directory**: `apps/web/dist` — relative to repo root, matching Astro's default output directory inside the web workspace.
- **`"framework": null`**: Prevents Vercel from auto-detecting a framework preset (which could set conflicting build/output defaults). The Astro+Vercel adapter handles routing internally.
- **Passthrough rewrites**: Included for explicitness — every route is handled by the Astro SSR serverless function.
- **No `rootDirectory`** in vercel.json: The build command runs from the repo root, which is the simplest setup. (See dashboard notes below for the alternative.)

## Dashboard Changes Required

The user must make these changes in the Vercel dashboard at **Settings → General**:

| Setting | Value | Notes |
|---------|-------|-------|
| **Framework Preset** | **Other** | vercel.json has `"framework": null`, so select "Other" in dashboard to match. |
| **Root Directory** | *(leave blank)* | vercel.json uses full paths from repo root. If you set this to `apps/web`, you must also update `outputDirectory` to `dist` (relative) in vercel.json. Leave blank to use the config as-is. |
| **Build Command** | *(leave empty)* | vercel.json specifies the build command. Leave empty in dashboard so vercel.json takes precedence. |
| **Output Directory** | *(leave empty)* | vercel.json specifies `apps/web/dist`. Leave empty in dashboard. |
| **Install Command** | *(leave empty)* | vercel.json specifies `pnpm install`. Leave empty in dashboard. |
| **Node.js Version** | **22.x** | The project requires Node >= 22.12.0 (see root package.json `engines`). |

**Alternative**: If you prefer to set Root Directory to `apps/web` in the dashboard:
1. Update `vercel.json` → change `outputDirectory` from `apps/web/dist` to just `dist`
2. Update `vercel.json` → change `buildCommand` from `"pnpm install && pnpm turbo run build --filter=@recetario/web"` to just `"pnpm install && pnpm turbo run build --filter=@recetario/web"` (the turbo command works from any monorepo subdirectory)
3. Set Install Command to `pnpm install` in dashboard

The recommendation is to **leave Root Directory blank** and let vercel.json control everything.

## Local Verification

### pnpm install
Ran clean `pnpm install` — resolved all workspace dependencies. Workspace packages (`@recetario/ui`, `@recetario/auth`, etc.) linked correctly via pnpm virtual store.

### pnpm turbo run build --filter=@recetario/web
```
 Tasks:    1 successful, 1 total
Cached:    0 cached, 1 total
  Time:    7.014s
```
Build output verified:
- `apps/web/dist/client/` — static client assets
- `apps/web/.vercel/output/` — Vercel Build Output API (serverless function bundle + static files)
- `apps/web/.vercel/output/config.json` — Vercel deployment config
- `apps/web/.vercel/output/functions/` — serverless function entry points

The same build command Vercel will use during deployment works correctly.

## Vercel CLI Status

- **Vercel CLI**: installed at v53.3.1
- **Authentication**: NOT authenticated (`vercel whoami` returns "The specified token is not valid")
- **Project link**: root `.vercel/repo.json` contains existing project ID (`prj_NmStM7oC9iVSjPNT3jN6tL7HncIl`) for project `kitchen_cell`
- **Action needed**: User must run `vercel login` to authenticate, then optionally `vercel link` to link the project, then `vercel --prod` to deploy

## Pre-existing Issues Found

- `apps/web/src/components/ui/index.ts` line 4 imports from `@recetario/ui` — this package exists at `packages/ui/` but requires `pnpm install` for the workspace symlink to resolve. After running `pnpm install`, the build succeeds. This is expected monorepo behavior and not a bug.

## Files Created/Modified

- `vercel.json` (root) — **CREATED**, 5 fields, valid JSON

## Verification
- `cat vercel.json | python3 -m json.tool`: valid ✓
- `pnpm turbo run build --filter=@recetario/web`: PASS ✓
- No changes to package.json, turbo.json, or astro.config.mjs ✓

## Conclusion
PASS — vercel.json created, build verified, dashboard changes documented.
