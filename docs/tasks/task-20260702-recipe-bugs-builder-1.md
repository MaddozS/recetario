# Task: Fix financial rows, margin editability, widget position, tab persistence

## Assigned Agent
kitchcalc-builder

## Context Received
- Spec: Fix bugs 2,3,4,5 on recipe detail page
- Plan: `docs/plans/plan-20260702-recipe-bugs.md` → Task 1
- State: `docs/tasks/task-20260702-recipe-bugs-state.json`
- Explore report: `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`

## Skills
Selected:
- `ponytail` — minimal diff, shortest path

Discarded:
- `security-best-practices` — no auth/CSRF/ownerId changes in this task
- `ui-ux-pro-max` — no design work
- `design-system-verify` — no UI token changes

May load if needed:
- none

## Scope
Editable files:
- `apps/web/src/pages/recipes/[recipe].astro`

Forbidden files:
- Everything else

## Instructions

Make 4 edits in non-overlapping regions of the file. Read the file first, verify line numbers, then apply changes.

### A) Bug 2 — Remove per-fixed-cost rows from financial summary

In the `buildFinancialRows()` function, find the `hasAdvancedCosts` branch. Remove the for loop that iterates `recipe.recipeFixedCosts` and pushes individual cost rows. Fix indices:

- Remove the for loop pushing per-fixed-cost rows
- Change `highlightIndex` to account for removed rows
- Change `editRowIndices` to account for removed rows

After fix, rows are:
| Index | Label | Color |
|-------|-------|-------|
| 0 | Costo Insumos | danger |
| 1 | Total Costos Fijos | muted |
| 2 | Costo Total Receta | accent (highlight) |
| 3 | Margen Deseado | success (editable) |

### B) Bug 3 — Fix desired margin rowIndex

In `buildFinancialEditFields()`, change the `rowIndex` for desiredMargin to match the new stable row position (index 3 instead of 4).

### C) Bug 4 — Move FinancialSummary above tabs

Move the FinancialSummary div block (currently around lines 1345-1354) from below the tab panels to above the tabs section. Place it between the header section and the tabs block.

### D) Bug 5 — Perserve active tab across redirects

In the `setupTabs` function:
1. In `activateTab`: after the `history.replaceState` call, add sessionStorage persistence with key `recipe-tab:${window.location.pathname}`
2. In initialization: change tab detection order to `hash || sessionStorage || 'ingredientes'`

## Acceptance Criteria
- FinancialSummary always shows 4 stable rows in advanced mode (no per-cost rows)
- Margen Deseado editable regardless of fixed cost count
- FinancialSummary renders above the tabs
- Tab state preserved after edit-mode redirects (sessionStorage, pathname-scoped)
- `pnpm astro check` passes

## Reporting
Write report to: `docs/tasks/task-20260702-recipe-bugs-builder-1-report.md`
Return only: done <path>
