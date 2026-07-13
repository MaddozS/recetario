# Task: Fix Minor ESLint Issues
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Fix the 13 minor eslint errors in src/pages/recipes/[recipe].astro reported by validator:
- Remove unused imports: RecipeFixedCost, InstructionsEditor
- Remove unused variables: precioVentaSugeridoRecipe, financialEditRowIndices, recipeIngredientIds
- The `as any` casts are existing codebase pattern, leave as-is

## Context
- Validator found these issues, they are minor and don't affect functionality
- Need to clean up unused code

## Skills Required
- **verification-before-completion**: For verification

## Files Involved
- `src/pages/recipes/[recipe].astro`: [modify] — remove unused imports/variables

## Files the Subagent May Create or Edit
- [ ] `src/pages/recipes/[recipe].astro`
- [ ] `docs/tasks/task-20260612-143000-builder-fix-eslint-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: verification-before-completion
2. **Fix unused imports**: Remove `RecipeFixedCost` from line 2, `InstructionsEditor` from line 24
3. **Fix unused variables**: Remove `precioVentaSugeridoRecipe` computation (line 744), remove `financialEditRowIndices` destructuring (line 826), remove `recipeIngredientIds` (line 609)
4. **Run `pnpm astro check` and `pnpm eslint src/pages/recipes/[recipe].astro`** to verify
5. **Report results**

## Expected Output
- ESLint errors resolved
- Report saved to `docs/tasks/task-20260612-143000-builder-fix-eslint-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Only modify src/pages/recipes/[recipe].astro
- Don't change the `as any` casts (existing pattern)
