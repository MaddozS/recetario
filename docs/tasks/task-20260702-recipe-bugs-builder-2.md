# Task: Always show "Agregar Costo Fijo" button

## Assigned Agent
kitchcalc-builder

## Context Received
- Spec: Bug 1 — fixed cost add button only visible in edit mode
- Plan: `docs/plans/plan-20260702-recipe-bugs.md` → Task 2
- State: `docs/tasks/task-20260702-recipe-bugs-state.json`
- Explore report: `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`

## Skills
Selected:
- `ponytail` — minimal diff

Discarded:
- `security-best-practices` — no auth/CSRF/ownerId changes
- `ui-ux-pro-max` — no design work

May load if needed:
- none

## Scope
Editable files:
- `apps/web/src/components/RecipeFixedCosts.astro`

Forbidden files:
- Everything else

## Instructions

Remove the `isEditing &&` guards from two locations in RecipeFixedCosts.astro:

1. **Button** (around line 30): Remove the `isEditing && (` wrapper around the "Agregar Costo Fijo" button and its closing `)`
2. **Dialog** (around line 67): Remove the `isEditing && (` wrapper around the create dialog and its closing `)`

The `isEditing` prop can remain in Props interface — just stop reading it. The FixedCostCard component handles its own edit/display toggle independently. The create/update/delete endpoints are fetch-based JSON and don't need full edit mode.

## Acceptance Criteria
- "Agregar Costo Fijo" button visible in view mode (no edit mode needed)
- Create dialog opens and submits correctly
- `pnpm astro check` passes

## Reporting
Write report to: `docs/tasks/task-20260702-recipe-bugs-builder-2-report.md`
Return only: done <path>
