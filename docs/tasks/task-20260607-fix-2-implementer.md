# Task: Reposition Menu Button & Reorder Mobile Mezclas
Agent: implementer
Date: 2026-06-07
Analysis: docs/analysis/analysis-20260607-fix-2-reposition-menu-button.md

## Goal
Change mobile layout so menu button shares row with title; reorder Mezclas after badge+timestamp.

## Technical Steps
1. Read `src/pages/recipes/[recipe].astro` lines 548-669
2. Change Row 1 container from `flex flex-col md:flex-row` to `flex items-start justify-between`
3. Simplify right container from `flex w-full flex-col ...` to `flex items-center gap-2`
4. Swap order of Mezclas mobile row and badge+timestamp row
5. Run `pnpm astro check`

## Expected Output
- Modified `src/pages/recipes/[recipe].astro`
- Report: `docs/tasks/task-20260607-fix-2-implementer-report.md`

## Guardrails
- Only change class strings and block order
- DO NOT modify spec, plan, or task files
