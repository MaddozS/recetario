# Explore Report: Comprehensive Component Extraction & Design System Audit

Date: 2026-06-07 13:30
Agent: explorer
Task File: N/A (self-initiated analysis)

## Target Area Explored
- **Primary files**: All 20+ components in `src/components/`, all 15+ page files in `src/pages/`, all 7 landing components in `src/components/landing/`, all 7 design system components in `src/components/ui/`
- **Adjacent files**: Layouts, landing layout, instructions-parser, html-sanitizer, dialog utility

---

## 1. Executive Summary

The Recetario codebase has a strong design system foundation (`Button`, `Card`, `Input`, `Badge`, `Dialog`, `FinancialSummary`, `SectionHeading`, `PasswordInput`) but adoption is incomplete. Many custom components and inline page code duplicate what the design system already provides. The three largest pages — `[recipe].astro` (1337 lines), `settings.astro` (1228 lines), and `ingredients.astro` (1122 lines) — contain massive inline HTML that should be extracted into reusable components. The `produccion.astro` page has a critical anti-pattern: it duplicates full server-rendered components as client-side HTML strings. Five dialog patterns and five loading overlays are duplicated across the codebase. Extracting ~15 new components and replacing ~8 custom components with design system equivalents would reduce code duplication by an estimated 40-50% and significantly improve maintainability.

---

## 2. Components To Replace With Design System

### 2.1 `PresentationCard.astro` → Use `Button` + `Dialog`
**File**: `src/components/PresentationCard.astro`
**Effort**: Moderate (785 lines, complex custom element + script)

| Pattern | Lines | Should Use |
|---------|-------|------------|
| Delete button | 63, 249-258 | `<Button variant="ghost" icon="trash-2" />` + `<Button variant="danger">` |
| Edit button | 69-86 | `<Button variant="ghost" icon="pencil">` |
| Save button | 214-219 | `<Button variant="primary" icon="check">` |
| Delete dialog | 227-263 | `<Dialog id="...">` component from `@/components/ui` |
| Cancel dialog button | 249-253 | `<Button variant="secondary">` |
| Confirm dialog button | 255-260 | `<Button variant="danger" icon="trash-2">` |

**Anti-pattern found**: Line 229 uses `backdrop:bg-slate-900/50` — violates AGENTS.md mandate to use `backdrop:bg-backdrop/50`.

**Current code (lines 227-263)**: Raw `<dialog>` element with duplicative structure. The `Dialog` component already provides this exact pattern (bg-card, border, rounded-3xl, shadow-2xl, p-6).

### 2.2 `UpgradePrompt.astro` → Use `Button` + `Card`
**File**: `src/components/UpgradePrompt.astro`
**Effort**: Trivial

| Pattern | Lines | Should Use |
|---------|-------|------------|
| Cancel button | 34-38 | `<Button variant="secondary">No gracias</Button>` |
| Subscribe link | 41-46 | `<Button variant="primary" icon="arrow-up-circle" href={...}>` |
| Overall wrapper | 16 | `<Card padding="lg">...` instead of raw div |

### 2.3 `PricingModal.astro` dialog → Use `<Dialog>`
**File**: `src/components/PricingModal.astro`
**Effort**: Trivial

Line 16-20: Raw `<dialog>` with same width/rounded classes that `Dialog` component encapsulates. Could replace the outer `<dialog>` with `<Dialog id="pricing-modal">`.

### 2.4 `ProductionIngredientsTable.astro` header → Use `SectionHeading`
**File**: `src/components/ProductionIngredientsTable.astro`
**Effort**: Trivial

Lines 29-34: Inline h2 + subtitle. Could use `<SectionHeading icon="package" title="Ingredientes consolidados" subtitle="..." />`.

### 2.5 `ProductionRecipeBreakdown.astro` mini stats → Consider `FinancialSummary`
**File**: `src/components/ProductionRecipeBreakdown.astro`
**Effort**: Moderate

