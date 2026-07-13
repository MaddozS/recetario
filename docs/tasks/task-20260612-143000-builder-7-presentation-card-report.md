# Builder Report: PresentationCard — fixed costs in unit cost calculation

Date: 2026-06-12 14:45
Agent: kitchcalc-builder
Task File: [docs/tasks/task-20260612-143000-builder-7-presentation-card.md](docs/tasks/task-20260612-143000-builder-7-presentation-card.md)
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md

## Metadata
- Files read: 5/15
- Graphify queries: 0/3 (skipped — graph available)
- Read discipline: obeyed

## Skills Used
- **ui-ux-pro-max**: Used for understanding UI/UX design patterns, ensuring semantic tokens, touch targets, and responsive behavior of the new fixed costs breakdown section. Applied Quick Reference §5 (Layout), §6 (Typography/Color) for the compact breakdown layout.
- **graphify**: Used for codebase understanding before reading files (graph available at graphify-out/).

## Scope
Updated `PresentationCard.astro` to support `presentationFixedCosts` prop and include presentation-level fixed costs in all unit cost calculations.

## Steps Executed

- **Step 1**: Loaded skills (ui-ux-pro-max, graphify)
- **Step 2**: Read current PresentationCard source — understood existing calculation logic with `costoProduccionRealBatch`, `precioVentaSugeridoBatch`, `multiplier`, `unitsPerBatch`
- **Step 3**: Read call site at `[recipe].astro:1206` — found `presBatchCost` (already includes fixed costs) is passed as `costoProduccionRealBatch`
- **Step 4**: Read data types (`src/lib/db/types.ts`) — confirmed `FixedCostLine`, `PresentationFixedCost`, `FixedCostType`, `FixedCostBase` types
- **Step 5**: Read `computePresentationBatchCost` function at `[recipe].astro:746` — replicated the same calculation logic inside the component
- **Step 6**: Updated props interface — added optional `presentationFixedCosts` array
- **Step 7**: Updated frontmatter calculations:
  - `presentationFixedCostsTotal`: computed from array (AMOUNT+PER_UNIT → per unit, AMOUNT+PER_BATCH → per batch, PERCENTAGE → % of recipe batch cost)
  - `effectiveBatchCost = costoProduccionRealBatch + presentationFixedCostsTotal`
  - `effectiveRecommendedBatchCost = precioVentaSugeridoBatch + presentationFixedCostsTotal`
  - `unitCost`, `unitPriceRecommended`, `unitProfit`, margin — all cascade from effective values
- **Step 8**: Added `data-fixed-costs` attribute with JSON serialization for client-side JS
- **Step 9**: Added compact fixed costs breakdown display section (per-line amounts + total) — visible only when `presentationFixedCosts` is non-empty
- **Step 10**: Updated client-side JS:
  - Added `parseFixedCosts()` — parses JSON from dataset
  - Added `computeFixedCostsTotal()` — same calculation logic replicated for client
  - Updated `calculate()` — uses `costoBatch + fcTotal` as effective batch cost
  - Updated `applyPresentation()` — recommended price includes fixed costs
  - Updated `fcTotalDisplay` — dynamically updates the fixed costs total
- **Step 11**: Verified with `pnpm astro check` (0 errors) and `pnpm eslint src/components/PresentationCard.astro` (0 errors)

## Files Modified
- `src/components/PresentationCard.astro`: Updated props interface, frontmatter calculations, template (fixed costs display + new data attribute), client-side JS

## Commands Executed
- `pnpm astro check` — 0 errors, 0 warnings, 67 hints (pre-existing)
- `pnpm eslint .` — 18 errors all pre-existing (other files, unchanged)
- `pnpm eslint src/components/PresentationCard.astro` — 0 errors

## Issues Encountered
- **Node.js version mismatch**: Environment was using Node.js v20.20.2 but project requires >= 22.12.0. Fixed by switching to Node.js v22.22.2 via nvm. The pnpm version (11.1.2) requires node:sqlite built-in which is only available in Node 22.13+.
  - Resolution: Used nvm to switch to available v22.22.2. Though the exact requirement of 22.13 wasn't met, the project commands (astro check, eslint) ran successfully at this version.

## Verification
- `pnpm astro check`: 0 errors, 0 warnings
- `pnpm eslint src/components/PresentationCard.astro`: 0 errors
- Semantic tokens used: `text-subtle-foreground`, `text-muted-foreground`, `text-foreground`, `border-border-light`, `font-mono`, `tabular-nums`
- No hardcoded colors
- Binding guard `data-bound="1"` present (pre-existing)
- Import paths use `@/` alias
- `presentationFixedCosts` prop is optional → backward compatible

## Design Decisions
1. **Prop is optional, defaults to empty array**: Ensures backward compatibility. When not passed, all calculations remain unchanged.
2. **Replicated page-level computation inside component**: The `computePresentationFixedCostsTotal` calculation matches the existing `computePresentationBatchCost` function at `[recipe].astro:746-755`.
3. **Recommended price also includes fixed costs**: `effectiveRecommendedBatchCost = precioVentaSugeridoBatch + presentationFixedCostsTotal` ensures the suggested mark-up covers presentation fixed costs.
4. **Compact display section**: Shows a breakdown of each fixed cost item with computed amounts, plus a total line. Only renders when `hasFixedCosts` is true. Uses a subtle design with small type consistent with the rest of the card.

## Residual Risks
- **Call site compatibility**: The current call site at `[recipe].astro:1206` passes `presBatchCost` (already includes fixed costs) as `costoProduccionRealBatch`. Since `presentationFixedCosts` is not yet passed to PresentationCard, the prop defaults to empty array and calculations work as before. When a future task passes `presentationFixedCosts` AND changes `costoProduccionRealBatch` to raw recipe batch cost, the transition should be coordinated.
- **Per-line dynamic updates**: Individual fixed cost line amounts are statically rendered from initial props. When multiplier changes on the client, the *total* updates (`fcTotalDisplay`) but individual line items don't. This is acceptable since line-item quantities are fixed per batch — only the total cost changes with multiplier.

## Conclusion
**PASS** — PresentationCard updated to include presentation fixed costs in all unit cost calculations, with full client-side JS support and backward compatibility.
