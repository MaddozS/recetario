# Explore Report: Menu Patterns and Consumers

Date: 2026-06-08 12:05
Agent: explorer
Task File: [task-20260608-1200-explorer.md](./task-20260608-1200-explorer.md)

## Target Area Explored
- **Primary files**:
  - `src/pages/recipes/[recipe].astro` — recipe detail page with inline dropdown menu + confirmation dialogs
  - `src/components/RecipeGridCard.astro` — card component with inline card menu
  - `src/lib/dialog.ts` — `bindDialogBackdrop()` utility
  - `src/pages/recipes/index.astro` — recipes list page (consumer of RecipeGridCard)
- **Adjacent files**:
  - `src/pages/ingredients.astro` — also uses `bindDialogBackdrop`
  - `src/components/PresentationCard.astro` — also uses `bindDialogBackdrop`

## Patterns Found

### Menu data attributes — complete usage inventory

| Data attribute | Source file(s) | Only in source? |
|---|---|---|
| `data-menu-toggle="recipe-actions"` | `[recipe].astro:598` | ✅ yes, only here |
| `data-menu-panel="recipe-actions"` | `[recipe].astro:604` | ✅ yes, only here |
| `data-card-menu-trigger={cardMenuId}` | `RecipeGridCard.astro:55` | ✅ yes, only here |
| `data-card-menu` | `RecipeGridCard.astro:66` | ✅ yes, only here |

**Conclusion**: The two menu systems are fully isolated to their respective files. No other `.astro` file uses any of these four data attributes.

### Dialog ID usage — complete inventory

| Dialog ID | Used in | Only in source? |
|---|---|---|
| `recipe-delete-dialog` | `[recipe].astro` (const:385, markup:488-515, open btn:617, JS:1117-1164) | ✅ yes, only here |
| `recipe-duplicate-dialog` | `[recipe].astro` (const:387, markup:517-546, open btn:612, JS:1173-1221) | ✅ yes, only here |

**Conclusion**: Both dialog IDs are exclusively in `[recipe].astro`. No other file references them.

### Dialog data attributes — complete inventory

| Data attribute | Used in |
|---|---|
| `data-open-recipe-delete-dialog="recipe-delete-dialog"` | `[recipe].astro` only |
| `data-close-recipe-delete-dialog="recipe-delete-dialog"` | `[recipe].astro` only |
| `data-open-recipe-duplicate-dialog="recipe-duplicate-dialog"` | `[recipe].astro` only |
| `data-close-recipe-duplicate-dialog="recipe-duplicate-dialog"` | `[recipe].astro` only |

### RecipeGridCard consumers

| File | Import line | Usage line |
|---|---|---|
| `src/pages/recipes/index.astro` | Line 15 | Line 311 (inside map over `filteredRecipes`) |

**Only one consumer**: `index.astro`. No other file imports `RecipeGridCard`.

### Menu JS functions — complete inventory

| Function | File | Lines | Pattern |
|---|---|---|---|
| `setupDropdownMenus()` | `[recipe].astro` | 1310-1335 | `<script is:inline>`, `data-dropdown-bound` guard, toggles `hidden` class on `data-menu-panel`, global close-all on outside click |
| `setupRecipeDeleteDialog()` | `[recipe].astro` | 1117-1164 | `<script>`, open/close button binding, `bindDialogBackdrop()`, `recipeDeleteDialogBound` guard |
| `setupRecipeDuplicateDialog()` | `[recipe].astro` | 1173-1221 | `<script>`, open/close button binding, `bindDialogBackdrop()`, `recipeDuplicateDialogBound` guard |
| `setupCardMenus()` | `RecipeGridCard.astro` | 169-227 | `<script>`, `cardMenuBound` guard, toggles `card-menu-open` class, `aria-expanded` management, outside-click close, CSS animation |

### `bindDialogBackdrop` API summary

**Defined in**: `src/lib/dialog.ts` (13 lines)

```typescript
export function bindDialogBackdrop(dialog: HTMLDialogElement): void {
  if (dialog.dataset.backdropBound === "1") return;  // guard — prevent double bind
  dialog.dataset.backdropBound = "1";
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();  // close only on backdrop click, not on content click
  });
}
```

**Key characteristics**:
- Uses `data-backdrop-bound` guard for idempotency across SPA navigations
- Closes dialog only when clicking the backdrop (not dialog content) via `event.target === dialog`
- All consumers also implement their own open/close button binding with per-dialog guards (e.g. `recipeDeleteDialogBound`, `recipeDuplicateDialogBound`)
- All consumers bind on both `astro:page-load` and `astro:after-swap`

**Consumers**:

| File | Calls | For |
|---|---|---|
| `src/pages/recipes/[recipe].astro` | 3 | delete dialog, duplicate dialog, create presentation dialog |
| `src/pages/ingredients.astro` | 4 | ingredient modals |
| `src/components/PresentationCard.astro` | 1 | delete presentation dialog |

### Key pattern differences between the two menus

