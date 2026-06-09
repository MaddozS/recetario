# Analysis Report: Fix 2 — Reposition Menu Button & Reorder Mobile Mezclas

Created: 2026-06-07 16:18
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Move menu button to same row as title on mobile; reorder Mezclas counter to appear after badge+timestamp.

## Target Location
- **Primary anchor**: `src/pages/recipes/[recipe].astro` (lines 548-669)
- **Layer**: page template — layout structure

## Root Cause
Parent container used `flex-col` on mobile, stacking title and menu button vertically. Mezclas row was positioned before badge+timestamp.

## Files Affected
- `src/pages/recipes/[recipe].astro`: Change container classes, reorder blocks

## Verification Criteria
- [ ] Menu button on same row as title (mobile)
- [ ] Mezclas counter appears after badge+timestamp (mobile)
- [ ] `pnpm astro check` passes
