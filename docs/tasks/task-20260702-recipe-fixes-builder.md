# Task: Recipe Page 5 Fixes

## Assigned Agent
kitchcalc-builder

## Context Received
- Spec: Ajustes en página de receta ([recipe].astro) — 5 issues
- State: docs/tasks/task-20260702-recipe-fixes-state.json
- Explore report: docs/analysis/analysis-20260702-recipe-page-explore.md
- Memory context: AGENTS.md invariants

## Dependency And Parallel Safety
- Depends on: none
- Parallel group: none (single builder task)
- Parallel-safe: n/a

## Skills
Selected:
- ponytail — baseline lazy approach
- design-system-verify — verify no hardcoded colors, correct semantic tokens, ownerId checks in Prisma queries

Discarded:
- security-best-practices — no auth/session changes
- ui-ux-pro-max — not doing visual design from scratch

May load if needed:
- none

## Scope

### Files to edit:
1. `apps/web/src/pages/recipes/[recipe].astro` — FS spacing, tabs, reload after FC mutations
2. `apps/web/src/components/PresentationCard.astro` — remove FC inline breakdown
3. `apps/web/src/components/RecipeFixedCosts.astro` — replace dialog with inline card
4. `apps/web/src/components/PresentationFixedCosts.astro` — replace dialog with inline card
5. `apps/web/src/components/FixedCostCard.astro` — add create mode support

### Forbidden files:
- Any file in packages/ (db, ui, etc.)
- Prisma schema or migrations
- Config files (astro.config.mjs, etc.)

## Instructions

### Fix 1: Financial Summary spacing
In `[recipe].astro` line 942-951: Replace `<div class="pt-6">` with `<div class="py-6 sm:py-8">` to give the FinancialSummary proper vertical breathing room matching the section rhythm.

### Fix 2: Force page reload after fixed cost mutations
After any AJAX fixed cost create/update/delete, trigger a full page reload so the FinancialSummary (SSR-rendered) refreshes. Add `window.location.reload()` in these JS handlers:

**In `RecipeFixedCosts.astro`** (create handler, ~line 333): After successfully appending the card and closing the dialog, add a `setTimeout(() => window.location.reload(), 300)` to let the card appear briefly before reload.

**In `FixedCostCard.astro`** (update handler, ~line 457): After `this.applyFixedCost(payload.fixedCost)` and `this.toggleEdit(true)`, add `setTimeout(() => window.location.reload(), 300)`.

**In `FixedCostCard.astro`** (delete handler, ~line 686): After `this.remove()`, add `setTimeout(() => window.location.reload(), 300)`.

Use `setTimeout` with 300ms to give the UI a brief moment to show the result before the reload takes over. If the page is using View Transitions, the reload will naturally handle the transition.

### Fix 3: Replace "Agregar Costo Fijo" dialog with inline card
Instead of opening a `<dialog>`, clicking "Agregar Costo Fijo" should append a new FixedCostCard in create/edit mode to the list.

**In `FixedCostCard.astro`:**
- Add a `mode` attribute to the `<fixed-cost-card>` custom element: `data-mode="display"` (default) or `data-mode="create"`
- When `data-mode="create"`, the form action is `create_recipe_fixed_cost` instead of `update_fixed_cost`, and the form starts in edit mode (not display mode)
- Add a hidden input for `recipeId` when in create mode
- On cancel in create mode: remove the card entirely instead of reverting to original values
- On save in create mode: use the create endpoint, get the response, update the card to display mode, and reload the page after

**In `RecipeFixedCosts.astro`:**
- Remove the `<dialog>` entirely (lines 62-204)
- Remove the dialog setup script
- Change the "Agregar Costo Fijo" button click handler to:
  a. Create a new FixedCostCard element in create mode
  b. Append it to the `[data-recipe-fixed-costs-container]` container
  c. Remove the empty state if present
- The new card should be rendered using a template string similar to `renderFixedCostCardSnippet` but with create mode markup (or better, generate the HTML inline)

The simplest approach: Generate the create-mode card HTML in the RecipeFixedCosts component (similar to `renderFixedCostCardSnippet` but with `data-mode="create"`, `action=create_recipe_fixed_cost`, and `recipeId` hidden field, and starting in edit-mode visible state). Append this HTML to the container.

**In `PresentationFixedCosts.astro`:**
- Same pattern as RecipeFixedCosts but for presentation-level costs (use `create_presentation_fixed_cost` action and `presentationId`)
- Remove the dialog and its setup script
- Generate inline create card HTML

### Fix 4: Preparación as separate tab
In `[recipe].astro`:

a) Add a 4th tab button in the tablist (after "Presentaciones" button, line 982):
```html
<button role="tab" id="tab-preparacion" class="tab-btn ..." aria-selected="false" aria-controls="panel-preparacion" data-tab="preparacion">
  Preparación
</button>
```

b) Move the RecipeInstructions out of `panel-ingredientes` (lines 1178-1188) into its own tab panel:
```html
<div id="panel-preparacion" role="tabpanel" aria-labelledby="tab-preparacion" class="tab-panel" hidden>
  {!isEditMode && instructions && (
    <RecipeInstructions instructions={instructions} ingredients={ingredients} isPro={hasCookingMode} />
  )}
</div>
```

Remove the `mt-6` wrapper div from RecipeInstructions since it's now in its own panel.

c) Update the tab JS: In the `setupTabs()` function (around line 1497), add `'preparacion'` to the `tabIds` array:
```js
const tabIds = ['ingredientes', 'costos-fijos', 'presentaciones', 'preparacion'];
```

d) The preparation tab should only show when instructions exist and not in edit mode. If there are no instructions, hide the tab button. Add conditional rendering on the tab button:
```html
{!isEditMode && instructions && (
  <button role="tab" id="tab-preparacion" ...>
    Preparación
  </button>
)}
```

### Fix 5: Remove fixed cost breakdown from PresentationCard
In `PresentationCard.astro`, remove lines 206-238 (the entire `<!-- Presentation fixed costs breakdown -->` section). This removes:
- The "Costos Fijos de Presentación" heading
- The per-FC line items with amounts
- The "Total C.F." line
- The `<hr>` separator at line 241

Also remove the `hr` at line 241 (`<hr class="border-border-light my-1 mb-5" />`) since it was the separator between the FC section and the profit section. Replace with `<hr class="border-border-light my-1 mt-4 mb-5" />` to maintain spacing.

## Acceptance Criteria
1. FinancialSummary has `py-6 sm:py-8` spacing, visually separated from header and tabs
2. After creating, updating, or deleting a fixed cost, the page reloads automatically within 300ms
3. Clicking "Agregar Costo Fijo" adds an editable card inline instead of opening a dialog. Saving creates the FC and reloads. Canceling removes the card
4. When a recipe has instructions, a "Preparación" tab appears. Clicking it shows the RecipeInstructions. No tab appears when there are no instructions or in edit mode
5. PresentationCard no longer shows the inline fixed costs breakdown. The PresentationFixedCosts component below each card still works as before
6. `pnpm astro check` passes
7. `pnpm eslint .` passes (or pre-existing failures only)
8. Visual QA: desktop and mobile both look correct

## Reporting
Write report to: docs/tasks/task-20260702-recipe-fixes-report.md
Return only: done docs/tasks/task-20260702-recipe-fixes-report.md
