# Task: Commit S1+S2+S3 approved improvements
Agent: kitchcalc-builder
Date: 2026-06-20
Plan: docs/plans/plan-20260620-1940-approved-improvements.md
Current branch: dev
Previous commit: f4a87bd (monorepo refactor)

## Goal

Stage and commit the 3 approved improvements (S1 pre-compile + S2 skill + S3 pre-flight template) as a single commit on the dev branch.

## Context

The previous commit `f4a87bd` was the monorepo refactor (T1-T12). The S1+S2+S3 builder made additional changes:
- 5 packages now have `tsconfig.json` + `tsconfig.build.json` + dist/ output
- 5 packages have updated `package.json` (build script, exports to dist/)
- `.gitignore` excludes `packages/*/dist/`
- `.agents/skills/monorepo-practices/SKILL.md` created
- `.opencode/agents/kitchcalc-builder.md` has pre-flight section
- `packages/billing/src/billing.ts` has missing `export` added
- `packages/auth/src/env.d.ts` created

## Task Scope

- **Type**: extends-existing (git state)
- **Pre-existing components**: S1+S2+S3 builder changes
- **New deliverables**: One git commit
- **Dependencies**: S1+S2+S3 builder + reviewer completed

## Skills Required

None. Git operation only.

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `docs/tasks/task-20260620-1940-builder-commit-s123-report.md` — the report file (mandatory)

## Technical Steps

1. **Check current git state**:
   ```bash
   git status
   git log --oneline -5
   git branch --show-current
   ```

2. **Stage all changes**:
   ```bash
   git add packages/db/tsconfig.json packages/db/tsconfig.build.json packages/db/package.json
   git add packages/auth/tsconfig.json packages/auth/tsconfig.build.json packages/auth/package.json packages/auth/src/env.d.ts
   git add packages/billing/tsconfig.json packages/billing/tsconfig.build.json packages/billing/package.json packages/billing/src/billing.ts
   git add packages/ui/tsconfig.json packages/ui/tsconfig.build.json packages/ui/package.json
   git add packages/types/tsconfig.json packages/types/tsconfig.build.json packages/types/package.json
   git add .agents/skills/monorepo-practices/
   git add .opencode/agents/kitchcalc-builder.md
   git add .gitignore
   ```

3. **Review what will be committed**:
   ```bash
   git status
   git diff --staged --stat
   ```

4. **Commit with descriptive message**:
   ```bash
   git commit -m "chore: monorepo improvements (pre-compile + skill + pre-flight)

   S1: Pre-compile workspace packages to JS
   - All 5 TS packages (db, auth, billing, ui, types) have tsconfig.json + tsconfig.build.json
   - package.json main/types/exports point to dist/ (compiled output)
   - Build script: tsc --build tsconfig.build.json
   - .gitignore excludes packages/*/dist/
   - Pre-existing bugs fixed: missing export on syncPlansFromStripe, missing env.d.ts

   S2: New skill
   - .agents/skills/monorepo-practices/SKILL.md (223 lines, 9 sections)
   - Documents: shared tooling at root, workspace dep wiring, raw .ts + SSR,
     single-quote import check, README requirement, pre-compilation strategies

   S3: Pre-Flight Checklist
   - .opencode/agents/kitchcalc-builder.md now has Pre-Flight Checklist section
   - 6 items: workspace dep, pnpm install, README, residual imports, task deps, build verify
   - Prevents manual fix cycles for future extraction tasks

   RESIDUAL: Web app SSR/CSR build still fails on Prisma runtime (webcrypto).
   This is a deeper Astro 6 / Vite 7 environment config issue. Packages compile
   cleanly; the issue is in how Vite externalizes @prisma/client for the web bundle.
   To be addressed in a separate effort."
   ```

5. **Verify the commit was created**:
   ```bash
   git log --oneline -3
   git show --stat HEAD | head -40
   ```

6. **Write report** to `docs/tasks/task-20260620-1940-builder-commit-s123-report.md` with:
   - **Skills Used**: list (likely `none`)
   - **Pre-commit state**: git status before
   - **Files committed**: count and summary
   - **Commit hash**: short SHA
   - **Commit message**: full text
   - **Post-commit state**: git log after
   - **Issues encountered**: any + how resolved

## Expected Output

- **Git commit**: One commit on `dev` branch with all S1+S2+S3 changes
- **Report**: `docs/tasks/task-20260620-1940-builder-commit-s123-report.md`

## Guardrails

- **DO NOT** commit `node_modules/`, `dist/`, `.vercel/`, `.astro/` (gitignored)
- **DO NOT** commit `.env` files
- **DO NOT** commit secrets
- **DO NOT** amend previous commits
- **DO NOT** force push
- **DO NOT** create new branches (stay on dev)
- **DO NOT** run `pnpm install`, `pnpm build`, or any project commands
- **DO NOT** add the builder report file or verifier report file to this commit (they were already in the worktree, but they are documentation, not part of the implementation)
- **MUST** verify the commit message is descriptive
- **MUST** verify the commit was created on the dev branch
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list
