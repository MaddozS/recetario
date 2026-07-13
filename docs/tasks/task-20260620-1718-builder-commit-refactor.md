# Task: Commit monorepo refactor changes
Agent: kitchcalc-builder
Date: 2026-06-20
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Current branch: dev

## Goal

Stage and commit all the changes from the monorepo refactor (T1-T12) as a single commit with a descriptive message. This preserves the work and provides a clear checkpoint before the mini cycle for approved improvements.

## Context

The monorepo refactor moved KitchCalc from a single Astro 6 SSR project to a pnpm workspaces + Turborepo structure. The refactor was operationally PASS-with-caveats (T12 verdict).

**Changes to commit**:
- New monorepo structure: `apps/web/` + `packages/{db,auth,billing,ui,types,config}/`
- New config files: `turbo.json`, `vercel.json` (root)
- Updated `pnpm-workspace.yaml` (added `packages:` key)
- Updated `package.json` (workspaces, scripts)
- Moved files: `src/`, `prisma/`, `public/`, configs to `apps/web/`
- Moved auth + billing + UI to `packages/*`
- All consumer imports updated to `@recetario/*`
- 6 package READMEs

**Pre-existing issues NOT to be fixed in this commit** (deferred to approved improvements cycle):
- Prisma SSR build error
- ESLint/Prettier root config
- astro check hints

## Task Scope

- **Type**: extends-existing (git state)
- **Pre-existing components**: All T1-T12 modifications
- **New deliverables**: One git commit
- **Dependencies**: T1-T12 completed

## Skills Required

None. Git operation only.

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `docs/tasks/task-20260620-1718-builder-commit-refactor-report.md` — the report file (mandatory)

## Technical Steps

1. **Check current git state**:
   ```bash
   git status
   git log --oneline -5
   git branch --show-current
   ```
   - Should be on `dev` branch
   - Should have many uncommitted changes from T1-T12

2. **Check git config**:
   ```bash
   git config user.name
   git config user.email
   ```
   - If empty, set locally: `git config user.name "KitchCalc Bot"` and `git config user.email "bot@kitchcalc.com"`

3. **Stage all changes** (excluding any untracked files that aren't part of refactor):
   ```bash
   git add apps/ packages/ turbo.json vercel.json pnpm-workspace.yaml package.json pnpm-lock.yaml
   git add apps/web/astro.config.mjs apps/web/tsconfig.json
   git add apps/web/src/ apps/web/prisma/ apps/web/public/
   ```
   - Stage the refactor changes
   - DO NOT stage: `node_modules/`, `dist/`, `.vercel/`, `.astro/` (gitignored)
   - DO NOT stage: docs/ (these are planning docs, not part of the refactor code)
     - Wait, the docs/ directory has the analysis, spec, plan, tasks. These are part of the cycle. They can be committed.
     - Actually, the user might want to commit docs/ separately or keep them local. Let me default to NOT committing docs/ unless user wants.
   - For safety: stage only the refactor changes (apps/, packages/, configs)

4. **Review what will be committed**:
   ```bash
   git status
   git diff --staged --stat | head -30
   ```
   - Sanity check the file list

5. **Commit with a descriptive message**:
   ```bash
   git commit -m "refactor: convert to pnpm workspaces + Turborepo monorepo

   Move KitchCalc from a single Astro 6 SSR project to a logical monorepo:

   - apps/web/: Astro app (was at project root)
   - packages/db/: Prisma schema + data access layer + cache (was src/lib/db/)
   - packages/auth/: Better Auth + CSRF + rate limiter + password utils (was src/lib/auth*, csrf*, password-*, sign-*, email)
   - packages/billing/: Stripe + subscription + plans + formatters (was src/lib/{stripe,subscription,plans-config,formatters,db/billing})
   - packages/ui/: 8 .astro components + 4 utility files + CSS tokens (was src/components/ui/, src/lib/{accent-colors,dialog,loading-overlay,password-toggle})
   - packages/types/: empty starter for shared TS types
   - packages/config/: shared tsconfig + eslint + prettier bases

   Build: pnpm turbo run build --filter=@recetario/web
   Deploy: Vercel root = apps/web/

   Pre-existing issues NOT addressed by this refactor:
   - Prisma SSR build error (\"webcrypto not exported\") - blocks Vercel deploy
   - ESLint/Prettier root configs broken (T1 residual)
   - 11 astro check hints

   All 10 spec invariants preserved (recipe destructive update, ownerId
   scoping, composite PK, feature flag tiers, etc.). 17+ Prisma queries
   audited. No circular dependencies. See plan + spec for details."
   ```

6. **Verify the commit was created**:
   ```bash
   git log --oneline -3
   git show --stat HEAD | head -30
   ```

7. **Write report** to `docs/tasks/task-20260620-1718-builder-commit-refactor-report.md` with:
   - **Skills Used**: list (likely `none`)
   - **Pre-commit state**: git status before
   - **Files committed**: count and summary
   - **Commit hash**: short SHA
   - **Commit message**: full text
   - **Post-commit state**: git log after
   - **Issues encountered**: any + how resolved

## Expected Output

- **Git commit**: One commit on `dev` branch with all T1-T12 changes
- **Report**: `docs/tasks/task-20260620-1718-builder-commit-refactor-report.md`

## Guardrails

- **DO NOT** commit `node_modules/`, `dist/`, `.vercel/`, `.astro/` (gitignored anyway)
- **DO NOT** commit `.env` files
- **DO NOT** commit secrets (check for any accidentally added)
- **DO NOT** amend previous commits
- **DO NOT** force push
- **DO NOT** create new branches (stay on dev)
- **DO NOT** run `pnpm install`, `pnpm build`, or any project commands
- **MUST** verify the commit message is descriptive
- **MUST** verify the commit was created on the dev branch
- **MUST** use `git config` locally only (not `--global`)
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list
- **Read discipline**: Not applicable (git operations only)