| Aspect | `[recipe].astro` | `RecipeGridCard.astro` |
|---|---|---|
| **Trigger** | Bordered button (`rounded-xl border border-border bg-card`) with `data-menu-toggle` | Borderless absolute-positioned button with `data-card-menu-trigger` |
| **Panel visibility** | `hidden` class toggle | `card-menu-open` class toggle |
| **Animation** | None (instant show/hide) | CSS transition (opacity + scale, 150ms) |
| **JS approach** | `<script is:inline>` with `data-dropdown-bound` guard on `<html>` | `<script>` with `cardMenuBound` guard on each trigger |
| **Outside-click close** | Global: `document.querySelectorAll('[data-menu-panel]')` → add `hidden` | Scoped: checks `!closest('[data-card-menu-trigger]') && !closest('[data-card-menu]')` |
| **aria-expanded** | Not managed | Managed (set to "false" on close, "true" on open) |
| **Dialog confirmations** | Yes (delete + duplicate) | No |

## Tech Debt / Potential Refactors

1. **`[recipe].astro` JS is split across two `<script>` blocks**:
   - `<script>` block (line 1015) handles dialog bindings and comments toggle
   - `<script is:inline>` block (line 1310) handles dropdown menu
   - The refactor should consolidate dialog + menu JS into the shared component

2. **`[recipe].astro` dropdown JS has a known gotcha from history**:
   - Previously (bug fix) the `setupDropdownMenus()` was accidentally inside `{isEditMode && (...)}` conditional — now it's correctly outside at line 1309. The refactor must keep any shared JS outside conditionals.

3. **`RecipeGridCard.astro` has inline SVGs** in the menu (pencil, copy icons) — the refactor should replace with `<Icon>` from `astro-icon` for consistency (already noted in the plan).

4. **`RecipeGridCard.astro` duplicate action lacks confirmation dialog** — the plan adds one.

5. **`data-dropdown-bound` guard is on `document.documentElement`** — this is a single global guard, which means if two pages had `data-menu-toggle` menus they'd share one guard. Not an issue since only one file uses it, but could become one.

6. **`data-card-menu-trigger` uses per-trigger `cardMenuBound` guard** — each button gets its own guard, which is safer for multi-card pages.

## Commands Executed

- `grep data-menu-toggle *` — found 19 matches, all in task/plan/docs files or `[recipe].astro` source
- `grep data-menu-panel *` — found 11 matches, same pattern
- `grep data-card-menu-trigger *` — found 16 matches, all in `RecipeGridCard.astro` or docs
- `grep data-card-menu *` — found 28 matches, same pattern
- `grep recipe-delete-dialog *` — found 12 matches, all in `[recipe].astro` or docs
- `grep recipe-duplicate-dialog *` — found 12 matches, same pattern
- `grep RecipeGridCard *` — found 61 matches, only source file is `index.astro` (import + usage)
- `grep bindDialogBackdrop *` — found 31 matches, used in 3 source files + docs
- `read src/lib/dialog.ts` — understood the API
- `read src/pages/recipes/[recipe].astro` lines 380-395, 485-550, 590-650, 1010-1230, 1300-1340 — understood menu markup, dialog markup, and JS
- `read src/components/RecipeGridCard.astro` — understood card menu markup, CSS, and JS
- `read src/pages/recipes/index.astro` lines 1-30, 300-330 — confirmed RecipeGridCard usage

## Files Read

- `src/lib/dialog.ts`: `bindDialogBackdrop()` — 13-line utility, simple guard+listener pattern
- `src/pages/recipes/[recipe].astro` sections:
  - Lines 380-395: dialog ID constants (`recipeDeleteDialogId`, `recipeDuplicateDialogId`)
  - Lines 485-546: dialog markup (delete + duplicate)
  - Lines 590-650: menu markup with `data-menu-toggle`/`data-menu-panel`
  - Lines 1010-1225: JS for dialog binding (`setupRecipeDeleteDialog`, `setupRecipeDuplicateDialog`, `setupCreatePresentationDialog`)
  - Lines 1300-1340: JS for dropdown menu (`setupDropdownMenus`)
- `src/components/RecipeGridCard.astro` (full file):
  - Lines 53-132: menu markup with `data-card-menu-trigger`/`data-card-menu`
  - Lines 135-167: CSS for menu animation (`[data-card-menu]`, `.card-menu-open`)
  - Lines 169-228: JS (`setupCardMenus`)
- `src/pages/recipes/index.astro`:
  - Line 15: import of RecipeGridCard
  - Line 311: usage in filtered recipes grid

## Recommendations for Orchestrator

1. **Safe to proceed**: All menu data attributes, dialog IDs, and JS functions are confined to their respective files (`[recipe].astro` and `RecipeGridCard.astro`). There are zero cross-file dependencies.

2. **Refactoring `[recipe].astro`** — the menu markup (lines 595-623), dialog markup (lines 488-546), dropdown JS (lines 1310-1335), and dialog JS (lines 1117-1224) can all be extracted into the shared component without affecting any other file.

3. **Refactoring `RecipeGridCard.astro`** — the menu markup (lines 53-132), CSS (lines 153-166), and JS (lines 169-227) can all be extracted without affecting any other file. The only consumer (`index.astro`) needs no changes.

4. **Risks to watch for**:
   - The `data-dropdown-bound` guard in `[recipe].astro` uses `document.documentElement` — if the shared component uses a different guard pattern, ensure both don't coexist during the transition
   - The new `RecipeActionsMenu` component's JS must bind on both `astro:page-load` and `astro:after-swap` (both existing patterns do this, so maintain consistency)
   - Dialog JS must use unique data-bound guards per dialog function to prevent duplicate binding (existing pattern in both files)

5. **No adjacent code needs changes**: `ingredients.astro` and `PresentationCard.astro` use `bindDialogBackdrop` for their own unrelated dialogs — no impact.

