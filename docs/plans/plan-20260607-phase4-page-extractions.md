# Plan: Phase 4 — Page Extractions (Reduce Mega-Pages)

Created: 2026-06-07
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20250607-component-extraction.md
Scope: Extract components from 3 oversized pages (1337 + 1228 + 1122 = 3687 lines → target ~1500 lines total)
Depends on: Phase 2 (new components), Phase 3 (DS adoption patterns)

## Goal
Break up the 3 largest page files by extracting reusable components, reducing each to ~400-500 lines.

## Target Files
| Page | Current Lines | Target Lines | Extractions |
|------|--------------|-------------|-------------|
| `[recipe].astro` | 1337 | ~500 | RecipeHeader, RecipeIngredientList, RecipeIngredientEditor, RecipeActionsMenu, MultiplierControl |
| `settings.astro` | 1228 | ~400 | ProfileCard, ChangeNameForm, ChangeEmailForm, ChangePasswordForm, ThemeSelector, AccentColorSelector, SettingsTabs; move scripts to `@/lib/settings-ui.ts` |
| `ingredients.astro` | 1122 | ~500 | IngredientTable, IngredientCreateModal, IngredientEditModal, IngredientDeleteModal |

## Acceptance Criteria
- [ ] `[recipe].astro` reduced to ~500 lines
- [ ] `settings.astro` reduced to ~400 lines
- [ ] `ingredients.astro` reduced to ~500 lines
- [ ] All extracted components are in `src/components/`
- [ ] All script blocks extracted to `src/lib/*.ts` where applicable
- [ ] No functionality changes — pure refactor
- [ ] `pnpm astro check` passes
- [ ] `pnpm eslint .` passes
- [ ] Visual parity at desktop (1280px) and mobile (375px)

## Extraction Details

### A. `[recipe].astro` (1337 lines → ~500)

#### A1. `MultiplierControl.astro`
- Extract from lines 582-593 (desktop) and 657-668 (mobile) — identical code, different visibility classes
- Props: `{ value: number; showAdjusted: boolean; downHref: string; upHref: string; class?: string }`
- Renders the "Mezclas" counter with +/- buttons

#### A2. `RecipeHeader.astro`  
- Extract from lines 548-654 (title, category, edit inputs, badge, timestamp, edit mode buttons)
- Props: `{ recipe: RecipeData; isEditMode: boolean; multiplier: number; showAdjusted: boolean; multiplierDownHref: string; multiplierUpHref: string; lastUpdatedText: string; category: string | null; name: string; editFormId: string; subscription: UserSubscriptionInfo }`
- Includes MultiplierControl internally

#### A3. `RecipeActionsMenu.astro`
- Extract from lines 596-623 (dropdown menu with edit/duplicate/delete)
- Props: `{ recipeId: number; isEditMode: boolean; canDuplicate: boolean; deleteDialogId: string; duplicateDialogId: string }`
- Keep the dropdown JS (setupDropdownMenus) — either inline or extract to `@/lib/dropdown-menu.ts`

#### A4. `RecipeIngredientList.astro`
- Extract from lines 776-868 (read-mode ingredient table, mobile + desktop)
- Props: `{ ingredients: RecipeIngredientWithData[]; multiplier: number; showAdjusted: boolean; showComments: boolean }`
- Contains both mobile card layout and desktop table layout

#### A5. `RecipeIngredientEditor.astro`
- Extract from lines 698-756 + template (lines 1227-1259) (edit-mode ingredient form)
- Props: `{ formId: string; recipeIngredients: RecipeIngredientWithData[]; allIngredients: Ingredient[]; unitOptions: string[] }`
- Includes the `<template>` for new rows and the add/remove JS

#### A6. Extract scripts to `src/lib/recipe-page.ts`
- `initCommentsToggle()` (lines 1018-1056)
- `setupCreatePresentationDialog()` (lines 1058-1115)
- `setupRecipeDeleteDialog()` (lines 1117-1164)
- `setupRecipeDuplicateDialog()` (lines 1173-1221)
- `setupRecipeEditor()` (lines 1262-1306, inline script)
- `setupDropdownMenus()` (lines 1310-1335, inline script)

### B. `settings.astro` (1228 lines → ~400)

