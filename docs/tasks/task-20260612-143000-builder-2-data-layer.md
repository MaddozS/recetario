# Task: Data Layer Updates (Types & DB Operations)
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Update TypeScript types and database operations to support RecipeFixedCost and PresentationFixedCost. Include fixed costs in getRecipeById, createRecipe, updateRecipe, duplicateRecipe, createPresentation, updatePresentation, getPresentationById.

## Context
- New Prisma models exist: RecipeFixedCost, PresentationFixedCost with enums FixedCostType, FixedCostBase
- Need to update types.ts with new types
- Need to update recipes.ts and presentations.ts for full CRUD including fixed costs
- All queries must include ownerId scoping
- Use $transaction for create/update with fixed costs

## Skills Required
- **prisma-client-api**: For Prisma query patterns, transactions, type safety

## Files Involved
- `src/lib/db/types.ts`: [modify] — add FixedCostLine, RecipeFixedCost, PresentationFixedCost types
- `src/lib/db/recipes.ts`: [modify] — update getRecipeById, createRecipe, updateRecipe, duplicateRecipe
- `src/lib/db/presentations.ts`: [modify] — update createPresentation, updatePresentation, getPresentationById
- `src/lib/db/helpers.ts`: [modify] — add normalization helpers for fixed cost fields

## Files the Subagent May Create or Edit
- [ ] `src/lib/db/types.ts`
- [ ] `src/lib/db/recipes.ts`
- [ ] `src/lib/db/presentations.ts`
- [ ] `src/lib/db/helpers.ts`
- [ ] `docs/tasks/task-20260612-143000-builder-2-data-layer-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: prisma-client-api
2. **Update types.ts**:
   - Add FixedCostType: 'PERCENTAGE' | 'AMOUNT'
   - Add FixedCostBase: 'PER_BATCH' | 'PER_UNIT' | 'PER_HOUR'
   - Add FixedCostLine: { id, name, type, base, value, hours? }
   - Add RecipeFixedCost, PresentationFixedCost extending FixedCostLine
   - Update RecipeWithIngredients to include recipeFixedCosts and presentationFixedCosts (per presentation)
   - Update CreateRecipeInput, UpdateRecipeInput to include recipeFixedCosts array
   - Update CreatePresentationInput to include fixedCosts array
2. **Update helpers.ts**:
   - Add normalizeFixedCostType, normalizeFixedCostBase, normalizeFixedCostValue, normalizeFixedCostHours
3. **Update recipes.ts**:
   - Update normalizeRecipeRow to include recipeFixedCosts (include in Prisma query)
   - Update createRecipe to create fixed costs in transaction
   - Update updateRecipe to delete and recreate fixed costs in transaction (like ingredients)
   - Update duplicateRecipe to copy fixed costs
4. **Update presentations.ts**:
   - Update createPresentation to create fixed costs in transaction
   - Update updatePresentation to handle fixed costs
   - Update getPresentationById to include fixed costs
5. **Verify**: Run `pnpm astro check` to catch type errors

## Expected Output
- Types updated with new fixed cost types
- Database operations handle fixed costs CRUD
- All queries scoped by ownerId
- Report saved to `docs/tasks/task-20260612-143000-builder-2-data-layer-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Use `@/lib/db/*` barrel imports, never raw `@/lib/prisma`
- All Prisma queries over tenant data MUST include ownerId scoping
- Use $transaction for create/update with fixed costs
- Follow existing patterns in the codebase (normalizeRecipeRow, helpers)
