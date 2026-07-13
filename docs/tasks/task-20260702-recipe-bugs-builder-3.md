# Task: Disable slide animation for edit-mode navigation

## Assigned Agent
kitchcalc-builder

## Context Received
- Spec: Bug 6 — edit animation plays on edit mode toggle, should only play on cross-recipe navigation
- Plan: `docs/plans/plan-20260702-recipe-bugs.md` → Task 3
- State: `docs/tasks/task-20260702-recipe-bugs-state.json`

## Skills
Selected:
- `ponytail` — one-line change

Discarded:
- `security-best-practices` — no auth/CSRF changes
- `ui-ux-pro-max` — no design work
- `design-system-verify` — no icon changes

May load if needed:
- none

## Scope
Editable files:
- `apps/web/src/components/RecipeActionsMenu.astro`

Forbidden files:
- Everything else

## Instructions

Add `data-astro-reload` attribute to the "Editar" link `<a>` tag. This makes the edit link perform a full page load instead of an Astro View Transition, so the `transition:animate="slide"` on the page wrapper does NOT fire for edit mode entry/exit.

Find the `<a href={editHref}>` tag (around line 79-85) and add `data-astro-reload` to its attributes.

Recipe-to-recipe navigation (different URLs) still uses View Transitions normally.

## Acceptance Criteria
- Clicking "Editar" navigates without slide animation
- Cross-recipe navigation still shows slide animation
- `pnpm astro check` passes

## Reporting
Write report to: `docs/tasks/task-20260702-recipe-bugs-builder-3-report.md`
Return only: done <path>
