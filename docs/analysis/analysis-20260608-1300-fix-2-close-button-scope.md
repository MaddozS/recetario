# Analysis: Scope Close Buttons to Their Dialog Instance

Created: 2026-06-08 13:00
Orchestrator: orchestrator
Complexity: ajuste (fix-2)

## Problem Statement
Close button selectors in `setupRecipeActionsDialogs()` use `document.querySelectorAll("[data-close-duplicate-dialog]")` globally. On multi-instance pages, the first dialog iteration binds ALL close buttons to the first dialog. Non-first dialogs' "Cancelar" buttons don't work.

## Root Cause
Close button query is document-wide instead of scoped to the specific dialog element.

## Files Affected
- `src/components/RecipeActionsMenu.astro` — lines ~285, ~329

## Verification Criteria
- Close button selectors scoped to their dialog: `dialog.querySelectorAll(...)` instead of `document.querySelectorAll(...)`
- `pnpm astro check` passes
- `pnpm build` succeeds
