# Analysis Report: Extract Shared RecipeActionsMenu Component

Created: 2026-06-08 12:00
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Unify the recipe actions menu in `[recipe].astro` and `RecipeGridCard.astro` into a single reusable component, with consistent styling and confirmation dialogs for destructive actions.

## Target Location
- **Primary anchor(s)**: `src/components/RecipeActionsMenu.astro` (new), `src/pages/recipes/[recipe].astro`, `src/components/RecipeGridCard.astro`
- **Layer**: component

## Surrounding Context

### Current State — Two Different Menu Systems

**`[recipe].astro` menu (lines 596-623):**
- Trigger: bordered button (`rounded-xl border bg-card`) with `data-menu-toggle="recipe-actions"`
- Panel: `data-menu-panel="recipe-actions"` with `hidden` class toggle
- Items: Editar (form GET), Duplicar (button → dialog), Eliminar (button → dialog, danger styled)
- JS: generic dropdown handler in `<script is:inline>` (lines 1310-1335)
- Icons: `astro-icon` (`lucide:*`)
- No CSS animation on open/close

**`RecipeGridCard.astro` menu (lines 53-132):**
- Trigger: borderless absolute-positioned button with `data-card-menu-trigger`
- Panel: `data-card-menu` with `card-menu-open` class toggle
- Items: Editar (`<a>` link with inline SVG), Duplicar (form POST with inline SVG, no confirmation)
- JS: `setupCardMenus()` in `<script>` (lines 169-227)
- Icons: inline SVG (not astro-icon)
- CSS animation: scale + opacity transition on open/close
- No delete option

### Key Differences

| Aspect | `[recipe].astro` | `RecipeGridCard.astro` |
|--------|------------------|------------------------|
| Trigger style | Bordered button | Borderless absolute button |
| Icons | `astro-icon` (`lucide:*`) | Inline SVGs |
| Open/close mechanism | `hidden` class | `card-menu-open` class |
| Animation | None | Scale + opacity CSS transition |
| Editar | `<form method="get">` | `<a href>` |
| Duplicar | Button → confirmation dialog | Direct form POST |
| Eliminar | Button → confirmation dialog, danger styled | Not present |

### Dialogs
- `[recipe].astro` has two dialogs: `recipe-delete-dialog` (lines 488-515) and `recipe-duplicate-dialog` (lines 517-546)
- Dialog JS: `setupRecipeDeleteDialog()` and `setupRecipeDuplicateDialog()` with `bindDialogBackdrop()`
- `RecipeGridCard.astro` has no dialogs

## Detected Tech Debt / Potential Refactors
- Inline SVGs in RecipeGridCard should use `astro-icon` for consistency
- Two separate menu JS systems (`data-menu-toggle` vs `data-card-menu-trigger`) should unify
- Duplicar in RecipeGridCard lacks confirmation (user confirmed it should have one)

## Codebase Patterns to Follow
- **Component pattern**: Astro `.astro` file with Props interface, `astro-icon` for icons
- **UI barrel**: `@/components/ui` for Button, Badge, etc.
- **Dialog pattern**: `<dialog data-animated>` + `bindDialogBackdrop()` from `@/lib/dialog`
- **Client bindings**: `data-*-bound="1"` guard, `astro:page-load` + `astro:after-swap`
- **Menu pattern**: adopt `data-card-menu-trigger` / `data-card-menu` with CSS animation (already componentized)

## Complexity Assessment
- **Decision**: ajuste
- **Rationale**: Mechanical refactor — extract shared component, unify styling. No new pages, routes, APIs, models, auth, or Stripe changes.

## Dependencies & Prerequisites
- `astro-icon` with `lucide:pencil`, `lucide:copy`, `lucide:trash-2` already in whitelist
- `bindDialogBackdrop` from `@/lib/dialog` already exists
- `hasFeature` from `@/lib/subscription` for `recipe_duplicate` flag

## Past Related Work
- None directly related