Lines 108-133: Three cost cards (Insumos, Operativo, Total) with left-border color accent — this is essentially a mini `FinancialSummary` inline. If made into a `FinancialRow`-like component, could reuse the same visual pattern.

### 2.6 `PricingModal.astro` buttons → already mostly using `<Button>`
Good — but lines 171-188 use raw `<button>` for subscribe buttons instead of `<Button>` component. Effort: trivial.

### 2.7 `pricing.astro` subscribe buttons → Use `<Button>`
**File**: `src/pages/pricing.astro`
Lines 171-188: Raw `<button>` with manual class management instead of `<Button variant="primary" />`.

---

## 3. New Components To Extract

### 3.1 `ConfirmDeleteDialog`
**Duplicated in**:
- `ingredients.astro` lines 736-788 (delete ingredient)
- `[recipe].astro` lines 488-515 (delete recipe)
- `PresentationCard.astro` lines 227-263 (delete presentation)
- `recipes/index.astro` lines 370-391 (upgrade modal, similar pattern)

**Common pattern** (shown from `ingredients.astro` lines 736-788):
```astro
<dialog data-animated id="delete-confirm-modal"
  class="backdrop:bg-backdrop/50 fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-md rounded-3xl p-0">
  <div class="border-border bg-card rounded-3xl border p-6 shadow-2xl">
    <div class="flex items-start gap-3">
      <div class="bg-danger-bg text-danger flex h-11 w-11 items-center justify-center rounded-2xl">
        <Icon name="lucide:trash-2" size={18} />
      </div>
      <div>
        <h2 class="text-foreground text-lg font-bold">Confirmar eliminación</h2>
        <p class="text-muted-foreground mt-2 text-sm">...</p>
      </div>
    </div>
    <div class="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
      <Button variant="secondary">Cancelar</Button>
      <Button variant="danger" icon="trash-2">Eliminar</Button>
    </div>
  </div>
</dialog>
```

**Proposed API**:
```typescript
interface Props {
  id: string;
  title: string;
  description: string;
  /** Override default icon */
  icon?: string;
  /** "danger" | "warning" icon color role */
  variant?: "danger" | "warning";
  cancelLabel?: string;
  confirmLabel?: string;
  confirmVariant?: "danger" | "primary";
  /** Form ID (if within a form) or action callback */
  form?: string;
  onConfirm?: string;
}
```

### 3.2 `StatusBanner`
**Duplicated in**:
- `BillingSection.astro` lines 54-115 (4 banners: success, canceled, trial, cancel-at-period-end)
- `pricing.astro` lines 29-60 (success + canceled)
- `settings.astro` lines 108-113 (feedback)
- Various `FeedbackAlert` usage

**Common pattern** (from `BillingSection.astro` lines 54-65):
```astro
<div class="border-success-border bg-success-bg rounded-2xl border p-4">
  <div class="flex items-center gap-3">
    <Icon name="lucide:check-circle" size={20} class="text-success" />
    <div>
      <p class="text-success font-semibold">Pago exitoso</p>
      <p class="text-success text-sm">Tu suscripcion ha sido activada.</p>
    </div>
  </div>
</div>
```

**Proposed API**:
```typescript
interface Props {
  variant: "success" | "warning" | "error" | "info";
  icon: string;
  title: string;
  description?: string;
  class?: string;
}
```

### 3.3 `LoadingOverlay`
**Duplicated in** (5+ locations):
- `ingredients.astro` lines 1106-1114
- `sign-in.astro` lines 206-213
- `sign-up.astro` lines 298-305
- `Header.astro` lines 152-159
- `BillingSection.astro` lines 313-314

**Common pattern** (from `sign-in.astro` lines 206-213):
```js
const overlay = document.createElement("div");
overlay.style.cssText = "position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.2);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px)";
overlay.innerHTML = `<div style="background:var(--color-card,#fff);border-radius:1rem;padding:2rem 2.5rem;...">...`;
```

**Proposed API**:
```typescript
// In a JS/TS utility module
function showLoadingOverlay(message?: string): () => void;
// Returns a cleanup/dismiss function
```

