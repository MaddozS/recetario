# Task: Fix Dialog Binding + Document Click Guard in RecipeActionsMenu
Agent: implementer
Date: 2026-06-08
Analysis: [analysis-20260608-1245-fix-1-dialog-binding.md](../analysis/analysis-20260608-1245-fix-1-dialog-binding.md)
Plan: [plan-20260608-1200-recipe-actions-menu.md](../plans/plan-20260608-1200-recipe-actions-menu.md)

## Goal
Fix two JS issues in `RecipeActionsMenu.astro`: (1) dialog binding must handle multiple instances, (2) document click listener must be guarded against SPA accumulation.

## Context
The closer found that `setupRecipeActionsDialogs()` uses `querySelector("[data-open-duplicate-dialog]")` (singular) — on pages with multiple RecipeActionsMenu instances (e.g., recipe list with many cards), only the first card's Duplicar dialog opens. Same issue for delete dialog. Additionally, `setupRecipeActionsMenus()` adds a `document.addEventListener("click")` without a guard, so listeners accumulate across SPA navigations.

## Skills Required
- none

## Files Involved
- `src/components/RecipeActionsMenu.astro`: modify — fix JS section

## Files the Subagent May Create or Edit
- [ ] `src/components/RecipeActionsMenu.astro` — fix dialog binding + document click guard
- [ ] `docs/tasks/task-20260608-1245-fix-1-implementer-report.md` — the report file (mandatory)

## Technical Steps

### Fix 1: Dialog binding — querySelector → querySelectorAll

In `setupRecipeActionsDialogs()`, find all uses of `document.querySelector("[data-open-duplicate-dialog]")` and `document.querySelector("[data-open-delete-dialog]")` and replace with `document.querySelectorAll(...)` + iteration.

**Before (pattern):**
```js
const openBtn = document.querySelector(`[data-open-duplicate-dialog="${duplicateDialogId}"]`);
if (openBtn && ...) {
  openBtn.dataset.duplicateBound = "1";
  openBtn.addEventListener("click", ...);
}
```

**After (pattern):**
```js
const openBtns = document.querySelectorAll(`[data-open-duplicate-dialog="${duplicateDialogId}"]`);
openBtns.forEach((btn) => {
  if (!(btn instanceof HTMLButtonElement)) return;
  if (btn.dataset.duplicateBound === "1") return;
  btn.dataset.duplicateBound = "1";
  btn.addEventListener("click", ...);
});
```

Apply the same pattern for:
- Duplicate open buttons
- Duplicate close buttons
- Delete open buttons
- Delete close buttons

Also apply to `bindDialogBackdrop` calls — ensure each dialog element is found and bound individually (this should already work since each dialog has a unique ID, but verify).

### Fix 2: Document click listener guard

In `setupRecipeActionsMenus()`, wrap the `document.addEventListener("click", ...)` in a document-level guard:

**Before:**
```js
document.addEventListener("click", (e) => {
  // close all menus logic
});
```

**After:**
```js
if (document.documentElement.dataset.ramDocClickBound !== "1") {
  document.documentElement.dataset.ramDocClickBound = "1";
  document.addEventListener("click", (e) => {
    // close all menus logic
  });
}
```

### Verify
- `pnpm astro check` — must pass
- `pnpm build` — must succeed

## Expected Output
- **Code changes**: `src/components/RecipeActionsMenu.astro` (JS section only)
- **Report**: save to `docs/tasks/task-20260608-1245-fix-1-implementer-report.md`

## Guardrails
- Only modify the JS section of `RecipeActionsMenu.astro` — do NOT change HTML/CSS
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Only create/edit the files listed above
