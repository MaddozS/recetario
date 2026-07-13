# Task: Recipe Detail Page - Tabs & FinancialSummary
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Restructure src/pages/recipes/[recipe].astro with:
1. Tab navigation (Ingredientes | Costos Fijos | Presentaciones) with URL hash sync
2. Dynamic FinancialSummary showing ingredient cost + recipe fixed cost breakdown
3. Integration of RecipeFixedCosts component in Costos Fijos tab
4. Integration of PresentationFixedCosts in presentation create/edit dialog
5. Feature gate: if !advanced_costs, show legacy single percentage field

## Context
- Current page has header → FinancialSummary → Ingredients → Instructions → Presentations
- Need to reorganize into tabs above FinancialSummary
- FinancialSummary rows become dynamic: Ingredient Cost → each RecipeFixedCost → Total Recipe Cost
- Presentations tab includes PresentationFixedCosts in create/edit dialog
- Calculations: recipeBatchCost = ingredientCost + sum(recipeFixedCosts), presentationBatchCost = recipeBatchCost + sum(presentationFixedCosts)

## Skills Required
- **ui-ux-pro-max**: For UI/UX design patterns, Tailwind, semantic tokens, tab patterns

## Files Involved
- `src/pages/recipes/[recipe].astro`: [modify] — major restructuring

## Files the Subagent May Create or Edit
- [ ] `src/pages/recipes/[recipe].astro`
- [ ] `docs/tasks/task-20260612-143000-builder-6-recipe-page-tabs-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: ui-ux-pro-max
2. **Read current page**: Understand existing structure, calculations, form handlers
3. **Add tab navigation**:
   - Three tabs: Ingredientes, Costos Fijos, Presentaciones
   - Active tab state from URL hash (#ingredientes, #costos-fijos, #presentaciones)
   - Keyboard navigation (ArrowLeft/Right)
   - Client-side JS for tab switching, hash update
4. **Update FinancialSummary**:
   - Calculate ingredientCost (existing)
   - Calculate recipeFixedCostsTotal: iterate recipeFixedCosts, compute each per its type/base
   - Dynamic rows: Ingredient Cost → each fixed cost line (label=name, value=computed amount, color=accent) → Total Recipe Cost → Desired Margin
   - Pass editFields for fixed cost values if in edit mode
5. **Restructure template**:
   - Tab panel for Ingredientes (existing ingredients section)
   - Tab panel for Costos Fijos (RecipeFixedCosts component)
   - Tab panel for Presentaciones (existing presentations section + PresentationFixedCosts in dialog)
6. **Update calculations**:
   - recipeBatchCost = ingredientCost + recipeFixedCostsTotal
   - presentationBatchCost = recipeBatchCost + presentationFixedCostsTotal
   - Pass both to PresentationCard
7. **Add form handlers**:
   - create_recipe_fixed_cost, update_recipe_fixed_cost, delete_recipe_fixed_cost
   - create_presentation_fixed_cost, update_presentation_fixed_cost, delete_presentation_fixed_cost
   - All in existing POST handler with action discriminator
8. **Feature gate**:
   - Check hasFeature(subscription, 'advanced_costs')
   - If false: show legacy single percentage field in FinancialSummary (read-only for Free)
9. **Verify**: pnpm astro check, pnpm eslint

## Expected Output
- Recipe detail page with tab navigation
- Dynamic FinancialSummary with fixed cost breakdown
- RecipeFixedCosts integrated in Costos Fijos tab
- PresentationFixedCosts integrated in presentation dialog
- Feature gate for advanced_costs
- Report saved to `docs/tasks/task-20260612-143000-builder-6-recipe-page-tabs-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Only modify src/pages/recipes/[recipe].astro
- Use @/components/ui barrel
- Use semantic tokens only
- All Prisma queries scoped by ownerId
- Follow existing POST-to-self pattern with CSRF
- Client-side binding guards required
