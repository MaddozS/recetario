# Task: Verify Dialog Binding Fix in RecipeActionsMenu
Agent: reviewer
Date: 2026-06-08
Analysis: [analysis-20260608-1245-fix-1-dialog-binding.md](../analysis/analysis-20260608-1245-fix-1-dialog-binding.md)
Plan: [plan-20260608-1200-recipe-actions-menu.md](../plans/plan-20260608-1200-recipe-actions-menu.md)

## Goal
Verify two fixes in `RecipeActionsMenu.astro`: (1) dialog binding uses `querySelectorAll` for multi-instance support, (2) document click listener has SPA-safe guard.

## Context
The closer found two JS issues. The implementer fixed both. Verify the fixes are correct and complete.

## Skills Required
- none

## Files Involved
- `src/components/RecipeActionsMenu.astro`: read — verify JS fixes

## Files the Subagent May Create or Edit
- [ ] `docs/tasks/task-20260608-1245-fix-1-reviewer-report.md` — the report file (mandatory)

## Technical Steps

### 1. Verify Fix 1: Dialog binding
- Read `src/components/RecipeActionsMenu.astro` JS section
- Confirm: `setupRecipeActionsDialogs()` uses `querySelectorAll` (not `querySelector`) for:
  - `[data-open-duplicate-dialog]` triggers
  - `[data-open-delete-dialog]` triggers
- Confirm: each trigger gets individual `data-*-bound` guard
- Confirm: inner close button binding also uses `querySelectorAll`

### 2. Verify Fix 2: Document click guard
- Confirm: `document.addEventListener("click", ...)` is wrapped in `documentElement.dataset.ramDocClickBound` guard
- Confirm: guard is checked BEFORE adding the listener

### 3. Build verification
- `pnpm astro check` — must pass
- `pnpm build` — must succeed

### 4. Edge case analysis
- Multiple RecipeGridCard instances on same page: each card's Duplicar dialog should be independently bound
- SPA navigation: document click listener should NOT accumulate

## Expected Output
- **Report**: save to `docs/tasks/task-20260608-1245-fix-1-reviewer-report.md` with:
  - Fix 1 verification (pass/fail)
  - Fix 2 verification (pass/fail)
  - Build results
  - Overall verdict: PASS or FAIL

## Guardrails
- Read-only — do NOT modify any source files
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Only create the report file listed above
