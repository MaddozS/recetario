# Task: Scope Close Buttons to Their Dialog Instance
Agent: implementer
Date: 2026-06-08
Analysis: [analysis-20260608-1300-fix-2-close-button-scope.md](../analysis/analysis-20260608-1300-fix-2-close-button-scope.md)
Plan: [plan-20260608-1200-recipe-actions-menu.md](../plans/plan-20260608-1200-recipe-actions-menu.md)

## Goal
Fix close button selectors in `RecipeActionsMenu.astro` to scope to their specific dialog instead of querying the whole document.

## Context
The reviewer found that close button selectors (`[data-close-duplicate-dialog]`, `[data-close-delete-dialog]`) use `document.querySelectorAll` globally. On multi-instance pages, the first dialog's iteration binds ALL close buttons to the first dialog. Fix: scope to `dialog.querySelectorAll(...)`.

## Skills Required
- none

## Files the Subagent May Create or Edit
- [ ] `src/components/RecipeActionsMenu.astro` — scope close button selectors
- [ ] `docs/tasks/task-20260608-1300-fix-2-implementer-report.md` — the report file (mandatory)

## Technical Steps

In `setupRecipeActionsDialogs()`, find the close button queries and change them from `document.querySelectorAll` to `dialog.querySelectorAll`:

**Duplicate dialog close buttons (~line 285):**
```js
// Before:
const closeButtons = document.querySelectorAll(`[data-close-duplicate-dialog="${duplicateDialogId}"]`);
// After:
const closeButtons = dialog.querySelectorAll(`[data-close-duplicate-dialog="${duplicateDialogId}"]`);
```

**Delete dialog close buttons (~line 329):**
```js
// Before:
const closeButtons = document.querySelectorAll(`[data-close-delete-dialog="${deleteDialogId}"]`);
// After:
const closeButtons = dialog.querySelectorAll(`[data-close-delete-dialog="${deleteDialogId}"]`);
```

The `dialog` variable is already available in scope (it's the `document.getElementById(duplicateDialogId/deleteDialogId)` result from earlier in each block).

### Verify
- `pnpm astro check` — must pass
- `pnpm build` — must succeed

## Guardrails
- Only modify the two `document.querySelectorAll` calls for close buttons
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
