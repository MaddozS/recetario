# Task T5: UI spike validation (decision: continue or stop)
Agent: kitchcalc-validator
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T4 (completed with PASS verdict)

## Goal

Independently validate the T4 UI spike (Button.astro extracted to `packages/ui/`). Run operational checks (build, type-check) and visual QA (Button renders correctly at desktop + mobile). Make the go/no-go decision for T6 (full UI extraction).

## Context

T4 (kitchcalc-builder) reported PASS for the UI spike: Button.astro moved to `packages/ui/src/`, build succeeds, astro check passes, dev server boots. But T4 explicitly noted "Full visual regression check is for T5 (kitchcalc-validator)".

This validator task:
1. Re-runs the operational checks independently
2. Verifies the dev server actually serves a page with Button rendered
3. Captures any visual issues (icon, color, sizing, hover states, accessibility)
4. Reports a clear PASS/FAIL verdict

## Task Scope

- **Type**: validation
- **Pre-existing components**:
  - T4 output: `packages/ui/src/Button.astro`, updated `apps/web/src/components/ui/index.ts`
- **New deliverables**: report with verdict
- **Dependencies**: T4 completed (verified ✓)

## Skills Required

- **design-system-verify**: For verifying Button uses semantic tokens correctly and has no hardcoded colors

## Files Involved

- `docs/tasks/task-20260620-1718-builder-t4-ui-spike-report.md` — T4 report (for context)
- `packages/ui/src/Button.astro` — the extracted component
- `apps/web/src/components/ui/index.ts` — barrel re-export
- `apps/web/src/pages/index.astro` (or other page) — to find Button usage

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `docs/tasks/task-20260620-1718-validator-t5-ui-spike-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skill**: `design-system-verify`

2. **Read T4 report** for context:
   - `docs/tasks/task-20260620-1718-builder-t4-ui-spike-report.md`
   - Note any issues flagged

3. **Verify build** (independent of T4):
   ```bash
   pnpm install
   pnpm turbo run build --filter=@recetario/web
   ```
   - Should complete without errors
   - Note: build time, any warnings

4. **Verify astro check** (independent of T4):
   ```bash
   pnpm --filter @recetario/web astro check
   ```
   - Should report 0 errors, 0 warnings
   - Compare to T4's hint count (should be same — no new hints)

5. **Find a page that uses Button**:
   ```bash
   grep -rln "Button" apps/web/src/pages/ apps/web/src/components/ 2>/dev/null | head -5
   ```
   - Likely candidates: `pages/index.astro` (landing), `pages/recipes/index.astro`, `pages/ingredients.astro`
   - Pick one that has visible Button (e.g., "Sign In" button on landing)

6. **Start dev server**:
   ```bash
   cd apps/web && pnpm dev &
   DEV_PID=$!
   sleep 10  # Wait for "ready"
   ```
   - Wait for "Local: http://localhost:4321" message
   - If 4321 is taken, will use 4322 (T1 already had this)

7. **Verify server is responding**:
   ```bash
   curl -s -o /dev/null -w "%{http_code}" http://localhost:4321/
   ```
   - Should return 200

8. **Visual QA — fetch the page and check for Button**:
   ```bash
   curl -s http://localhost:4321/ | grep -c "astro-island"
   ```
   - Should return > 0 (page has interactive elements)
   - For SSR pages, check for actual Button HTML
   ```bash
   curl -s http://localhost:4321/ | grep -E '<button|<a.*class' | head -5
   ```

9. **Compare Button HTML before/after** (if possible):
   - This is hard to do without saving a snapshot
   - Alternative: visually inspect the dev server output via curl + check structure
   - Document what you see (icon, color, size, etc.)

10. **Check Button.astro source for any anomalies**:
    - Open `packages/ui/src/Button.astro`
    - Verify byte-identical to original (compare with `apps/web/src/components/ui/Button.astro` which was deleted — use git)
    - Verify all imports resolve (Icon from astro-icon/components)
    - Verify Tailwind classes use semantic tokens (no hardcoded colors)

11. **Stop dev server**:
    ```bash
    kill $DEV_PID 2>/dev/null
    ```

12. **Decision**:
    - **PASS** if all checks pass: continue to T6 (full UI extraction)
    - **FAIL** if any check fails: abort UI extraction strategy, keep UI in apps/web

13. **Write report** to `docs/tasks/task-20260620-1718-validator-t5-ui-spike-report.md` with:
    - **Skills Used**: list (e.g., `design-system-verify`)
    - **Operational checks**: results of build, astro check
    - **Dev server**: started successfully, served a page
    - **Button rendering**: what you verified (HTML structure, classes, etc.)
    - **Design system**: hardcoded colors? semantic tokens?
    - **Issues encountered**: any + how resolved
    - **Verdict**: PASS or FAIL
    - **Recommendation**: continue to T6, or abort and document why

## Expected Output

- **Report**: `docs/tasks/task-20260620-1718-validator-t5-ui-spike-report.md` with verdict and details

## Guardrails

- **DO NOT** modify any code (this is validation only)
- **DO NOT** commit anything
- **DO NOT** trigger a Vercel deploy
- **DO NOT** run `pnpm eslint .` or `pnpm format` (pre-existing T1 broken state — not your concern)
- **MUST** start the dev server and verify it serves a page
- **MUST** verify Button HTML appears in the page output
- **MUST** verify no hardcoded colors in `packages/ui/src/Button.astro`
- **MUST** give a clear PASS/FAIL verdict
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Only create the report file. Nothing else.
- **Read discipline**: Max 15 file reads. Should be ~3 reads (T4 report, Button.astro, page sample).
