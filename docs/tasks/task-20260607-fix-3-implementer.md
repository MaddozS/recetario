# Task: Fix Mobile Row Layout — Title + Menu Same Row
Agent: implementer
Date: 2026-06-07
Analysis: docs/analysis/analysis-20260607-fix-3-mobile-row-layout.md

## Goal
Change containers from `flex-col` to `flex` row layout so title and menu button stay on same row on mobile.

## Technical Steps
1. Read `src/pages/recipes/[recipe].astro` lines 548-580
2. Line 549: Change `flex flex-col md:flex-row md:items-end md:justify-between` to `flex items-start justify-between`
3. Line 579: Change `flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center` to `flex items-center gap-2`
4. Run `pnpm astro check`

## Expected Output
- Modified `src/pages/recipes/[recipe].astro`
- Report: `docs/tasks/task-20260607-fix-3-implementer-report.md`

## Guardrails
- Only change those two class strings
- DO NOT modify spec, plan, or task files
