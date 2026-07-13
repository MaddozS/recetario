# Analysis: Fix Dialog Binding + Document Click Guard

Created: 2026-06-08 12:45
Orchestrator: orchestrator
Complexity: ajuste (fix-1)

## Problem Statement
`RecipeActionsMenu.astro` has two JS issues: (1) `setupRecipeActionsDialogs()` uses `querySelector` (singular) so only the first instance's dialogs get bound on multi-instance pages, (2) `setupRecipeActionsMenus()` adds `document.addEventListener("click")` without a guard, accumulating listeners across SPA navigations.

## Root Cause
(1) Dialog binding copied the single-instance pattern from `[recipe].astro` without generalizing for multiple instances. (2) Document click listener carried forward from original `RecipeGridCard.astro` without a document-level guard.

## Files Affected
- `src/components/RecipeActionsMenu.astro` — lines ~253-350 (JS section)

## Verification Criteria
- `querySelector` replaced with `querySelectorAll` + iteration for dialog trigger binding
- Document click listener wrapped in `documentElement.dataset.ramDocClickBound` guard
- `pnpm astro check` passes
- `pnpm build` succeeds