### 3.4 `SearchInput`
**Duplicated in**:
- `ingredients.astro` lines 343-356
- `recipes/index.astro` lines 239-248

**Pattern**: Label + search icon + input with identical styling
**Proposed API**: `<SearchInput id="..." placeholder="..." />`

### 3.5 `BillingPeriodToggle`
**Duplicated in**:
- `PricingModal.astro` lines 39-58
- `pricing.astro` lines 79-97
- `PricingSection.astro` (landing) lines 33-57

**Pattern**: Monthly/Yearly toggle with -20% badge
**Proposed API**:
```typescript
interface Props {
  id: string;
  value?: "monthly" | "yearly";
  onChange?: (period: "monthly" | "yearly") => void;
}
```

### 3.6 `PricingCard`
**Duplicated in**:
- `PricingModal.astro` lines 60-191
- `pricing.astro` lines 99-220
- `PricingSection.astro` (landing) lines 63-192

All three render the same pricing plan card: badge, name, description, price display (monthly/yearly toggle), CTA button, feature list. Differences are minor (modal vs page vs landing context).

**Proposed API**:
```typescript
interface Props {
  plan: PricingPlan;
  isCurrent?: boolean;
  currentTier?: string;
  ctaLabel?: string;
  ctaHref?: string;
  period: "monthly" | "yearly";
  onSubscribe?: (planId: string, priceId: string) => void;
}
```

### 3.7 `ProgressBar` / `UsageBar`
**Duplicated in**: `BillingSection.astro` lines 216-221 and 244-249

**Pattern**:
```astro
<div class="bg-muted h-2 overflow-hidden rounded-full">
  <div class="bg-accent-500 h-full rounded-full transition-all"
    style={`width: ${pct}%`}></div>
</div>
```

**Proposed API**: `<ProgressBar value={42} max={100} color="accent" />`

### 3.8 `PageTabs`
**[recipe].astro**: Section navigation could be extracted. The settings page tabs (lines 117-160) follow a consistent link-with-icon pattern that could be reusable.

### 3.9 `DialogOpener` utility component
The open/close dialog with data attributes pattern is duplicated ~8 times across the codebase. Extracting a `bindDialog()` utility that handles open/close button binding with data attributes would save significant boilerplate.

### 3.10 `MultiplierControl`
**Duplicated in**: `[recipe].astro` lines 582-593 and 657-668 — the desktop and mobile versions of the multiplier counter are nearly identical, just wrapped in different visibility classes.

```astro
<form method="get" data-astro-reload class:list={[
  "flex items-center justify-between gap-2 rounded-xl border px-2 py-1.5 shadow-sm ... ]}>
  <span class="text-[10px] font-black uppercase tracking-widest ...">Mezclas</span>
  <div class="flex items-center gap-1 bg-background rounded-full p-1 border border-border-light">
    <a href={multiplierDownHref} ...>-</a>
    <input type="number" name="multiplier" value={multiplier} ... />
    <a href={multiplierUpHref} ...>+</a>
  </div>
</form>
```

**Proposed API**: `<MultiplierControl value={multiplier} href="/recipes/$id" />`

### 3.11 `RecipeIngredientRow` (read mode)
**Duplicated in**: `[recipe].astro` lines 776-817 (mobile) and 830-868 (desktop) — the ingredient row layout is duplicated for mobile vs desktop, just with different HTML containers.

---

## 4. Components To Simplify/Consolidate

### 4.1 `ProductionFinancialSummary` → Inline or merge
**File**: `src/components/ProductionFinancialSummary.astro` (49 lines)
This is a thin wrapper that passes `ProductionSummary` data formatted into `FinancialSummary` rows. It's only used in `produccion.astro`. Since it's 49 lines, it could be inlined, or alternatively the data-mapping logic could live in the production page itself.

### 4.2 `RecipeMiniCard` vs `RecipeGridCard`
Both show recipe name, category, and metadata. `RecipeGridCard` has additional context menu (edit/duplicate). Consider:
- `RecipeMiniCard` (53 lines) is simpler, used in "recently updated" horizontal scroll
- `RecipeGridCard` (228 lines) is full-featured with card menu
- Could extract a common `RecipeCardBase` and add menu via props: `showMenu?`, `canDuplicate?`
- Effort: moderate, but the two are already well-separated

