# Task: Database Schema & Migration
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Add RecipeFixedCost and PresentationFixedCost models to Prisma schema, create migration, and write migration script to convert existing fixedCostsPercentage to "Gastos Operativos" fixed cost line.

## Context
- Current schema has Recipe.fixedCostsPercentage (float)
- Need two new models with enums FixedCostType (PERCENTAGE/AMOUNT) and FixedCostBase (PER_BATCH/PER_UNIT/PER_HOUR)
- Migration must convert existing data: for each recipe with fixedCostsPercentage > 0, create a RecipeFixedCost line with name="Gastos Operativos", type=AMOUNT, base=PER_BATCH, value=ingredientCost * percentage/100 (calculated at migration time per recipe)

## Skills Required
- **prisma-client-api**: For Prisma schema changes and migration operations

## Files Involved
- `prisma/schema.prisma`: [modify] — add new models and enums
- `prisma/migrations/<timestamp>_costos_fijos_avanzados/migration.sql`: [create] — migration file (auto-generated)
- `prisma/seed-fixed-costs.ts`: [create] — migration script to convert existing fixedCostsPercentage

## Files the Subagent May Create or Edit
- [ ] `prisma/schema.prisma`
- [ ] `prisma/seed-fixed-costs.ts`
- [ ] `docs/tasks/task-20260612-143000-builder-1-schema-migration-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: prisma-client-api
2. **Update schema.prisma**: Add FixedCostType enum, FixedCostBase enum, RecipeFixedCost model, PresentationFixedCost model (per spec)
3. **Create migration**: Run `pnpm exec prisma migrate dev --name costos_fijos_avanzados`
4. **Write migration script** (`prisma/seed-fixed-costs.ts`):
   - Load all recipes with fixedCostsPercentage > 0
   - For each recipe, calculate ingredient cost (sum of recipe ingredients)
   - Create RecipeFixedCost: name="Gastos Operativos", type=AMOUNT, base=PER_BATCH, value=ingredientCost * percentage/100
   - Use Prisma $transaction for atomicity
5. **Run migration script**: `pnpm exec tsx prisma/seed-fixed-costs.ts`
6. **Verify**: Check database has new tables and migrated data
7. **Regenerate Prisma client**: `pnpm exec prisma generate`

## Expected Output
- Prisma schema with new models
- Migration file created and applied
- Migration script converts existing data correctly
- Report saved to `docs/tasks/task-20260612-143000-builder-1-schema-migration-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Use `@/lib/db/*` barrel imports, never raw `@/lib/prisma`
- All Prisma queries must include ownerId scoping
- Use $transaction for multi-step operations
- IMMEDIATELY run `pnpm exec prisma generate` after migration
