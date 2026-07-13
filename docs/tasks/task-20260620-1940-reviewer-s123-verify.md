# Task: Verify S1+S2+S3 approved improvements
Agent: kitchcalc-reviewer
Date: 2026-06-20
Mini Analysis: docs/analysis/analysis-20260620-1940-approved-improvements.md
Mini Plan: docs/plans/plan-20260620-1940-approved-improvements.md
Builder Report: docs/tasks/task-20260620-1940-builder-s123-approved-report.md
Depends on: Builder dispatch completed (S1 partial, S2 PASS, S3 PASS)

## Goal

Read-only verification of the 3 approved improvements:
- **S1**: Pre-compile workspace packages to JS (partial — 5/6 packages compile, web app SSR still fails)
- **S2**: Add monorepo-practices skill
- **S3**: Add pre-flight template to kitchcalc-builder

Verify:
- S2 and S3 are properly implemented
- S1 partial implementation is correct (packages compile, but web app build still has issues)
- Only allowed files were modified
- No NEW regressions

Give a clear PASS/FAIL/PASS-with-caveats verdict.

## Context

S1+S2+S3 builder reported:
- S1: 5/6 packages compile, but web app SSR build still fails (residual Astro 6 environment config issue)
- S2: skill created with 9 sections
- S3: pre-flight template added to kitchcalc-builder.md
- Pre-existing bugs found and fixed: missing `export` on `syncPlansFromStripe`, missing types
- 1 residual risk: web app SSR build error NOT fixed (Astro 6 / Vite 7 environment config issue)

The user explicitly wanted "unblock Vercel deploy" via S1. That goal is only partially achieved (packages compile, but web app still has SSR issue).

## Task Scope

- **Type**: validation
- **Pre-existing components**: S1+S2+S3 builder output
- **New deliverables**: report with verdict
- **Dependencies**: S1+S2+S3 builder completed

## Skills Required

- **prisma-client-api**: For understanding the S1 partial fix
- **design-system-verify**: For S2 (if skill has design system content) — likely not needed

## Files Involved

**Files to read**:
- `docs/tasks/task-20260620-1940-builder-s123-approved-report.md` (builder report)
- `.agents/skills/monorepo-practices/SKILL.md` (S2 output)
- `.opencode/agents/kitchcalc-builder.md` (S3 output)
- `packages/{db,auth,billing,ui,types}/tsconfig.json` and `tsconfig.build.json` (S1 output)
- `packages/{db,auth,billing,ui,types}/package.json` (S1 output)
- `turbo.json` (S1 output)
- `.gitignore` (S1 output)

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `docs/tasks/task-20260620-1940-reviewer-s123-verify-report.md` — the report file (mandatory)

## Technical Steps

1. **Read builder report** for context on what was done

2. **Verify S1 (pre-compile)**:
   - Read all 5 packages' `tsconfig.json` and `tsconfig.build.json` (10 files)
   - Verify each has `outDir`, `rootDir`, `declaration` correctly set
   - Read all 5 packages' `package.json` (db, auth, billing, ui, types)
   - Verify `main`/`types`/`exports` point to `dist/`
   - Verify `build` script exists
   - Run `pnpm turbo run build` — confirm 5/6 packages succeed, web app fails
   - Document the build status for each task in the pipeline
   - **Decision**: is the S1 partial success acceptable? (Builder tried hard, residual is Astro infrastructure issue)
     - YES (with caveat): if the partial success is well-documented and the user understands Vercel deploy still needs a separate fix
     - NO (FAIL): if the partial success introduces NEW regressions or breaks things

3. **Verify S2 (skill)**:
   - Read `.agents/skills/monorepo-practices/SKILL.md`
   - Verify it has all 9 sections from the task spec:
     - Frontmatter
     - Overview (with 6 packages table)
     - Shared tooling at root
     - Workspace dep wiring
     - Raw .ts exports + SSR
     - Single-quote import check
     - README requirement
     - Pre-compilation strategies
     - Cross-references
     - Examples
   - Verify content is practical (not just headers)
   - Verify cross-references to other skills work (file paths exist)

4. **Verify S3 (pre-flight template)**:
   - Read `.opencode/agents/kitchcalc-builder.md`
   - Verify it has the "Pre-Flight Checklist (Extraction Tasks)" section
   - Verify the section has 6 checklist items from the task spec
   - Verify it's referenced from the main task template (if applicable)

5. **Verify only allowed files were modified**:
   - List all files changed (via git diff or direct comparison)
   - Cross-reference against the "Files the Subagent May Create or Edit" list in the task file
   - Any file outside the list = SCOPE VIOLATION (FAIL)

6. **Verify no NEW regressions**:
   - Run `pnpm --filter @recetario/web astro check`
   - Should still pass (0 errors)
   - Run `pnpm dev` (boot only)
   - Should still boot
   - Spot-check 2-3 consumer files to verify they still work
   - Any new error = REGRESSION (FAIL)

7. **Decision**:
   - **PASS**: All 3 suggestions correctly implemented, no new regressions
   - **PASS-with-caveats**: 2/3 fully done, 1 has known partial issue (S1 web app build)
   - **FAIL**: NEW regressions or scope violations

8. **Write report** to `docs/tasks/task-20260620-1940-reviewer-s123-verify-report.md` with:
   - **Skills Used**: list
   - **S1 verification**: package compilation status, web app build status, exports resolution
   - **S2 verification**: SKILL.md sections, content quality, cross-references
   - **S3 verification**: pre-flight section present, 6 items, references
   - **Scope audit**: only allowed files modified? List any violations.
   - **Regression check**: astro check, dev server, spot-checks
   - **Verdict**: PASS / PASS-with-caveats / FAIL
   - **Recommendation**: proceed, or follow-up needed

## Expected Output

- **Report**: `docs/tasks/task-20260620-1940-reviewer-s123-verify-report.md` with verdict

## Guardrails

- **READ-ONLY**: Do not modify any code, agent spec, or skill file. The only file you may create is the report.
- **DO NOT** commit anything
- **DO NOT** run `pnpm eslint .` or `pnpm format` (pre-existing broken)
- **DO NOT** try to fix the Prisma SSR build error (builder already tried, it's a deeper Astro infrastructure issue)
- **MUST** verify all 3 suggestions against acceptance criteria
- **MUST** audit scope (only allowed files modified)
- **MUST** check for regressions
- **MUST** give a clear verdict
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Only create the report file. Nothing else.
- **Read discipline**: Max 15 file reads. Should be ~13 reads (5 tsconfig pairs + 5 package.jsons + turbo + gitignore + skill + agent spec + report).
