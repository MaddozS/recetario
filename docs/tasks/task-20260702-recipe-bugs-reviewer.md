# Task: Review recipe bug fixes

## Assigned Agent
kitchcalc-reviewer

## Context Received
- Spec: Fix 6 bugs on recipe detail page
- Plan: `docs/plans/plan-20260702-recipe-bugs.md`
- State: `docs/tasks/task-20260702-recipe-bugs-state.json`
- Explore: `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`
- Builder reports:
  - `docs/tasks/task-20260702-recipe-bugs-builder-1-report.md`
  - `docs/tasks/task-20260702-recipe-bugs-builder-2-report.md`
  - `docs/tasks/task-20260702-recipe-bugs-builder-3-report.md`

## Skills
Selected:
- `ponytail-review` — check for over-engineering
- `security-best-practices` — verify no ownerId/CSRF issues introduced
- `design-system-verify` — verify semantic tokens, no hardcoded colors, icons in whitelist

Discarded:
- `stripe-best-practices` — no billing changes
- `prisma-client-api` — no new Prisma queries

May load if needed:
- none

## Instructions

Review the implementation against the plan and spec. Focus on:

1. **Correctness**: Do all 6 bug fixes match the plan?
   - Bug 1: Fixed cost add button always visible (RecipeFixedCosts.astro)
   - Bug 2: Per-fixed-cost rows removed from FinancialSummary ([recipe].astro)
   - Bug 3: Desired margin rowIndex fixed ([recipe].astro)
   - Bug 4: FinancialSummary moved above tabs ([recipe].astro)
   - Bug 5: Tab persistence via sessionStorage ([recipe].astro)
   - Bug 6: data-astro-reload on edit link (RecipeActionsMenu.astro)

2. **Project invariants**: 
   - No ownerId scoping issues
   - No hardcoded colors
   - No icon whitelist changes needed
   - No schema/migration changes

3. **Security**:
   - sessionStorage for tab state — no sensitive data stored, pathname-scoped
   - No new POST handlers or auth changes

4. **Over-engineering**: Check for unnecessary abstractions or complexity

## Acceptance Criteria
- All 6 bugs addressed correctly
- No regressions or security issues
- Clean, minimal diffs

## Reporting
Write report to: `docs/tasks/task-20260702-recipe-bugs-reviewer-report.md`
Return only: done <path>
