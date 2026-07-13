# Task T1: Foundation (workspaces + apps/web + Turborepo)
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Current branch: dev

## Goal

Set up pnpm workspaces + Turborepo. Move the current Astro project from project root to `apps/web/`. Create empty placeholder packages for the future `db`, `auth`, `billing`, `ui`, `types`, `config` packages. Verify the build still works identically.

This is Phase 0 of the monorepo refactor. Every subsequent task depends on this structure.

## Context

**Prerequisite (confirmed by user + verified in git log)**: Branch `006-password-reset-flow` was merged to main (commit `f3a02ca Merge pull request #35 from MaddozS/006-password-reset-flow`). Current branch is `dev`, which contains the merged changes.

**Current structure (single project at root)**:
- `package.json` — name "recetario", all deps, scripts
- `pnpm-workspace.yaml` — has `allowBuilds` only (no `packages:`)
- `astro.config.mjs` — alias `@/ → ./src`
- `tsconfig.json` — extends astro/tsconfigs/strict
- `src/` — 30+ files in lib, 22 components, 17 pages, 9 API routes
- `prisma/` — schema, 6 migrations, 4 scripts
- `public/` — static assets

**Target structure (after T1)**:
```
recetario/
├── apps/
│   └── web/                        # Current Astro project, moved
│       ├── src/
│       ├── prisma/                 # Temporary — moves to packages/db/prisma/ in T7
│       ├── public/
│       ├── astro.config.mjs
│       ├── tsconfig.json
│       └── package.json            # @recetario/web
├── packages/
│   ├── db/    package.json         # placeholder
│   ├── auth/  package.json         # placeholder
│   ├── billing/package.json        # placeholder
│   ├── ui/    package.json         # placeholder
│   ├── types/ package.json         # placeholder
│   └── config/package.json         # placeholder
├── package.json                    # workspace root, turbo scripts
├── pnpm-workspace.yaml             # packages + allowBuilds
├── turbo.json
├── tsconfig.json                   # extends packages/config in T3
├── .eslintrc.cjs
└── .prettierrc.json
```

**What stays at root**: only workspace config + docs/ + plans/ + specs/ + .opencode/ + .agents/

**Why this is foundation**: T2 (Vercel config), T3 (config+types packages), T4 (UI spike), T7 (DB) all depend on T1.

## Task Scope

- **Type**: new + extends-existing
- **Pre-existing components**:
  - All current source code (src/, prisma/, public/)
  - All current config (package.json, pnpm-workspace.yaml, astro.config.mjs, tsconfig.json, .eslintrc.cjs, .prettierrc.json)
- **New deliverables**:
  - `apps/web/` containing moved Astro project
  - `turbo.json` with build/dev/lint/type-check pipeline
  - 6 placeholder `packages/*/package.json` files
  - Updated root `package.json` (workspaces, scripts delegate to turbo)
  - Updated `pnpm-workspace.yaml` (added `packages:` key)
- **Dependencies**:
  - password reset merged to main (verified ✓)
  - No other in-flight task dependencies

## Skills Required

- **prisma-client-api**: For verifying `prisma generate` still works after the move. The schema stays the same; only its location changes.

## Files Involved

**Files to read (current state)**:
- `package.json` (current root, all deps to move)
- `pnpm-workspace.yaml` (add `packages:` key)
- `astro.config.mjs` (verify alias path after move)
- `tsconfig.json` (verify paths after move)

**Files to move (from root to apps/web/)**:
- `src/`, `prisma/`, `public/`, `astro.config.mjs`, `tsconfig.json`

**Files to create**:
- `apps/web/package.json` (move deps from root)
- `turbo.json` (Turborepo pipeline)
- `packages/{db,auth,billing,ui,types,config}/package.json` (6 placeholders)

