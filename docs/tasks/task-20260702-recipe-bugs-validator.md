# Task: Validate recipe bug fixes

## Assigned Agent
kitchcalc-validator

## Context Received
- Plan: `docs/plans/plan-20260702-recipe-bugs.md`
- State: `docs/tasks/task-20260702-recipe-bugs-state.json`
- Builder reports:
  - `docs/tasks/task-20260702-recipe-bugs-builder-1-report.md`
  - `docs/tasks/task-20260702-recipe-bugs-builder-2-report.md`
  - `docs/tasks/task-20260702-recipe-bugs-builder-3-report.md`

## Skills
Selected:
- `ui-ux-pro-max` — visual QA needed for FinancialSummary layout, widget position, tab behavior

Discarded:
- `security-best-practices` — no auth changes

May load if needed:
- `design-system-verify` — if visual inspection reveals hardcoded colors

## Instructions

Run deterministic checks on the changed files:

1. **Type check**: `pnpm astro check` — must pass with 0 errors
2. **Lint**: `pnpm eslint .` — report any new errors (pre-existing ones are acceptable)
3. **Build check**: `pnpm build` — must succeed
4. **Visual QA** (requires dev server):
   - Start `pnpm dev`
   - Verify FinancialSummary renders above tabs (not below)
   - Verify "Agregar Costo Fijo" button is visible in view mode (no edit mode)
   - Verify desired margin field is editable in edit mode
   - Verify tab switching works and state persists

## Acceptance Criteria
- `pnpm astro check` passes
- `pnpm build` passes
- Visual QA confirms widget above tabs, fixed cost button visible, margin editable

## Reporting
Write report to: `docs/tasks/task-20260702-recipe-bugs-validator-report.md`
Return only: done <path>