### 4.3 `FinancialSummary` highlightRow pattern is fragile
Both `ProductionFinancialSummary` (line 47) and `[recipe].astro` (line 679) use `highlightRow={2}` — hardcoded index. If rows are reordered, the highlight shifts silently. Consider using a row key/id instead.

### 4.4 `EmptyState` is well-designed, but could accept `Button` slot
Currently `EmptyState` renders CTA as styled `<a>` or `<button>` directly. If it accepted a named `<slot name="action">`, parents could pass any component (`<Button>`, `<a>`, etc.) for more flexibility.

---

## 5. Pages With Excessive Inline Code

### 5.1 `[recipe].astro` — 1337 lines (CRITICAL)
**Breakdown**:
- **Frontmatter** (lines 1-461): Auth, form handling for 6 form actions (update_presentation, delete_presentation, create_presentation, delete_recipe, duplicate_recipe, update_recipe), calculation helpers, multiplier logic, data loading
- **Multiple dialogs**: Recipe delete (488-515), recipe duplicate (517-546), create presentation (913-1012)
- **Header section** (548-669): Title, editing inputs, multiplier (duplicated desktop/mobile), menu
- **FinancialSummary** inline (672-686)
- **Ingredients card** (689-871): Full read-mode table (desktop + mobile) + edit-mode form with ingredient rows
- **Instructions** (873-884 via `RecipeInstructions`)
- **Presentations** (886-1012): Section heading + card grid + create dialog
- **5 script blocks** (1015-1335): Comments toggle, create presentation dialog, delete dialog, duplicate dialog, recipe editor, dropdown menu
- **Template** (1227-1259): `<template>` for new ingredient rows

**What to extract**:
- `RecipeHeader.astro` (header with title, category, editing, multiplier)
- `RecipeIngredientList.astro` (read-mode ingredient table — both mobile and desktop)
- `RecipeIngredientEditor.astro` (edit-mode ingredient form with add/remove)
- `RecipeActionsMenu.astro` (dropdown menu with edit/duplicate/delete)

### 5.2 `settings.astro` — 1228 lines (CRITICAL)
**Breakdown**:
- **Frontmatter** (lines 1-103): Auth, preferences loading, form handling
- **Tab navigation** (117-160): 3 tabs (profile/preferences/billing)
- **Profile tab** (163-355): Profile card, change name form, change email form, change password form
- **Preferences tab** (359-469): Theme selector, accent color selector, save button
- **Billing tab** (473-486 via `BillingSection`)
- **Script block 1** (489-833): Full theme/preferences management with optimistic save + revert
- **Script block 2** (840-884): Tab switching logic
- **Script block 3** (886-1227): Account form handling (name, email, password) with loading states

**What to extract**:
- `SettingsTabs.astro` (tab navigation component)
- `ProfileCard.astro` (user info card)
- `ChangeNameForm.astro`, `ChangeEmailForm.astro`, `ChangePasswordForm.astro`
- `ThemeSelector.astro`, `AccentColorSelector.astro`
- Move scripts to `@/lib/settings-ui.ts`

### 5.3 `ingredients.astro` — 1122 lines (HIGH)
**Breakdown**:
- **Frontmatter** (lines 1-253): Auth, form handling for create/update/delete, data loading
- **Desktop create form** (266-312): Card with form fields + unit cost
- **Ingredient table** (314-518): Table + search + empty state + empty search state
- **Create modal dialog** (521-580)
- **Edit modal dialog** (582-734)
- **Delete confirm dialog** (736-788)
- **Script block** (790-1121): 6 init functions + form validation + form submission overlay

**What to extract**:
- `IngredientTable.astro` (table + search + actions)
- `IngredientCreateModal.astro`
- `IngredientEditModal.astro`
- `IngredientDeleteModal.astro`
- The duplicate field definitions in edit modal (lines 628-713) could use `IngredientFormFields` but with different styling — needs refactoring

