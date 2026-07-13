# Cycle Summary: Recipe Page Bug Fixes

**Task ID**: `20260702-recipe-bugs`
**Status**: accepted
**Files changed**: 3

## What changed

### Bug 1 — "Agregar Costo Fijo" button now always visible
**File**: `apps/web/src/components/RecipeFixedCosts.astro`
- Removed `isEditing &&` guards from the "Agregar Costo Fijo" button and create dialog
- Button now renders in both view and edit mode — create/update/delete endpoints are fetch-based JSON, don't need full edit mode

### Bug 2 — Per-fixed-cost rows removed from FinancialSummary
**File**: `apps/web/src/pages/recipes/[recipe].astro`
- Removed the for loop that iterated `recipe.recipeFixedCosts` and pushed individual rows per fixed cost
- FinancialSummary now shows 4 stable rows: Costo Insumos, Total Costos Fijos, Costo Total Receta, Margen Deseado
- Fixed indices: `highlightIndex: 2`, `editRowIndices: [3]`

### Bug 3 — Desired margin always editable
**File**: `apps/web/src/pages/recipes/[recipe].astro`
- Changed `rowIndex: 4 → 3` in `buildFinancialEditFields()` to match stable row positions
- Margin field editable regardless of fixed cost count

### Bug 4 — FinancialSummary moved above tabs
**File**: `apps/web/src/pages/recipes/[recipe].astro`
- Moved FinancialSummary from below tab panels to between header and tabs section

### Bug 5 — Tab state persists across redirects
**File**: `apps/web/src/pages/recipes/[recipe].astro`
- Added `sessionStorage.setItem('recipe-tab:${pathname}', tabId)` in `activateTab`
- Changed initial tab detection to `hash || sessionStorage || 'ingredientes'`
- Pathname-scoped key prevents cross-recipe leakage

### Bug 6 — No slide animation on edit mode toggle
**File**: `apps/web/src/components/RecipeActionsMenu.astro`
- Added `data-astro-reload` to the "Editar" link
- Forces full page load for edit mode entry/exit, bypassing View Transition animation
- Cross-recipe navigation still uses slide animation

## Commands run
- `pnpm astro check` — 0 errors, 0 warnings

## Review outcome
**Accepted** by kitchcalc-reviewer. No security issues, no design system violations, minimal clean diffs.

## Known pre-existing issues (not introduced)
- `pnpm eslint .` fails — root eslint config can't resolve workspace-level eslint packages
- `pnpm build` fails — billing package has `dotenv` bundling issue from monorepo refactoring

## Remaining risks
- SessionStorage tab persistence — if storage is unavailable, falls back to 'ingredientes' (acceptable)
