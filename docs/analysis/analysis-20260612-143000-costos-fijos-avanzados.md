# Analysis Report: Costos Fijos Avanzados

Created: 2026-06-12 14:30
Orchestrator: orchestrator
Complexity: feature

## Request Summary
Implement sophisticated fixed costs per recipe (multiple lines: labor, electricity, gas, packaging, etc. with name, amount/percentage, type: per batch/per unit/per hour) and add fixed costs to presentations (bags, cupcake liners). Organize recipe detail page into tabs: Ingredients, Fixed Costs, Presentations, with accounting data (FinancialSummary) at top.

## Target Location
- **Primary anchor(s)**: `src/pages/recipes/[recipe].astro`, `prisma/schema.prisma`, `src/lib/db/recipes.ts`, `src/lib/db/presentations.ts`, `src/lib/db/types.ts`
- **Layer**: page | db | api

## Surrounding Context
**Current fixed costs**: Single `fixedCostsPercentage` field on Recipe model (float, percentage applied on top of ingredient costs). Used in FinancialSummary as "Gastos Operativos". No fixed costs on presentations.

**Recipe detail page structure** (`src/pages/recipes/[recipe].astro`):
- Header with title, category, mixer counter, actions menu
- FinancialSummary widget (4 rows: Costo Insumos, Gastos Operativos %, Costo Total Real, Margen Utilidad)
- Ingredients section (Card with table/edit form)
- Instructions section (RecipeInstructions component)
- Presentations section (grid of PresentationCard components with create dialog)

**Database models**:
- Recipe: id, ownerId, name, category, instructions, desiredMargin, fixedCostsPercentage, updatedAt
- RecipeIngredient: composite PK (recipeId, ingredientId), quantity, unit, comment
- RecipePresentation: id, recipeId, name, unitsPerBatch, salePrice

**Feature flag**: `advanced_costs` exists in FREE_FEATURES (all false). Not currently enabled for any tier.

**UI patterns**: Astro pages with POST-to-self forms, `@/components/ui` barrel (Button, Card, Badge, FinancialSummary, SectionHeading, Dialog), semantic tokens, `parseNumberInput()` for Spanish decimals, `data-*-bound="1"` guards, `astro:page-load` + `astro:after-swap` lifecycle.

## Detected Tech Debt / Potential Refactors
- `fixedCostsPercentage` on Recipe will be deprecated/replaced by multiple fixed cost lines
- PresentationCard calculates unit cost from batch cost passed as prop - will need to include presentation-level fixed costs
- FinancialSummary currently hardcoded for 4 rows - will need to accommodate dynamic fixed cost breakdown
- Recipe edit form handles ingredients + recipe fields in one POST - fixed costs will need similar treatment

## Graphify Findings
- Recipe ↔ RecipeIngredient (1:N, cascade delete)
- Recipe ↔ RecipePresentation (1:N, cascade delete)
- RecipeIngredient ↔ Ingredient (N:1, restrict delete)
- No existing fixed cost models

## Codebase Patterns to Follow
- **Page pattern**: Astro `.astro` with frontmatter + template, POST to same URL, redirect with hash
- **Data layer**: Prisma queries via `@/lib/db/*` barrel, ownerId scoping mandatory
- **Auth**: `Astro.locals.{session,user,subscription}` populated by middleware
- **UI**: `@/components/ui` barrel, semantic tokens (bg-card, text-foreground, border-border, accent-*)
- **Forms**: POST to same page, `Astro.request.formData()`, `parseNumberInput()`, CSRF via `_csrf` hidden input
- **Client**: `data-*-bound="1"`, `astro:page-load` + `astro:after-swap`, custom elements for interactive components
- **Feature flags**: `hasFeature(subscription, 'feature_key')` from `@/lib/subscription`

## Complexity Assessment
- **Decision**: feature
- **Rationale**: Requires new Prisma models (RecipeFixedCost, PresentationFixedCost), migration, new API/form handlers, tabbed UI restructuring, FinancialSummary enhancement, feature flag gating (`advanced_costs`), PresentationCard cost calculation updates, duplication logic updates

## Dependencies & Prerequisites
- `advanced_costs` feature flag must be enabled for Basic/Pro tiers (subscription.ts)
- Prisma migration for new models
- No external API dependencies

## Past Related Work
- Roadmap item #9: `docs/planes/roadmap.md` line 156-169
- Production planner Phase 11 depends on this: `docs/planes/produccion/11-costos-fijos-avanzados.md`
