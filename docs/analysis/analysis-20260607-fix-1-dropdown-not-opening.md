# Analysis Report: Fix 1 — Dropdown Menu Not Opening

Created: 2026-06-07 16:14
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Dropdown menu button (⋮) doesn't open when clicked — no options appear.

## Target Location
- **Primary anchor**: `src/pages/recipes/[recipe].astro` (script section ~line 1290-1320)
- **Layer**: page template — JavaScript scope

## Root Cause
The `<script is:inline>` block containing `setupDropdownMenus()` was nested inside `{isEditMode && (...)}` Astro conditional. The dropdown button renders when `!isEditMode`, but the JS handler only rendered when `isEditMode`. The button had no event listener.

## Files Affected
- `src/pages/recipes/[recipe].astro`: Move dropdown JS outside conditional block

## Verification Criteria
- [ ] Clicking ⋮ button opens dropdown menu
- [ ] Clicking outside closes dropdown
- [ ] `pnpm astro check` passes
