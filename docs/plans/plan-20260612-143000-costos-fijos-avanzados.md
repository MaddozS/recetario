# Plan: Costos Fijos Avanzados

Created: 2026-06-12 14:30
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md

## Goal
Implement sophisticated fixed costs system: multiple fixed cost lines per recipe (with type percentage/amount and base per_batch/per_unit/per_hour), fixed costs per presentation (bags, cupcake liners), tabbed recipe detail page (Ingredients | Costos Fijos | Presentaciones), dynamic FinancialSummary breakdown, gated by `advanced_costs` feature flag for Basic+Pro.

## Acceptance Criteria
- [ ] Prisma migration creates RecipeFixedCost and PresentationFixedCost models
- [ ] Migration script converts existing fixedCostsPercentage to "Gastos Operativos" fixed cost line
- [ ] Recipe detail page has 3 tabs with proper navigation and URL hash sync
- [ ] FinancialSummary shows dynamic rows for each fixed cost line
- [ ] Recipe fixed costs CRUD (add/edit/delete) in Costos Fijos tab
- [ ] Presentation fixed costs CRUD integrated in presentation create/edit dialog
- [ ] PresentationCard includes presentation fixed costs in unit cost calculation
- [ ] Recipe duplication copies all fixed costs
- [ ] `advanced_costs` enabled for Basic + Pro tiers
- [ ] All calculations respect multiplier
- [ ] `pnpm astro check`, `pnpm eslint .`, `pnpm build` pass

## Analysis Summary
- Current: single `fixedCostsPercentage` on Recipe, no presentation fixed costs
- New models: RecipeFixedCost, PresentationFixedCost with enums FixedCostType (PERCENTAGE/AMOUNT), FixedCostBase (PER_BATCH/PER_UNIT/PER_HOUR)
- UI: tabbed interface replacing current section layout, FinancialSummary becomes dynamic
- Feature flag: `advanced_costs` in FREE_FEATURES, enable for Basic+Pro

## User Stories
- As a baker, I want to add multiple fixed cost lines (labor, gas, electricity) to my recipe so I see true production cost
- As a baker, I want to choose how each cost is calculated (per batch, per piece, per hour) so it matches my reality
- As a baker, I want to add packaging costs per presentation (bags, boxes) so each sale unit has accurate cost
- As a Basic/Pro user, I want to see all costs broken down in the FinancialSummary widget

## Design Rationale
- Separate models (not JSON) for queryability, type safety, validation
- Tabbed UI keeps page organized as data grows
- FinancialSummary dynamic rows show full breakdown
- Presentation fixed costs are additional to recipe fixed costs (user requirement)
- Clean migration: convert percentage to AMOUNT+PER_BATCH line named "Gastos Operativos"

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration data loss | High | Backup DB, test migration on copy, convert percentage to fixed cost line |
| Calculation bugs | High | Unit tests for each cost type, manual QA matrix (multiplier 1, 2, 0.5) |
| UI complexity (tabs + dialogs) | Medium | Reuse existing patterns (PresentationCard), incremental rollout |
| Performance (N+1 queries) | Low | Include fixed costs in getRecipeById with include |

## Tasks

### Task 1: Database Schema & Migration
- **Agent**: kitchcalc-builder
- **Skills**: prisma-client-api
- **Summary**: Add RecipeFixedCost, PresentationFixedCost models to schema.prisma, create migration, write migration script to convert existing fixedCostsPercentage

### Task 2: Data Layer Updates (Types & DB Operations)
- **Agent**: kitchcalc-builder
- **Skills**: prisma-client-api
- **Summary**: Update types.ts with new FixedCost types, update recipes.ts and presentations.ts for CRUD operations including fixed costs

### Task 3: Feature Flag & Subscription Updates
- **Agent**: kitchcalc-builder
- **Skills**: better-auth-best-practices
- **Summary**: Enable advanced_costs for Basic+Pro tiers in subscription.ts

### Task 4: FixedCostCard Component
- **Agent**: kitchcalc-builder
- **Skills**: ui-ux-pro-max
- **Summary**: Create reusable FixedCostCard.astro component for displaying/editing fixed cost lines (recipe and presentation level)

### Task 5: RecipeFixedCosts & PresentationFixedCosts Components
- **Agent**: kitchcalc-builder
- **Skills**: ui-ux-pro-max
- **Summary**: Create RecipeFixedCosts.astro (manages recipe fixed costs list) and PresentationFixedCosts.astro (manages presentation fixed costs list)

### Task 6: Recipe Detail Page - Tabs & FinancialSummary
- **Agent**: kitchcalc-builder
- **Skills**: ui-ux-pro-max
- **Summary**: Restructure src/pages/recipes/[recipe].astro with tab navigation, dynamic FinancialSummary, integrate RecipeFixedCosts and PresentationFixedCosts components

### Task 7: PresentationCard Updates
- **Agent**: kitchcalc-builder
- **Skills**: ui-ux-pro-max
- **Summary**: Update PresentationCard.astro to receive and calculate presentation fixed costs in unit cost

### Task 8: Recipe Duplication Updates
- **Agent**: kitchcalc-builder
- **Skills**: prisma-client-api
- **Summary**: Update duplicateRecipe to copy recipe and presentation fixed costs

### Task 9: Migration Script & Verification
- **Agent**: kitchcalc-builder
- **Skills**: prisma-client-api
- **Summary**: Create and run migration script to convert existing fixedCostsPercentage data, verify all calculations

### Task 10: Validation & Testing
- **Agent**: kitchcalc-validator
- **Skills**: verification-before-completion
- **Summary**: Run astro check, eslint, build; manual QA for all cost types and multiplier values

## Retrospective
[To be filled by orchestrator after Phase 7]
