# Plan: Phase 2 — Extract Duplicated Components

Created: 2026-06-07
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20250607-component-extraction.md
Scope: Standalone — creates new components, does NOT modify existing pages (consumers updated in Phase 3/4)
Depends on: Phase 1 (for LoadingOverlay utility)

## Goal
Extract 7 reusable components/utilities from duplicated patterns across the codebase.

## Acceptance Criteria
- [ ] `src/components/ui/ConfirmDialog.astro` created and exported from barrel
- [ ] `src/components/ui/StatusBanner.astro` created and exported from barrel
- [ ] `src/components/ui/ProgressBar.astro` created and exported from barrel
- [ ] `src/components/SearchInput.astro` created
- [ ] `src/components/BillingPeriodToggle.astro` created
- [ ] `src/components/PricingCard.astro` created
- [ ] `src/lib/dialog-binding.ts` created with `bindDialog()` utility
- [ ] All new components added to `src/components/ui/index.ts` barrel (except SearchInput, BillingPeriodToggle, PricingCard which are app-level)
- [ ] `pnpm astro check` passes
- [ ] `pnpm eslint .` passes

## New Component Specs

### 1. ConfirmDialog (`src/components/ui/ConfirmDialog.astro`)
Duplicated in: ingredients.astro (736-788), [recipe].astro (488-515), PresentationCard.astro (227-263), recipes/index.astro upgrade modal (370-391)

Props:
```typescript
interface Props {
  id: string;
  title: string;
  description: string;
  icon?: string;           // default: "trash-2"
  variant?: "danger" | "warning" | "info";  // default: "danger"
  cancelLabel?: string;    // default: "Cancelar"
  confirmLabel?: string;   // default: "Eliminar"
  confirmVariant?: "danger" | "primary";  // default: "danger"
  form?: string;           // form attribute for submit
  class?: string;
}
```

Pattern: Uses `<Dialog>` internally with icon circle + title + description + button row.

### 2. StatusBanner (`src/components/ui/StatusBanner.astro`)
Duplicated in: BillingSection.astro (54-115, 4 banners), pricing.astro (29-60, 2 banners)

Props:
```typescript
interface Props {
  variant: "success" | "warning" | "error" | "info";
  icon: string;
  title: string;
  description?: string;
  class?: string;
}
```

### 3. ProgressBar (`src/components/ui/ProgressBar.astro`)
Duplicated in: BillingSection.astro lines 216-221 and 244-249

Props:
```typescript
interface Props {
  value: number;
  max: number;
  color?: string;  // default: "accent"
  class?: string;
}
```

### 4. SearchInput (`src/components/SearchInput.astro`)
Duplicated in: ingredients.astro (343-356), recipes/index.astro (239-248)

Props:
```typescript
interface Props {
  id?: string;
  name?: string;
  placeholder?: string;
  class?: string;
  dataAttribute?: string;  // e.g. "ingredient-search" or "recipe-search"
}
```

### 5. BillingPeriodToggle (`src/components/BillingPeriodToggle.astro`)
Duplicated in: PricingModal.astro (39-58), pricing.astro (79-97), PricingSection.astro (33-57)

Props:
```typescript
interface Props {
  id: string;  // container id for JS binding
}
```

### 6. PricingCard (`src/components/PricingCard.astro`)
Duplicated in: PricingModal.astro (60-191), pricing.astro (99-220), PricingSection.astro (63-192)

Props:
```typescript
interface Props {
  plan: PricingPlan;
  period: "monthly" | "yearly";
  isCurrent?: boolean;
  currentTier?: string;
  ctaLabel?: string;
  ctaHref?: string;
  ctaFormAction?: string;  // for subscribe button data attributes
  isHighlighted?: boolean;  // pro plan ring
  size?: "default" | "landing";  // landing has larger text
}
```

### 7. Dialog Binding Utility (`src/lib/dialog-binding.ts`)
Duplicated in: 8+ locations with same open/close/bound pattern

```typescript
export function bindDialog(dialogId: string, options?: {
  openSelector?: string;   // default: `[data-open-${dialogId}]`
  closeSelector?: string;  // default: `[data-close-${dialogId}]`
  resetForm?: boolean;     // default: false
  focusSelector?: string;  // default: first input in dialog
}): { open: () => void; close: () => void }
```

Uses `bindDialogBackdrop` internally. Handles `dataset.bound` guard, `astro:page-load` and `astro:after-swap` lifecycle.

## Tasks

### Task 1: Create ConfirmDialog + StatusBanner + ProgressBar in ui/
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Create 3 components in `src/components/ui/`, add to barrel export. Follow existing patterns (server-rendered Astro, semantic tokens, dark-mode-ready).

### Task 2: Create SearchInput + BillingPeriodToggle + PricingCard
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Create 3 app-level components in `src/components/`. These are NOT ui/ primitives — they're app-specific.

### Task 3: Create dialog-binding utility
- **Agent**: implementer
- **Skills**: none
- **Summary**: Create `src/lib/dialog-binding.ts`. Import `bindDialogBackdrop` from `@/lib/dialog`. Export `bindDialog()` function.

### Task 4: Verify all new components
- **Agent**: reviewer
- **Skills**: verification-before-completion
- **Summary**: Run `pnpm astro check` and `pnpm eslint .`. Verify all new components are valid Astro, use semantic tokens, no hardcoded colors.
