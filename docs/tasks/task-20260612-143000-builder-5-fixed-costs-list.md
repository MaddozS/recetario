# Task: RecipeFixedCosts & PresentationFixedCosts Components
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Create RecipeFixedCosts.astro (manages recipe fixed costs list) and PresentationFixedCosts.astro (manages presentation fixed costs list for create/edit dialog).

## Context
- RecipeFixedCosts: used in Costos Fijos tab on recipe detail page
- PresentationFixedCosts: used in presentation create/edit dialog
- Both use FixedCostCard component
- RecipeFixedCosts: add button opens dialog to create new line, lists all recipe fixed costs
- PresentationFixedCosts: integrated into presentation form, manages fixed costs for that presentation

## Skills Required
- **ui-ux-pro-max**: For UI/UX design patterns, Tailwind, semantic tokens

## Files Involved
- `src/components/RecipeFixedCosts.astro`: [create] — new component for recipe fixed costs management
- `src/components/PresentationFixedCosts.astro`: [create] — new component for presentation fixed costs management

## Files the Subagent May Create or Edit
- [ ] `src/components/RecipeFixedCosts.astro`
- [ ] `src/components/PresentationFixedCosts.astro`
- [ ] `docs/tasks/task-20260612-143000-builder-5-fixed-costs-list-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: ui-ux-pro-max
2. **Create RecipeFixedCosts.astro**:
   - Props: recipeFixedCosts (array), recipeId, isEditing (boolean)
   - Section heading: "Costos Fijos de la Receta"
   - Add button: opens dialog to create new fixed cost line
   - List: maps over recipeFixedCosts, renders FixedCostCard for each
   - Create dialog: form with name, type, base, value, hours (conditional), submit/cancel
   - Form actions: create_recipe_fixed_cost
   - Follow existing dialog patterns (like createPresentationDialog)
   - Client-side JS for dialog open/close, form submission
3. **Create PresentationFixedCosts.astro**:
   - Props: presentationFixedCosts (array), presentationId, isEditing (boolean)
   - Used inside presentation create/edit dialog
   - Similar structure but no PER_HOUR base option
   - Form actions: create_presentation_fixed_cost, update_presentation_fixed_cost, delete_presentation_fixed_cost
   - Can be simpler since it's inside a dialog already
4. **Verify**: Both components render without errors, dialogs work

## Expected Output
- RecipeFixedCosts.astro component created
- PresentationFixedCosts.astro component created
- Both use FixedCostCard
- Report saved to `docs/tasks/task-20260612-143000-builder-5-fixed-costs-list-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Only create the two components
- Use @/components/ui barrel (Button, Input, Dialog, Card, SectionHeading, Icon)
- Use semantic tokens only
- Client-side binding guards required
- Follow existing dialog patterns in the codebase
