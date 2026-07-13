# Task: Plan Recipe Page Bug Fixes

## Assigned Agent
kitchcalc-planner

## Context Received
- Spec: Inline user request (6 bugs on recipe page)
- Explore report: `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`
- Memory context: `docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md` (relevant for advanced costs feature context)

## Skills
Selected:
- `ponytail` — keep changes minimal, shortest diff that works
- `security-best-practices` — any POST handler changes need ownerId scoping verification

Discarded:
- `ui-ux-pro-max` — no design work needed, just repositioning/bug fixing
- `stripe-best-practices` — no billing changes
- `prisma-client-api` — no new Prisma queries expected

May load if needed:
- `design-system-verify` — if UI token changes needed

## Scope
Editable files or file groups:
- `apps/web/src/pages/recipes/[recipe].astro` — main page: FinancialSummary row logic, widget position, edit mode, tab/animation behavior
- `packages/ui/src/FinancialSummary.astro` — may need margin editability outside full edit mode
- `apps/web/src/components/RecipeFixedCosts.astro` — "Agregar Costo Fijo" button visibility

Forbidden files:
- `prisma/schema.prisma` — no schema changes
- `packages/db/` — no DB query changes expected
- `src/lib/db/recipes.ts` — no recipe query changes expected

## Instructions

Read the explore report at `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`, then draft a small, verifiable implementation plan covering these 6 bugs:

### Bug 1: Fixed costs "Agregar" button only in edit mode
**Current behavior**: `RecipeFixedCosts.astro` shows the "Agregar Costo Fijo" button only when `isEditing` prop is true.
**Desired behavior**: The button should always be visible. The create/update/delete fixed cost actions already use fetch-based JSON endpoints (they don't depend on the full page edit mode), so the button can work independently of edit mode.

### Bug 2: Duplicate financial sections - "Gastos" per-cost rows + "Total Costos Fijos"
**Current behavior**: In advanced costs mode, `buildFinancialSummaryRows()` (lines 763-808 of [recipe].astro) creates individual rows for each RecipeFixedCost (labeled by `cost.displayName`) plus a "Total Costos Fijos" row at the end.
**Desired behavior**: Remove the individual per-fixed-cost rows. Show only the aggregate "Total Costos Fijos" row.

### Bug 3: Desired margin only editable when there are fixed costs
**Current behavior**: Per the explore report, in advanced mode the edit field is at `rowIndex: 4` for desired margin. But the row count varies based on number of fixed costs. When there are 0 fixed costs, there are fewer rows, and the margin row index is different. The edit field index may not match the actual row position.
**Desired behavior**: Desired margin should always be editable regardless of fixed cost count. The edit field's rowIndex must match the actual row's position.

### Bug 4: Financial widget position
**Current behavior**: FinancialSummary widget is rendered AFTER the tab panels (lines 1345-1354), below them.
**Desired behavior**: FinancialSummary should be rendered ABOVE the tab section (tabs + panels).

### Bug 5: Tab switching + editing redirects to Ingredients
**Current behavior**: When user is on "Costos Fijos" tab and performs an edit (creates fixed cost, updates recipe, etc.), after the operation they end up on the "Ingredientes" tab. Possible causes:
- `update_recipe` POST handler redirects to clean URL but doesn't preserve the hash
- After a View Transition, the `setupTabs` initializes from URL hash, which may not have been set
- The `create_recipe_fixed_cost` etc. endpoints return JSON, so the page doesn't reload — but something may reset the tab state
**Desired behavior**: Tab state should be preserved across edit operations. If the user was on "Costos Fijos" tab and submitted an update, they should stay on "Costos Fijos" tab after the redirect.

### Bug 6: Edit animation plays on any page change, should only play on recipe-to-recipe navigation
**Current behavior**: `transition:animate="slide"` on the outer `<div>` (line 839) applies to all page navigations including entering/exiting edit mode. This means every time the user clicks "Editar" or "Guardar", the slide animation plays.
**Desired behavior**: The slide animation should only play when navigating between different recipes (e.g., from recipe A to recipe B), not when toggling edit mode on the same recipe.

## Plan Requirements
For each bug, the plan must specify:
1. Exact file(s) to edit
2. Specific code change (what to add/remove/modify, with line references from the explore report)
3. Acceptance criteria
4. Validation commands
5. Dependencies between fixes (are any fixes interdependent?)

The plan must also include a Task Dependencies table showing which fixes are parallel-safe vs sequential.

## Acceptance Criteria
- Plan is small, divisible, and verifiable
- Each bug fix is described with exact file and code change
- Task dependencies are clear
- No human approval gates expected (no auth/billing/schema/migration changes)

## Reporting
Write report to: `docs/plans/plan-20260702-recipe-bugs.md`
Return only: done <path>
