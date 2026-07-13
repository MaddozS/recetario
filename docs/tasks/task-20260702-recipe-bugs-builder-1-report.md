# Builder Report: task-20260702-recipe-bugs-builder-1

## Task Received
`docs/tasks/task-20260702-recipe-bugs-builder-1.md` — Fix 4 bugs on recipe detail page (Bug 2, 3, 4, 5 from explore analysis).

## Context Received
- Spec: Fix bugs 2,3,4,5 on recipe detail page
- Plan: `docs/plans/plan-20260702-recipe-bugs.md` → Task 1
- State: `docs/tasks/task-20260702-recipe-bugs-state.json`
- Explore report: `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`

## Skills Used
Selected:
- `ponytail` — minimal diff, shortest path

Discarded:
- `security-best-practices` — no auth/CSRF/ownerId changes
- `ui-ux-pro-max` — no design work
- `design-system-verify` — no UI token changes

Added During Execution:
- none

## Files Read
| File | Reason | Decision |
|------|--------|----------|
| `apps/web/src/pages/recipes/[recipe].astro` | Target file for all 4 edits | Edited |

## Files Changed
| File | Change |
|------|--------|
| `apps/web/src/pages/recipes/[recipe].astro` | A) Removed per-fixed-cost for loop from `buildFinancialRows()`, fixed indices; B) Changed `rowIndex` from 4 to 3 in `buildFinancialEditFields()`; C) Moved FinancialSummary from below tab panels to above tabs; D) Added sessionStorage tab persistence |

## Commands Run
| Command | Result | Notes |
|---------|--------|-------|
| `pnpm astro check` | 0 errors, 0 warnings, 11 hints | Hints are pre-existing (unused vars, deprecated APIs) |

## Acceptance Criteria Status
- [x] FinancialSummary always shows 4 stable rows in advanced mode (no per-cost rows)
- [x] Margen Deseado editable regardless of fixed cost count
- [x] FinancialSummary renders above the tabs
- [x] Tab state preserved after edit-mode redirects (sessionStorage, pathname-scoped)
- [x] `pnpm astro check` passes

## Failures Or Blockers
None. The edit tool's glob matching treated `[recipe]` brackets as a character class, so edits were applied via a temp filename then renamed back.

## Notes For Reviewer
- **Bug 2 (A)**: Removed the for loop (lines 768-781) that iterated `recipe.recipeFixedCosts` and pushed individual rows. Changed `highlightIndex: 3 → 2` and `editRowIndices: [4] → [3]` to match the new stable 4-row layout.
- **Bug 3 (B)**: Changed `rowIndex: 4 → 3` in the `hasAdvancedCosts` branch of `buildFinancialEditFields()` — the desiredMargin moved from index 4 to index 3 after removing per-fixed-cost rows.
- **Bug 4 (C)**: Moved FinancialSummary div from below tab panels (after line 1343 `</div>`) to between the mobile multiplier block and the tabs section. Comment changed to just `<!-- Financial Summary -->`.
- **Bug 5 (D)**: Added `sessionStorage.setItem('recipe-tab:${pathname}', tabId)` inside `activateTab` after `history.replaceState`. Changed initial tab detection to `hash || sessionStorage.getItem(...) || 'ingredientes'`.
