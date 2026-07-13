# Task T2: Vercel config update
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T1 (completed)

## Goal

Update Vercel project configuration to deploy from the new monorepo structure. Set root directory to `apps/web/` and update build command. Create or update `vercel.json` if needed. Document any dashboard changes the user must make manually.

## Context

After T1, the Astro project is at `apps/web/`. Vercel currently deploys from the project root. Without updating Vercel config, the next deploy will fail because it can't find `package.json` at the root level that defines the Astro build scripts.

**Vercel configuration options**:
1. **`vercel.json` at root** — declarative config, version-controllable, takes precedence over dashboard
2. **Vercel dashboard settings** — manual, can be set via web UI or `vercel` CLI

The preferred approach is `vercel.json` so the config is version-controlled. The dashboard can override if needed.

## Task Scope

- **Type**: extends-existing
- **Pre-existing components**:
  - Vercel project (assumed already exists)
  - Current `vercel.json` (may or may not exist; create if missing)
  - T1 output: `apps/web/` with Astro project
- **New deliverables**:
  - `vercel.json` at root (or modified if exists) with `buildCommand` and `outputDirectory`
  - Documentation of any dashboard changes the user must make
- **Dependencies**:
  - T1 completed (verified ✓)

## Skills Required

None. This is operational config update.

## Files Involved

- `vercel.json` (root) — create or modify
- Vercel dashboard — document changes needed

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `vercel.json` (root) — new or modified
- [ ] `docs/tasks/task-20260620-1718-builder-t2-vercel-config-report.md` — the report file (mandatory)

## Technical Steps

1. **Check if `vercel.json` exists** at root:
   ```bash
   ls vercel.json 2>/dev/null && cat vercel.json || echo "no vercel.json"
   ```

2. **If no `vercel.json` exists, create one**:
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

3. **If `vercel.json` exists, verify the config**:
   - `buildCommand` should include `pnpm turbo run build --filter=@recetario/web` (or equivalent that runs the web build)
   - `outputDirectory` should be `apps/web/dist` (Astro's build output)
   - `installCommand` should be `pnpm install`
   - Update any values that don't match

4. **Document dashboard changes** the user must make:
   - **Settings → General → Root Directory**: set to `apps/web`
   - **Settings → General → Build Command**: leave empty (uses `vercel.json`) OR set to `pnpm turbo run build --filter=@recetario/web`
   - **Settings → General → Output Directory**: set to `apps/web/dist` (or leave empty if `vercel.json` specifies)
   - **Settings → General → Install Command**: set to `pnpm install`
   - **Settings → General → Framework Preset**: set to "Other" (we have custom build via turbo)

5. **Verify the vercel.json is valid JSON**:
   ```bash
   cat vercel.json | python3 -m json.tool
   ```

6. **Verify locally that the build command works**:
   ```bash
   pnpm install
   pnpm turbo run build --filter=@recetario/web
   ls apps/web/dist
   ```
   - Should produce `apps/web/dist/` with Astro build output
   - The same build command Vercel will use

7. **If Vercel CLI is available**, attempt to link and verify:
   ```bash
   vercel link 2>/dev/null
   vercel env pull 2>/dev/null
   ```
   - If `vercel` CLI is not authenticated, skip these steps and document
   - If authenticated, the user can run `vercel --prod` later to deploy

8. **Write report** to `docs/tasks/task-20260620-1718-builder-t2-vercel-config-report.md` with:
   - **Skills Used**: list (likely `none`)
   - **vercel.json content**: full content created/modified
   - **Dashboard changes documented**: list of settings to change
   - **Local verification**: result of `pnpm turbo run build`
   - **Vercel CLI status**: whether CLI was available, what was done
   - **Issues encountered**: any problems + how resolved

## Expected Output

- **Code changes**:
  - `vercel.json` at root (new or modified) with correct buildCommand, outputDirectory, installCommand
- **Report**: `docs/tasks/task-20260620-1718-builder-t2-vercel-config-report.md`

## Guardrails

- **DO NOT** commit changes (orchestrator/user will commit)
- **DO NOT** modify any other config files (package.json, pnpm-workspace.yaml, turbo.json, astro.config.mjs)
- **DO NOT** trigger a Vercel deploy (`vercel --prod`) — leave that to the user
- **MUST** verify `pnpm turbo run build --filter=@recetario/web` works locally before declaring done
- **MUST** document all dashboard changes needed (user will apply them)
- **MUST** keep `vercel.json` minimal — only what's needed for the monorepo structure
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list
- **Read discipline**: Max 15 file reads. Should be < 3 reads for this task.
