# Task: PresentationCard Updates
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Update PresentationCard.astro to receive and calculate presentation fixed costs in unit cost. The component currently receives costoProduccionRealBatch (recipe batch cost) but needs to also receive presentationFixedCosts and compute presentation batch cost = recipe batch cost + sum(presentation fixed costs).

## Context
- PresentationCard receives: id, name, unitsPerBatch, salePrice, multiplier, costoProduccionRealBatch, precioVentaSugeridoBatch
- Need to add: presentationFixedCosts (array of fixed cost lines)
- Calculation: presentationBatchCost = costoProduccionRealBatch + sum(presentationFixedCosts)
- Then unitCost = presentationBatchCost / (unitsPerBatch * multiplier)
- Recommended price calculation similarly
- Must respect multiplier for per-unit and per-batch fixed costs

## Skills Required
- **ui-ux-pro-max**: For UI/UX design patterns, calculations

## Files Involved
- `src/components/PresentationCard.astro`: [modify] — update props, calculations, display

## Files the Subagent May Create or Edit
- [ ] `src/components/PresentationCard.astro`
- [ ] `docs/tasks/task-20260612-143000-builder-7-presentation-card-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: ui-ux-pro-max
2. **Read current PresentationCard**: Understand existing calculation logic
3. **Update props interface**: Add presentationFixedCosts array
4. **Update calculations**:
   - Compute presentationFixedCostsTotal from array (iterate, compute each per type/base)
   - presentationBatchCost = costoProduccionRealBatch + presentationFixedCostsTotal
   - unitCost = presentationBatchCost / totalUnits
   - unitPriceRecommended = precioVentaSugeridoBatch / totalUnits (this is already per batch)
   - Actually precioVentaSugeridoBatch should also include presentation fixed costs
5. **Update display**: Show presentation fixed costs breakdown in card (optional, maybe in expanded view)
6. **Update client-side JS**: Recalculate when multiplier changes, handle fixed costs in calculate()
7. **Verify**: pnpm astro check, pnpm eslint

## Expected Output
- PresentationCard updated to include presentation fixed costs in all calculations
- Unit cost, recommended price, profit, margin all reflect presentation fixed costs
- Report saved to `docs/tasks/task-20260612-143000-builder-7-presentation-card-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Only modify src/components/PresentationCard.astro
- Use semantic tokens only
- Follow existing calculation patterns
- Client-side binding guards required
