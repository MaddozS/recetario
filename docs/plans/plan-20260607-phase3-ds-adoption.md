# Plan: Phase 3 — Design System Adoption

Created: 2026-06-07
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20250607-component-extraction.md
Scope: Replace custom patterns with existing design system components
Depends on: Phase 2 (uses new ConfirmDialog, StatusBanner, ProgressBar, etc.)

## Goal
Replace custom inline patterns with `@/components/ui` design system components across 8 files.

## Acceptance Criteria
- [ ] `PresentationCard.astro`: delete dialog uses `<ConfirmDialog>`, buttons use `<Button>`
- [ ] `UpgradePrompt.astro`: wrapper uses `<Card>`, buttons use `<Button>`
- [ ] `PricingModal.astro`: outer `<dialog>` uses `<Dialog>`, toggle uses `<BillingPeriodToggle>`, cards use `<PricingCard>`
- [ ] `pricing.astro`: toggle uses `<BillingPeriodToggle>`, cards use `<PricingCard>`, banners use `<StatusBanner>`, subscribe buttons use `<Button>`
- [ ] `ProductionIngredientsTable.astro`: header uses `<SectionHeading>`
- [ ] `IngredientFormFields.astro`: inputs use `<Input>` component instead of raw `<input>` with duplicated classes
- [ ] `BillingSection.astro`: banners use `<StatusBanner>`, progress bars use `<ProgressBar>`
- [ ] `RecipeGridCard.astro`: inline SVGs replaced with `<Icon>` component (pencil, copy icons)
- [ ] `pnpm astro check` passes
- [ ] `pnpm eslint .` passes

## Detailed Changes

### 1. PresentationCard.astro (785 lines)
- Lines 61-68: Delete button → `<Button variant="ghost" icon="trash-2" class="delete-btn" />`
- Lines 69-86: Edit button → `<Button variant="ghost" icon="pencil" class="edit-btn" />`
- Lines 213-219: Save button → `<Button variant="primary" icon="check" class="save-btn" type="submit">`
- Lines 227-263: Delete dialog → `<ConfirmDialog id="pres-delete-{id}" title="Confirmar eliminación" description="¿Eliminar esta presentación?..." />`
- Lines 249-253: Cancel button → handled by ConfirmDialog
- Lines 255-260: Confirm button → handled by ConfirmDialog

### 2. UpgradePrompt.astro (49 lines)
- Line 16: Outer `<div>` → `<Card padding="lg" class="text-center">`
- Lines 34-39: Cancel button → `<Button variant="secondary">No gracias</Button>`
- Lines 41-47: Subscribe link → `<Button variant="primary" icon="arrow-up-circle" href={...}>`

### 3. PricingModal.astro (359 lines)
- Lines 16-20: Outer `<dialog>` → `<Dialog id="pricing-modal" class="max-w-5xl max-h-[90dvh]">`
- Lines 39-58: Toggle → `<BillingPeriodToggle id="pricing-modal-toggle" />`
- Lines 60-191: Plan cards → `<PricingCard plan={plan} period="monthly" ... />`
- Note: PricingModal has complex JS for subscribe buttons — keep the script, just replace the HTML structure

### 4. pricing.astro (353 lines)
- Lines 29-60: Success/canceled banners → `<StatusBanner variant="success" ...>` and `<StatusBanner variant="warning" ...>`
- Lines 79-97: Toggle → `<BillingPeriodToggle id="billing-toggle" />`
- Lines 99-220: Plan cards → `<PricingCard plan={plan} period="monthly" ... />`
- Lines 171-188: Subscribe buttons → handled by PricingCard

### 5. ProductionIngredientsTable.astro (168 lines)
- Lines 29-34: Header `<h2>` + `<p>` → `<SectionHeading icon="package" title="Ingredientes consolidados" subtitle={`${count}...`} />`

### 6. IngredientFormFields.astro (133 lines)
- Lines 35-38: Replace `labelClasses` and `inputClasses` constants with `<Input>` component usage
- Each field (name, supplier, brand, price, quantity+unit) → `<Input label="..." name="..." id={`${idPrefix}-...`} />`
- Price field: use `monospace` prop + keep the `$` prefix overlay
- Quantity+unit field: this is a composite input — may need to keep raw HTML for the split input+select pattern, but use `<Input>` for the label styling

### 7. BillingSection.astro (354 lines)
- Lines 54-65: Success banner → `<StatusBanner variant="success" icon="check-circle" title="Pago exitoso" description="Tu suscripcion ha sido activada." />`
- Lines 67-79: Canceled banner → `<StatusBanner variant="warning" icon="alert-triangle" title="Pago cancelado" ...>`
- Lines 81-97: Trial banner → `<StatusBanner variant="info" icon="clock" title="Periodo de prueba activo" ...>`
- Lines 100-114: Cancel-at-period-end → `<StatusBanner variant="warning" icon="alert-triangle" title="Suscripcion cancelada" ...>`
- Lines 216-221: Recipes progress → `<ProgressBar value={recipeCount} max={subscription.recipesLimit ?? 1} />`
- Lines 244-249: Ingredients progress → `<ProgressBar value={ingredientCount} max={subscription.ingredientsLimit ?? 1} />`

### 8. RecipeGridCard.astro (228 lines)
- Lines 75-86: Pencil inline SVG → `<Icon name="lucide:pencil" size={14} />`
- Lines 112-126: Copy inline SVG → `<Icon name="lucide:copy" size={14} />`
- Note: Need to add "copy" to astro-icon whitelist if not already there (check astro.config.mjs)

## Tasks

### Task 1: Replace patterns in PresentationCard + UpgradePrompt + RecipeGridCard
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Replace inline buttons with `<Button>`, delete dialog with `<ConfirmDialog>`, inline SVGs with `<Icon>`. Keep all existing JS/class-based selectors working (the PresentationCard custom element relies on `.delete-btn`, `.edit-btn`, `.save-btn` classes — preserve these as class props on the Button components).

### Task 2: Replace patterns in PricingModal + pricing.astro + BillingSection
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Replace banners with `<StatusBanner>`, progress bars with `<ProgressBar>`, toggle with `<BillingPeriodToggle>`, cards with `<PricingCard>`, outer dialog with `<Dialog>`. Preserve all existing data-attributes for JS binding.

### Task 3: Replace patterns in ProductionIngredientsTable + IngredientFormFields
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Replace header with `<SectionHeading>`, replace raw inputs with `<Input>` component. For IngredientFormFields, the composite quantity+unit field may need to remain partially custom.

### Task 4: Verify all changes
- **Agent**: reviewer
- **Skills**: verification-before-completion
- **Summary**: Run `pnpm astro check` and `pnpm eslint .`. Verify no `backdrop:bg-slate-900/50` remains. Verify all UI primitives used correctly. Visual check at desktop + mobile viewports.
