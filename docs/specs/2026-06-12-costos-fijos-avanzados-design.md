# Spec: Costos Fijos Avanzados

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

Created: 2026-06-12 14:30
Orchestrator: orchestrator
Status: approved
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md

## Problem / Need
Current fixed costs system is a single percentage (`fixedCostsPercentage`) applied on top of ingredient costs. Real businesses need multiple line items: labor, electricity, gas, packaging, rent, etc. Each with different calculation bases (per batch, per unit produced, per hour). Also need fixed costs per presentation (bags, cupcake liners, boxes) that are additional to recipe-level fixed costs.

## Context (from Phase 1 Analysis)
- Recipe detail page: header → FinancialSummary → Ingredients → Instructions → Presentations
- Current `fixedCostsPercentage` on Recipe model (float)
- Feature flag `advanced_costs` exists but disabled for all tiers
- PresentationCard receives batch cost as prop, calculates unit cost internally

## Success Criteria
- [ ] New Prisma models: `RecipeFixedCost`, `PresentationFixedCost` with proper relations
- [ ] Migration converts existing `fixedCostsPercentage` to a "Gastos Operativos" fixed cost line (type: per batch, amount = percentage of ingredient cost)
- [ ] Recipe detail page reorganized into tabs: Ingredients | Costos Fijos | Presentaciones
- [ ] FinancialSummary shows dynamic breakdown: Costo Insumos → each fixed cost line → Costo Total Real → Margen
- [ ] Recipe fixed costs: multiple lines, each with name, type (percentage|amount), calculation base (per_batch|per_unit|per_hour), value
- [ ] Presentation fixed costs: multiple lines per presentation, each with name, type (percentage|amount), calculation base (per_batch|per_unit), value
- [ ] `advanced_costs` feature flag enabled for Basic + Pro tiers
- [ ] Recipe duplication copies fixed costs (both recipe and presentation level)
- [ ] PresentationCard calculates unit cost including presentation fixed costs
- [ ] All calculations respect multiplier (batch scaling)

## User Stories
- As a baker, I want to add multiple fixed cost lines (labor, gas, electricity) to my recipe so I see true production cost
- As a baker, I want to choose how each cost is calculated (per batch, per piece, per hour) so it matches my reality
- As a baker, I want to add packaging costs per presentation (bags, boxes) so each sale unit has accurate cost
- As a Basic/Pro user, I want to see all costs broken down in the FinancialSummary widget

## Approaches Considered

### Approach A: Separate models for RecipeFixedCost and PresentationFixedCost (recommended)
- **Description**: Two new Prisma models with 1:N to Recipe and Presentation respectively. Each line: name, type (percentage|amount), base (per_batch|per_unit|per_hour), value. Percentage type stores value as percentage (e.g. 15 for 15%), amount stores absolute currency.
- **Pros/Cons**: Clean separation, explicit calculation logic per type, easy to query and display. Slightly more complex migration.
- **Why this**: Matches user mental model, supports all required calculation types, clean UI mapping.

### Approach B: Single JSON field on Recipe and Presentation
- **Description**: Store fixed costs as JSON array in a single field.
- **Why not**: Loses queryability, type safety, harder to validate, harder to display in FinancialSummary.

## Design

### Architecture
**Layers touched**: Database (Prisma), Data layer (`@/lib/db/recipes.ts`, `@/lib/db/presentations.ts`, `@/lib/db/types.ts`), Page (`src/pages/recipes/[recipe].astro`), Components (new FixedCostCard, updated FinancialSummary, updated PresentationCard), Feature flags (`@/lib/subscription.ts`)

**Data flow**:
1. Page loads recipe with `recipeFixedCosts` and `presentationFixedCosts` via `getRecipeById`
2. Calculate ingredient cost (existing)
3. Calculate recipe fixed costs total (sum of all lines, each computed per its base)
4. Calculate presentation fixed costs total per presentation
5. FinancialSummary displays: Ingredient Cost → Recipe Fixed Cost lines → Presentation Fixed Cost lines (in presentation cards) → Total → Margin
6. Edit mode: tabs for Ingredients / Costos Fijos / Presentaciones, each with own form section

### Flow Analysis

**Recipe Detail Page** (`src/pages/recipes/[recipe].astro`):
- **Single-record page** (one recipe per load)
- **Data scope**: Recipe fixed costs consumed once per page load; Presentation fixed costs consumed per presentation card (iterated)
- **Anchor file + line range**: `src/pages/recipes/[recipe].astro:319-450` (data fetching), `460-595` (FinancialSummary), `598-780` (Ingredients), `785-793` (Instructions), `795-922` (Presentations)

**Design implication**: 
- Recipe fixed costs are global to the recipe - computed once, displayed in FinancialSummary breakdown
- Presentation fixed costs are per-presentation - computed per card, affect unit cost shown in PresentationCard
- Template must have tab navigation controlling visibility of three sections

### Pages / Components
**New**:
- `src/components/FixedCostCard.astro` — displays/edits one fixed cost line (recipe or presentation level)
- `src/components/RecipeFixedCosts.astro` — manages list of recipe fixed costs (add/edit/delete)
- `src/components/PresentationFixedCosts.astro` — manages list of presentation fixed costs (used in presentation create/edit dialog)