#### B1. `ProfileCard.astro`
- Extract from lines 168-204 (user avatar + name + email display)
- Props: `{ user: User; userInitial: string }`

#### B2. `ChangeNameForm.astro`
- Extract from lines 207-261 (Card with form)
- Props: `{ firstName: string; lastName: string }`
- Keep JS binding in settings-ui.ts

#### B3. `ChangeEmailForm.astro`
- Extract from lines 266-308 (Card with form)
- Props: `{}` (no initial values needed, form resets)

#### B4. `ChangePasswordForm.astro`
- Extract from lines 311-353 (Card with form)
- Props: `{}` (no initial values)

#### B5. `ThemeSelector.astro`
- Extract from lines 393-417 (theme buttons: system/light/dark)
- Props: `{ currentTheme: string; options: ThemeOption[] }`

#### B6. `AccentColorSelector.astro`
- Extract from lines 419-462 (accent color grid)
- Props: `{ currentAccent: AccentFamily; families: AccentFamily[]; labels: Record<AccentFamily, string>; getPreviewColor: (f: AccentFamily) => string }`

#### B7. Extract scripts to `src/lib/settings-ui.ts`
- `setupSettings()` (lines 489-837) — theme/accent toggle + optimistic save
- `setupSettingsTabs()` (lines 840-884) — tab switching
- `setupAccountForms()` (lines 886-1227) — name/email/password forms with fetch

### C. `ingredients.astro` (1122 lines → ~500)

#### C1. `IngredientTable.astro`
- Extract from lines 314-518 (Card with table + search + empty states)
- Props: `{ ingredients: Ingredient[]; ingredientUsage: Record<number, {id:number;name:string}[]> }`
- Includes search input, empty state, empty search state

#### C2. `IngredientCreateModal.astro`
- Extract from lines 521-580 (mobile create dialog)
- Props: `{ defaultUnit: string }`
- Uses `<IngredientFormFields>` and `<UnitCostDisplay>` internally

#### C3. `IngredientEditModal.astro`
- Extract from lines 582-734 (edit dialog)
- Props: `{ defaultUnit: string }`
- Note: Currently duplicates IngredientFormFields layout with `edit-` prefix IDs. Should refactor to use `<IngredientFormFields idPrefix="edit" />` instead.

#### C4. `IngredientDeleteModal.astro`
- Extract from lines 736-788 (delete confirmation dialog)
- Props: `{}` (populated dynamically via JS data attributes)
- Could use `<ConfirmDialog>` from Phase 2, but needs dynamic content population (ingredient name, usage list) — may need a slot

#### C5. Extract scripts to `src/lib/ingredients-page.ts`
- `syncIngredientFormState()` (lines 802-835)
- `bindIngredientForm()` (lines 837-859)
- `initIngredientCreateForm()` (lines 861-865)
- `initCreateIngredientModal()` (lines 867-898)
- `initIngredientSearch()` (lines 901-933)
- `initEditIngredientModal()` (lines 935-1013)
- `initDeleteModal()` (lines 1016-1086)
- Form submit overlay (lines 1096-1116) — use `showLoadingOverlay()` from Phase 1

## Tasks

### Task 1: Extract [recipe].astro components
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Create MultiplierControl, RecipeHeader, RecipeActionsMenu, RecipeIngredientList, RecipeIngredientEditor. Extract scripts to `src/lib/recipe-page.ts`. Update `[recipe].astro` to use them.

### Task 2: Extract settings.astro components
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Create ProfileCard, ChangeNameForm, ChangeEmailForm, ChangePasswordForm, ThemeSelector, AccentColorSelector. Extract scripts to `src/lib/settings-ui.ts`. Update `settings.astro` to use them.

### Task 3: Extract ingredients.astro components
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Create IngredientTable, IngredientCreateModal, IngredientEditModal, IngredientDeleteModal. Extract scripts to `src/lib/ingredients-page.ts`. Update `ingredients.astro` to use them. Refactor edit modal to use `<IngredientFormFields idPrefix="edit" />`.

### Task 4: Verify all extractions
- **Agent**: reviewer
- **Skills**: verification-before-completion, ui-ux-pro-max
- **Summary**: Run `pnpm astro check` and `pnpm eslint .`. Verify line count targets met. Visual parity check at desktop (1280px) and mobile (375px) for all 3 pages. Verify no functionality regression.
