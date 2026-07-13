# Task: Recipe Duplication Updates
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Update duplicateRecipe in src/lib/db/recipes.ts to copy recipe and presentation fixed costs.

## Context
- Current duplicateRecipe copies ingredients and presentations
- Need to also copy recipeFixedCosts and presentation fixed costs
- Recipe fixed costs: map over source.recipeFixedCosts and create for new recipe
- Presentation fixed costs: for each presentation, after creating it, copy its fixed costs

## Skills Required
- **prisma-client-api**: For Prisma transaction patterns

## Files Involved
- `src/lib/db/recipes.ts`: [modify] — update duplicateRecipe function

## Files the Subagent May Create or Edit
- [ ] `src/lib/db/recipes.ts`
- [ ] `docs/tasks/task-20260612-143000-builder-8-duplication-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: prisma-client-api
2. **Read current duplicateRecipe**: Understand existing structure
3. **Update duplicateRecipe**:
   - After creating new recipe, create recipe fixed costs from source.recipeFixedCosts
   - For each presentation, after creating it, create presentation fixed costs from source.presentationFixedCosts (need to include in source data)
4. **Verify**: Check that getRecipeById includes presentation fixed costs (already done in task 2)
5. **Run astro check and eslint

## Expected Output
- duplicateRecipe copies all fixed costs
- Report saved to `docs/tasks/task-20260612-143000-builder-8-duplication-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Only modify src/lib/db/recipes.ts
- Use $transaction for atomicity
- All queries scoped by ownerId
