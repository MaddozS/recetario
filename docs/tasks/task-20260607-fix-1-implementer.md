# Task: Fix Dropdown Menu Not Opening
Agent: implementer
Date: 2026-06-07
Analysis: docs/analysis/analysis-20260607-fix-1-dropdown-not-opening.md

## Goal
Move dropdown toggle JS outside the `{isEditMode && ...}` conditional so it always renders.

## Technical Steps
1. Read `src/pages/recipes/[recipe].astro` script section (~lines 1290-1320)
2. Find `setupDropdownMenus()` inside `{isEditMode && (...)}` block
3. Move it to its own `<script is:inline>` block after the closing `)}`
4. Run `pnpm astro check`

## Expected Output
- Modified `src/pages/recipes/[recipe].astro`
- Report: `docs/tasks/task-20260607-fix-1-implementer-report.md`

## Guardrails
- Only move the JS block, don't change logic
- DO NOT modify spec, plan, or task files