---

## 6. Priority Matrix

| # | Finding | Impact | Effort | Area |
|---|---------|--------|--------|------|
| 1 | `[recipe].astro` 1337 lines — extract RecipeHeader, RecipeIngredientList, RecipeIngredientEditor | High | Complex | Page extraction |
| 2 | `ingredients.astro` 1122 lines — extract IngredientTable, 3 modals | High | Complex | Page extraction |
| 3 | `settings.astro` 1228 lines — extract forms + tabs | High | Complex | Page extraction |
| 4 | `PresentationCard.astro` dialog backdrop violation (line 229) | High | Trivial | Bug fix |
| 5 | `produccion.astro` client-side HTML rendering duplicates server components | High | Complex | Anti-pattern |
| 6 | `LoadingOverlay` duplicated 5x — extract utility | Medium | Trivial | New component |
| 7 | `ConfirmDeleteDialog` duplicated 4x — extract component | Medium | Moderate | New component |
| 8 | `StatusBanner` duplicated across billing/pricing pages | Medium | Moderate | New component |
| 9 | `PresentationCard.astro` — replace inline buttons with `<Button>` | Medium | Moderate | DS adoption |
| 10 | `PricingCard` duplicated 3x (modal, pricing page, landing) | Medium | Moderate | New component |
| 11 | `BillingPeriodToggle` duplicated 3x | Medium | Trivial | New component |
| 12 | `SearchInput` duplicated 2x | Low | Trivial | New component |
| 13 | `ProgressBar` duplicated 2x in BillingSection | Low | Trivial | New component |
| 14 | `MultiplierControl` duplicated mobile/desktop in `[recipe].astro` | Low | Trivial | New component |
| 15 | `UpgradePrompt` — replace inline buttons with `<Button>` | Low | Trivial | DS adoption |
| 16 | `PricingModal` dialog — use `<Dialog>` | Low | Trivial | DS adoption |
| 17 | `ProductionIngredientsTable` header — use `<SectionHeading>` | Low | Trivial | DS adoption |
| 18 | `PricingCard` subscribe buttons — use `<Button>` | Low | Trivial | DS adoption |
| 19 | `ProductionFinancialSummary` — inline or merge | Low | Trivial | Consolidation |
| 20 | `EmptyState` — add action slot | Low | Moderate | Enhancement |
| 21 | Password rule validation duplicated sign-up/reset-password | Low | Trivial | Extract to lib |

---

## 7. Anti-Patterns Found

### 7.1 `backdrop:bg-slate-900/50` Violation (HIGH)
**File**: `src/components/PresentationCard.astro`, line 229
```astro
class="delete-dialog fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-md rounded-3xl p-0 backdrop:bg-slate-900/50"
```
**Violates**: AGENTS.md rule: "Dialog backdrops: use `backdrop:bg-backdrop/50`, never `backdrop:bg-slate-900/50`"

### 7.2 Client-Side HTML String Rendering of Server Components (HIGH)
**File**: `src/pages/produccion.astro`, lines 213-368
The production page duplicates three server-rendered components as JavaScript HTML strings:
- `renderIngredientsTable()` (lines 213-259) duplicates `ProductionIngredientsTable.astro`
- `renderFinancialSummary()` (lines 261-308) duplicates `ProductionFinancialSummary.astro`
- `renderRecipeBreakdown()` (lines 310-367) duplicates `ProductionRecipeBreakdown.astro`

This means any visual change to the production results requires updating both the Astro component AND the JavaScript string template. This will inevitably cause drift.

**Recommendation**: Instead of client-side HTML rendering, use fetch to re-render the production data via a server endpoint or use an Astro island.

