# Task: Fix Badge Dark Mode Flash
Agent: implementer
Date: 2025-06-05
Analysis: docs/analysis/analysis-20250605-Badge-dark-mode-flash.md
Plan: docs/plans/plan-20250605-Badge-dark-mode-flash.md

## Goal
Eliminate white flash on Badge component during page reload in dark mode by adding `--color-accent-*` CSS variables to the inline style output of `getAccentCssVars()`.

## Context
The Badge component (`src/components/ui/Badge.astro`) uses `bg-accent-100: var(--color-accent-100)`. The `--color-accent-100` variable is only defined in the external CSS file (`src/styles/global.css` `@theme` block). While SSR sets `--aw-accent-100` via inline style on `<html>`, the intermediate variable `--color-accent-100` is missing until CSS loads, causing a transparent background (white flash) in dark mode.

## Skills Required
- **prisma-client-api**: not needed for this change
- No skills needed — this is a simple string modification

## Files Involved
- `src/lib/accent-colors.ts`: **modify** — `getAccentCssVars()` function to emit `--color-accent-*` alongside `--aw-accent-*`

## Technical Steps

1. **Read** `src/lib/accent-colors.ts` to confirm current code
2. **Modify** the return statement in `getAccentCssVars()` (around line 165):
   - Current: `return \`--aw-accent-${shade}:${value}\`;`
   - Change to: `return \`--aw-accent-${shade}:${value};--color-accent-${shade}:${value}\`;`
3. **Verify** with `pnpm build` — should succeed without errors
4. **Write documentation files**:
   - `docs/analysis/analysis-20250605-Badge-dark-mode-flash.md` (content provided above)
   - `docs/plans/plan-20250605-Badge-dark-mode-flash.md` (content provided above)
   - `docs/tasks/task-20250605-implementer-Badge-dark-mode-flash.md` (this file)

## Expected Output
- Modified: `src/lib/accent-colors.ts` (1 line change in `getAccentCssVars`)
- Created: `docs/analysis/analysis-20250605-Badge-dark-mode-flash.md`
- Created: `docs/plans/plan-20250605-Badge-dark-mode-flash.md`
- Created: `docs/tasks/task-20250605-implementer-Badge-dark-mode-flash.md`
- **Report**: save to `docs/tasks/task-20250605-implementer-Badge-dark-mode-flash-report.md`

## Guardrails
- Do NOT modify any other files
- Do NOT change the `--aw-accent-*` output — it's still needed by global.css
- Do NOT modify spec files, plan files, or other task files (except creating new ones as specified)
- Run `pnpm build` to verify the change doesn't break anything
- Write ALL findings, changes, and command results to the report file

## IMMUTABLE
Never modify existing spec files, analysis reports, plans, or task files from other agents. You may CREATE new documentation files as specified above.
