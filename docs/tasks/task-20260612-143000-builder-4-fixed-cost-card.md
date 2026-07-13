# Task: FixedCostCard Component
Agent: kitchcalc-builder
Date: 2026-06-12
Analysis: docs/analysis/analysis-20260612-143000-costos-fijos-avanzados.md
Spec: docs/specs/2026-06-12-costos-fijos-avanzados-design.md
Plan: docs/plans/plan-20260612-143000-costos-fijos-avanzados.md

## Goal
Create reusable FixedCostCard.astro component for displaying/editing a single fixed cost line (recipe or presentation level). Follows PresentationCard patterns.

## Context
- Used in RecipeFixedCosts.astro and PresentationFixedCosts.astro
- Must handle both recipe (has PER_HOUR base) and presentation (no PER_HOUR) contexts
- Fields: Name, Type (Porcentaje/Monto), Base (Por Mezcla/Por Unidad/Por Hora), Value, Hours (only for PER_HOUR)
- Edit mode: inline editing with save/cancel, delete with confirmation
- Uses semantic tokens, @/components/ui components

## Skills Required
- **ui-ux-pro-max**: For UI/UX design patterns, Tailwind, semantic tokens

## Files Involved
- `src/components/FixedCostCard.astro`: [create] — new component

## Files the Subagent May Create or Edit
- [ ] `src/components/FixedCostCard.astro`
- [ ] `docs/tasks/task-20260612-143000-builder-4-fixed-cost-card-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: ui-ux-pro-max
2. **Create FixedCostCard.astro**:
   - Props: id, name, type (PERCENTAGE|AMOUNT), base (PER_BATCH|PER_UNIT|PER_HOUR), value, hours?, isRecipeLevel (boolean), isEditing (boolean), recipeId?, presentationId?
   - Display mode: readonly fields showing current values with edit/delete buttons
   - Edit mode: inline form with selects for type/base, inputs for value/hours, save/cancel/delete buttons
   - Client-side JS for toggle edit, calculate preview, form submission
   - Use data-*-bound="1" guards, astro:page-load + astro:after-swap
   - CSRF token in forms
   - Delete confirmation dialog (reuse pattern from PresentationCard)
   - Semantic tokens: bg-card, text-foreground, border-border, accent-*
   - Icons from lucide (verified in astro.config.mjs whitelist)
3. **Form actions**: update_fixed_cost, delete_fixed_cost (recipe or presentation)
4. **Verify**: Component renders without errors

## Expected Output
- FixedCostCard.astro component created
- Follows PresentationCard patterns
- Handles both recipe and presentation contexts
- Report saved to `docs/tasks/task-20260612-143000-builder-4-fixed-cost-card-report.md`

## Guardrails
- Never modify spec files, plan files, analysis reports, or other task files
- Only create FixedCostCard.astro
- Use @/components/ui barrel (Button, Input, Select, Badge, Card, Dialog, Icon)
- Use semantic tokens only
- Client-side binding guards required
- Lucide icons must be in astro.config.mjs whitelist