### 7.3 Inline SVG Instead of Icon Component (MEDIUM)
Multiple files use raw SVG markup instead of `<Icon name="lucide:..." />`:
- `PasswordInput.astro` lines 47-78: eye/eye-off icons as inline SVG
- `RecipeGridCard.astro` lines 75-85, 111-126: edit/duplicate icons
- `RecipeInstructions.astro` lines 213-227: timer icons
- `PresentationCard.astro` lines 77-84: pencil/x icons (partly uses Icon, partly inline SVG)
- `sign-in.astro` lines 135-148: Google logo (acceptable — Google SVG, not available in lucide)

**Risk**: Build-time validation fails if lucide icon assets change. Inline SVGs miss this validation.

### 7.4 Duplicate Validation Logic (MEDIUM)
**Files**: `sign-up.astro` lines 283-287 and `reset-password.astro` lines 197-199
Both implement password validation with the same rules (8 chars, uppercase, lowercase, digit, special). `sign-up.astro` uses `@/lib/password-validation` correctly, but `reset-password.astro` reimplements the same logic inline (lines 174-199).

### 7.5 Duplicate Dialog Binding Logic (MEDIUM)
Every dialog in the codebase repeats the same pattern:
```js
const openButtons = document.querySelectorAll("[data-open-X]");
const closeButtons = document.querySelectorAll("[data-close-X]");
// bind open/close, handle dataset.bound guard, bindDialogBackdrop
```
This appears in at least 8 places. Should be a single utility function.

### 7.6 `IngredientFormFields` Duplicates Input Component Styling (LOW)
**File**: `src/components/IngredientFormFields.astro`, lines 35-38
```astro
const inputClasses = "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition placeholder:text-subtle-foreground focus:border-accent-300 focus:bg-card focus:ring-2 focus:ring-accent-500/20";
```
These classes are almost identical to what `<Input>` provides. Since `IngredientFormFields` renders raw `<input>` elements instead of `<Input>`, the styling is forked. Same for `labelClasses` which duplicates `Input`'s label styling.

### 7.7 Hardcoded `financialRow` function in `produccion.astro` (MEDIUM)
**File**: `src/pages/produccion.astro`, lines 271-296
The `financialRow()` helper HTML-strings the FinancialSummary card styling inline, duplicating the `FinancialSummary` component's visual implementation. See 7.2.

---

## 8. Graphify Queries Executed
- N/A (switched to direct file analysis for comprehensive coverage)

## 9. Files Read
All files listed in the original scope — 20+ components, 15+ pages, 7 UI primitives, 7 landing components, and supporting utilities.

## 10. Recommendations for Orchestrator

**Immediate fixes (can be done in any order):**
1. Fix `PresentationCard.astro:229` — change `backdrop:bg-slate-900/50` to `backdrop:bg-backdrop/50` (trivial, high impact)
2. Extract `LoadingOverlay` as a utility function in `@/lib/loading-overlay.ts` (trivial, medium impact)
3. Extract `ConfirmDeleteDialog` as a reusable component (moderate, medium impact)
4. Standardize `PasswordInput` to use `<Icon>` component instead of inline SVG

**High-impact refactors:**
5. Extract components from `[recipe].astro` (proposed: RecipeHeader, RecipeIngredientList, RecipeIngredientEditor)
6. Extract components from `ingredients.astro` (proposed: IngredientTable, IngredientCreateModal, IngredientEditModal, IngredientDeleteModal)
7. Extract components from `settings.astro` (proposed: ChangeNameForm, ChangeEmailForm, ChangePasswordForm, ThemeSelector, AccentColorSelector)
8. Fix `produccion.astro` client-side rendering — consider server endpoint or Astro islands

**Design system consolidation:**
9. Replace `PresentationCard` buttons with `<Button>`
10. Replace `UpgradePrompt` buttons with `<Button>`
11. Replace pricing page raw buttons with `<Button>`
12. Have `IngredientFormFields` use `<Input>` component

**Long-term maintenance:**
13. Extract `BillingPeriodToggle`, `PricingCard`, `StatusBanner` for 3x-used patterns
14. Extract dialog binding utility to avoid 8x duplication
15. Extract password validation to `@/lib/password-validation.ts` (eliminate reset-password duplicate)
16. Extract `SearchInput` for 2x-used search pattern