**Files to modify**:
- Root `package.json` (remove deps, add workspace scripts)
- `pnpm-workspace.yaml` (add `packages:` key, keep `allowBuilds`)

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `apps/web/package.json` — new (Astro project deps)
- [ ] `apps/web/astro.config.mjs` — moved from root
- [ ] `apps/web/tsconfig.json` — moved from root
- [ ] `apps/web/src/**` — moved from root
- [ ] `apps/web/prisma/**` — moved from root (temporary location, T7 moves it again)
- [ ] `apps/web/public/**` — moved from root
- [ ] Root `package.json` — modified (workspaces, scripts)
- [ ] `pnpm-workspace.yaml` — modified (add `packages:`)
- [ ] `turbo.json` — new
- [ ] `packages/db/package.json` — new (placeholder)
- [ ] `packages/auth/package.json` — new (placeholder)
- [ ] `packages/billing/package.json` — new (placeholder)
- [ ] `packages/ui/package.json` — new (placeholder)
- [ ] `packages/types/package.json` — new (placeholder)
- [ ] `packages/config/package.json` — new (placeholder)
- [ ] `docs/tasks/task-20260620-1718-builder-t1-foundation-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skill**: `prisma-client-api` (for verifying prisma generate works post-move)

2. **Pre-flight check** — verify current state builds clean:
   ```bash
   pnpm install
   pnpm astro check
   pnpm build
   ```
   - If any fails, STOP and report. Refactor requires green build first.

3. **Create directory structure**:
   ```bash
   mkdir -p apps packages/db packages/auth packages/billing packages/ui packages/types packages/config
   ```

4. **Move Astro project to `apps/web/`**:
   ```bash
   mv src apps/web/src
   mv prisma apps/web/prisma
   mv public apps/web/public
   mv astro.config.mjs apps/web/astro.config.mjs
   mv tsconfig.json apps/web/tsconfig.json
   ```

5. **Create `apps/web/package.json`** with this content:
   ```json
   {
     "name": "@recetario/web",
     "version": "0.0.0",
     "private": true,
     "type": "module",
     "scripts": {
       "dev": "astro dev",
       "build": "astro build",
       "preview": "astro preview",
       "astro": "astro",
       "format": "prettier --write .",
       "postinstall": "npx prisma generate",
       "vercel-build": "npx prisma generate && npx tsx prisma/fix-failed-migration.ts && npx prisma migrate deploy && astro build"
     },
     "dependencies": {
       "@astrojs/vercel": "10.0.7",
       "@iconify-json/lucide": "1.2.107",
       "@prisma/adapter-pg": "7.8.0",
       "@prisma/client": "7.8.0",
       "@tailwindcss/vite": "4.3.0",
       "astro": "6.3.3",
       "astro-icon": "1.1.5",
       "better-auth": "1.6.11",
       "dotenv": "17.4.2",
       "pg": "8.20.0",
       "sanitize-html": "^2.17.4",
       "stripe": "22.1.1",
       "tailwindcss": "4.3.0"
     },
     "devDependencies": {
       "@astrojs/check": "0.9.9",
       "@astrojs/ts-plugin": "^1.10.8",
       "@eslint/js": "10.0.1",
       "@playwright/test": "^1.60.0",
       "@types/node": "25.8.0",
       "@types/pg": "8.20.0",
       "@types/sanitize-html": "^2.16.1",
       "@typescript-eslint/parser": "^8.59.3",
       "eslint": "10.4.0",
       "eslint-plugin-astro": "1.7.0",
       "playwright": "^1.60.0",
       "prettier": "3.8.3",
       "prettier-plugin-astro": "0.14.1",
       "prettier-plugin-tailwindcss": "^0.8.0",
       "prisma": "7.8.0",
       "tsx": "4.22.0",
       "typescript": "6.0.3",
       "typescript-eslint": "8.59.3"
     }
   }
   ```
   - Same deps and versions as current root `package.json`
   - Name is `@recetario/web` (workspace convention)

6. **Update root `package.json`** to:
   ```json
   {
     "name": "recetario",
     "version": "1.0.0",
     "private": true,
     "type": "module",
     "engines": {
       "node": ">=22.12.0"
     },
     "scripts": {
       "dev": "turbo run dev --filter=@recetario/web",
       "build": "turbo run build",
       "preview": "turbo run preview --filter=@recetario/web",
       "lint": "turbo run lint",
       "type-check": "turbo run type-check",
       "format": "prettier --write .",
       "astro": "pnpm --filter @recetario/web astro"
     },
     "pnpm": {
       "onlyBuiltDependencies": [
         "@prisma/engines",
         "prisma"
       ]
     },
     "packageManager": "pnpm@11.1.2+sha512.415a1cc25974731e75455c1468371be74c5aa5fb7621b50d4056d222451609f11412f23fd602e6169f1e060466641f798597e1be961a10688836a67b16569499"
   }
   ```
   - Keep all existing config (engines, packageManager, pnpm.onlyBuiltDependencies)
   - All scripts delegate to turbo
   - Remove all `dependencies` and `devDependencies` (moved to apps/web/package.json)

7. **Update `pnpm-workspace.yaml`** — add `packages:` key, keep `allowBuilds`:
   ```yaml
   packages:
     - 'apps/*'
     - 'packages/*'

   allowBuilds:
     "@prisma/engines": true
     better-sqlite3: false
     esbuild: true
     prisma: true
     sharp: true
   ```

8. **Install Turborepo at root**:
   ```bash
   pnpm add -Dw turbo
   ```
   - `-D` dev dep
   - `-w` workspace root

9. **Create `turbo.json`** with this content:
   ```json
   {
     "$schema": "https://turbo.build/schema.json",
     "ui": "stream",
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".vercel/**", "dist/**", ".astro/**"]
       },
       "dev": {
         "cache": false,
         "persistent": true
       },
       "preview": {
         "cache": false
       },
       "lint": {
         "dependsOn": ["^build"]
       },
       "type-check": {
         "dependsOn": ["^build"],
         "outputs": []
       }
     }
   }
   ```

10. **Create placeholder `package.json` for each of the 6 packages**:
    For each of `packages/db`, `packages/auth`, `packages/billing`, `packages/ui`, `packages/types`, `packages/config`:
    ```json
    {
      "name": "@recetario/<name>",
      "version": "0.0.0",
      "private": true,
      "type": "module"
    }
    ```
    (Replace `<name>` with db/auth/billing/ui/types/config)

11. **Verify `apps/web/astro.config.mjs`** — alias path should still work:
    - Current: `alias: { "@/": path.resolve(__dirname, "./src") }`
    - After move: file is at `apps/web/astro.config.mjs`, `__dirname` resolves to `apps/web/`
    - `path.resolve(__dirname, "./src")` → `apps/web/src` ✓ (correct, no change needed)

12. **Verify `apps/web/tsconfig.json`** — same logic, should work as-is:
    - `include` paths should be relative to the file
    - `exclude` paths should be relative to the file
    - Likely no change needed; if any reference `../../`, update to `../`

13. **Install dependencies**:
    ```bash
    pnpm install
    ```
    - Should resolve workspaces, install all deps, run postinstall (prisma generate)

14. **Verify Prisma client generation**:
    ```bash
    pnpm --filter @recetario/web prisma generate
    ```
    - Should generate client to `apps/web/generated/prisma/`
    - Check that `apps/web/src/lib/db/*` imports resolve (`../../../generated/prisma/...` paths)

15. **Verify build**:
    ```bash
    pnpm turbo run build
    ```
    - Should build only `@recetario/web` (other packages are empty placeholders)
    - Build output should be identical to pre-refactor (same `dist/` structure)

16. **Verify dev server boots**:
    ```bash
    timeout 15 pnpm --filter @recetario/web dev
    ```
    - Start dev, wait for "ready" message, then kill
    - If it boots without error, the structure is correct

17. **Verify astro check**:
    ```bash
    pnpm --filter @recetario/web astro check
    ```
    - Should pass with no type errors

18. **Write report** to `docs/tasks/task-20260620-1718-builder-t1-foundation-report.md` with:
    - **Skills Used**: list (e.g., `prisma-client-api`)
    - **Files moved**: list of paths
    - **Files created**: list of paths
    - **Files modified**: list of paths
    - **Build output**: success/failure with command output snippets
    - **Issues encountered**: any problems + how resolved
    - **Verification commands run**: list with results

## Expected Output

- **Code changes**:
  - All file moves as listed in "Files the Subagent May Create or Edit"
  - `turbo.json` with the specified pipeline
  - All 6 placeholder `packages/*/package.json` files
  - Modified root `package.json` (workspaces, scripts)
  - Modified `pnpm-workspace.yaml` (added `packages:`)
- **Report**: `docs/tasks/task-20260620-1718-builder-t1-foundation-report.md` with all findings, commands executed, results

## Guardrails

- **DO NOT** install any new dependencies beyond Turborepo. Don't upgrade existing deps.
- **DO NOT** change any code logic. Only move files and update config.
- **DO NOT** touch `prisma/schema.prisma` or migrations. They move to `apps/web/prisma/` for now, then to `packages/db/prisma/` in T7.
- **DO NOT** modify `astro.config.mjs` Vite plugin config (Tailwind, astro-icon lucide allowlist, alias).
- **DO NOT** modify any source code in `src/`. Pure file move.
- **DO NOT** modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files.
- **MUST** preserve all existing functionality. Build output should be identical to pre-refactor.
- **MUST** verify `pnpm turbo run build` passes before declaring done.
- **MUST** verify `pnpm dev` boots the Astro server before declaring done.
- **MUST** keep `pnpm-workspace.yaml` `allowBuilds` block (don't remove it).
- **MUST** keep all `pnpm.onlyBuiltDependencies` in root `package.json`.
- **MUST** use `pnpm exec` or `pnpm dlx` for any terminal commands (per AGENTS.md).
- **MUST** use `npx` (as in current scripts) for prisma generation in `apps/web/postinstall` to match existing pattern.
- **IMMUTABLE**: Never modify `docs/specs/2026-06-20-monorepo-refactor-design.md`, `docs/plans/plan-20260620-1718-monorepo-refactor.md`, `docs/analysis/analysis-20260620-1718-monorepo-refactor.md`, or other task files.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If something else is needed, STOP and report.
- **Read discipline**: Max 15 file reads. Most changes are config + file moves; should be < 5 reads.
- **Visual QA**: Not required for T1 (no UI changes). Operational build verification is sufficient.
- **No git commit**: Do not commit changes. The orchestrator or user will commit when ready.