**Modified**:
- `src/pages/recipes/[recipe].astro` — tab navigation, FinancialSummary dynamic rows, integrate RecipeFixedCosts and PresentationFixedCosts
- `src/components/PresentationCard.astro` — receive presentation fixed costs, include in unit cost calculation
- `src/lib/db/recipes.ts` — add fixed costs to getRecipeById, createRecipe, updateRecipe, duplicateRecipe
- `src/lib/db/presentations.ts` — add fixed costs to createPresentation, updatePresentation, getPresentationById
- `prisma/schema.prisma` — add RecipeFixedCost, PresentationFixedCost models
- `src/lib/db/types.ts` — add FixedCostLine, RecipeFixedCost, PresentationFixedCost types
- `src/lib/subscription.ts` — enable `advanced_costs` for Basic + Pro

### Data Layer (Prisma)

```prisma
model RecipeFixedCost {
  id           Int      @id @default(autoincrement())
  recipeId     Int      @map("recipe_id")
  name         String
  type         FixedCostType    // PERCENTAGE | AMOUNT
  base         FixedCostBase    // PER_BATCH | PER_UNIT | PER_HOUR
  value        Float            // percentage (e.g. 15) or absolute amount
  hours        Float?           // only for PER_HOUR base
  recipe       Recipe   @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@map("recipe_fixed_costs")
}

model PresentationFixedCost {
  id            Int      @id @default(autoincrement())
  presentationId Int     @map("presentation_id")
  name          String
  type          FixedCostType    // PERCENTAGE | AMOUNT
  base          FixedCostBase    // PER_BATCH | PER_UNIT (no PER_HOUR for presentations)
  value         Float
  presentation  RecipePresentation @relation(fields: [presentationId], references: [id], onDelete: Cascade)

  @@map("presentation_fixed_costs")
}

enum FixedCostType {
  PERCENTAGE
  AMOUNT
}

enum FixedCostBase {
  PER_BATCH
  PER_UNIT
  PER_HOUR
}
```

**Queries**: All queries scoped by `ownerId` via Recipe/Presentation relation. Use `$transaction` for create/update with fixed costs.

**Barrel imports**: `@/lib/db/recipes`, `@/lib/db/presentations`, `@/lib/db/types`

### Auth
- Middleware unchanged
- Feature gate: `hasFeature(subscription, 'advanced_costs')` checks for Basic/Pro
- Recipe detail page: if !advanced_costs, show legacy single percentage field (or redirect to settings/billing)

### UI / UX

**Tab Navigation** (above FinancialSummary):
- Three tabs: "Ingredientes", "Costos Fijos", "Presentaciones"
- Active tab highlighted with accent color
- Keyboard navigable (ArrowLeft/Right)
- URL hash sync: `#ingredientes`, `#costos-fijos`, `#presentaciones`

**FinancialSummary Enhancement**:
- Dynamic rows: Ingredient Cost (static) → each RecipeFixedCost line → Total Recipe Cost → each PresentationFixedCost line (shown in presentation cards) → Grand Total per presentation → Margin
- For recipe view: show ingredient cost + recipe fixed costs = recipe batch cost
- For presentation: recipe batch cost + presentation fixed costs = presentation batch cost → unit cost

**FixedCostCard Component**:
- Fields: Name (text), Type (select: Porcentaje | Monto), Base (select: Por Mezcla | Por Unidad | Por Hora), Value (number input), Hours (number input, only shown for Por Hora)
- Edit mode: inline editing like PresentationCard
- Delete: confirmation dialog
- Add button: opens dialog to create new line

**Presentation Fixed Costs**:
- Integrated into presentation create/edit dialog
- Same FixedCostCard component (without PER_HOUR option)
- Displayed in PresentationCard as part of unit cost breakdown

**Tokens**: Use semantic tokens only. New accent color for fixed costs section if needed.

**Forms**: POST to same page with `action` discriminator (`add_recipe_fixed_cost`, `update_recipe_fixed_cost`, `delete_recipe_fixed_cost`, `add_presentation_fixed_cost`, etc.)

### Error Handling
- Validation: value > 0, hours > 0 for PER_HOUR, name required
- Percentage type: value 0-100 (or higher for markup)
- Database constraints: NOT NULL on required fields
- User feedback: FeedbackAlert on redirect, inline errors in dialogs

### Invariants
1. **Recipe batch cost invariant**: `recipeBatchCost = ingredientCost + sum(recipeFixedCostLines)` where each line computes: `PERCENTAGE + PER_BATCH → ingredientCost * value/100`, `AMOUNT + PER_BATCH → value`, `PERCENTAGE + PER_UNIT → ingredientCost * value/100 * unitsPerBatch`, `AMOUNT + PER_UNIT → value * unitsPerBatch`, `PERCENTAGE + PER_HOUR → ingredientCost * value/100`, `AMOUNT + PER_HOUR → value * hours`
2. **Presentation unit cost invariant**: `presentationUnitCost = (recipeBatchCost + sum(presentationFixedCostLines)) / unitsPerBatch` where presentation lines compute similarly (no PER_HOUR)
3. **Total cost invariant**: All cost components sum to the displayed total in FinancialSummary
4. **Multiplier invariant**: All per-unit and per-batch costs scale correctly with multiplier

### Verification
- `pnpm astro check` — type safety
- `pnpm eslint .` — lint
- `pnpm build` — production build
- Manual QA: create recipe, add fixed costs (all types), add presentation with fixed costs, verify calculations at multiplier 1, 2, 0.5

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration data loss | High | Backup DB, test migration on copy, convert percentage to fixed cost line |
| Calculation bugs | High | Unit tests for each cost type, manual QA matrix |
| UI complexity (tabs + dialogs) | Medium | Reuse existing patterns (PresentationCard), incremental rollout |
| Performance (N+1 queries) | Low | Include fixed costs in getRecipeById with include |

## Out of Scope
- Historical cost tracking / audit log
- Fixed cost templates / presets
- Integration with production planner (separate roadmap item #11)
- Export/import of fixed costs
