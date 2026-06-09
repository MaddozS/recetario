# Analysis Report: Fix 3 — Mobile Row Layout (Title + Menu Same Row)

Created: 2026-06-07 16:33
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Menu button still appears below title on mobile — needs to be on same row.

## Target Location
- **Primary anchor**: `src/pages/recipes/[recipe].astro` (line 549, 579)
- **Layer**: page template — CSS classes

## Root Cause
Parent container used `flex-col` on mobile (via `flex flex-col md:flex-row`), stacking children vertically. Right container also used `flex-col` on mobile.

## Files Affected
- `src/pages/recipes/[recipe].astro`: Line 549 (outer container), Line 579 (right container)

## Verification Criteria
- [ ] Title and menu button on same row (all screen sizes)
- [ ] `pnpm astro check` passes
