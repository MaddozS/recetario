# Task: Implement RecipeActionsMenu Component and Refactor Consumers
Agent: implementer
Date: 2026-06-08
Analysis: [analysis-20260608-1200-recipe-actions-menu.md](../analysis/analysis-20260608-1200-recipe-actions-menu.md)
Plan: [plan-20260608-1200-recipe-actions-menu.md](../plans/plan-20260608-1200-recipe-actions-menu.md)

## Goal
Create a reusable `RecipeActionsMenu.astro` component and refactor both `[recipe].astro` and `RecipeGridCard.astro` to use it. Both menus must render identically.

## Context
Currently two files have inline recipe action menus with different implementations:
- `[recipe].astro`: bordered trigger, `hidden` class toggle, astro-icon, confirmation dialogs for duplicate/delete, danger styling on delete
- `RecipeGridCard.astro`: borderless trigger, `card-menu-open` class toggle, inline SVGs, no delete, no confirmation for duplicate

We are unifying these into a single component. The user confirmed:
- Duplicar should have a confirmation dialog in both contexts
- Eliminar should have danger styling and confirmation dialog
- Both menus must look identical

## Skills Required
- **ui-ux-pro-max**: for consistent styling with semantic tokens

## Files Involved
- `src/components/RecipeActionsMenu.astro`: create — the new shared component
- `src/pages/recipes/[recipe].astro`: modify — replace inline menu with component, keep dialogs that are page-specific OR move them into the component
- `src/components/RecipeGridCard.astro`: modify — replace inline menu with component

## Files the Subagent May Create or Edit
- [ ] `src/components/RecipeActionsMenu.astro` — the new shared component
- [ ] `src/pages/recipes/[recipe].astro` — replace inline menu markup (lines ~596-623) with `<RecipeActionsMenu>`, remove dead `data-menu-toggle` JS (lines ~1310-1335), clean up dialog markup if moved into component
- [ ] `src/components/RecipeGridCard.astro` — replace inline menu markup (lines ~53-132) with `<RecipeActionsMenu>`, remove menu JS (lines ~169-227), remove menu CSS (lines ~153-166)
- [ ] `docs/tasks/task-20260608-1200-implementer-report.md` — the report file (mandatory)

## Technical Steps

### 1. Load skills
- Load `ui-ux-pro-max` skill for styling guidance

### 2. Create `RecipeActionsMenu.astro`

**Props interface:**
```typescript
interface Props {
  recipeId: number;
  editHref: string;
  canDuplicate?: boolean;
  canDelete?: boolean;
  variant?: 'card' | 'page';
}
```

**Component structure:**
- Wrapper `<div>` with `class="relative"` (or appropriate positioning)
- Trigger button:
  - `variant='card'`: absolute-positioned, borderless (like RecipeGridCard current)
  - `variant='page'`: bordered button (like [recipe].astro current, but unified styling)
  - Both use: `data-card-menu-trigger={menuId}`, `lucide:ellipsis-vertical` icon
- Menu panel:
  - `id={menuId}`, `data-card-menu`, `role="menu"`
  - Styled: `border-border bg-card rounded-xl border p-1 shadow-lg`
  - Position: `absolute right-0 top-full mt-1` (or `top-11 right-3` for card variant)
- Menu items:
  - **Editar**: `<a href={editHref}>` with `lucide:pencil` icon
  - **Duplicar** (if `canDuplicate`): `<button>` with `lucide:copy` icon, `data-open-duplicate-dialog={duplicateDialogId}`
  - **Eliminar** (if `canDelete`): `<button>` with `lucide:trash-2` icon, danger styling (`text-danger hover:bg-danger-bg`), `data-open-delete-dialog={deleteDialogId}`
- Duplicate confirmation dialog:
  - `<dialog data-animated id={duplicateDialogId}>` with confirm/cancel buttons
  - Hidden form `<form method="POST">` with `action="duplicate_recipe"` and CSRF token
  - Uses `bindDialogBackdrop()`
- Delete confirmation dialog:
  - `<dialog data-animated id={deleteDialogId}>` with danger icon, confirm/cancel buttons
  - Hidden form `<form method="POST">` with `action="delete_recipe"` and CSRF token
  - Uses `bindDialogBackdrop()`

**Styling for menu items:**
- Normal: `text-muted-foreground hover:bg-accent-50 hover:text-accent-600 rounded-lg px-3 py-2 text-sm font-medium`
- Danger: `text-danger hover:bg-danger-bg hover:text-danger rounded-lg px-3 py-2 text-sm font-medium`

**CSS (`<style>` block):**
```css
[data-card-menu] {
  opacity: 0;
  transform: scale(0.95);
  pointer-events: none;
  transition: opacity 150ms var(--ease-out), transform 150ms var(--ease-out);
}
[data-card-menu].card-menu-open {
  opacity: 1;
  transform: scale(1);
  pointer-events: auto;
}
```

**JS (`<script>` block):**
- `setupRecipeActionsMenus()`: handles `data-card-menu-trigger` click → toggle `card-menu-open` on associated `data-card-menu`
- `setupRecipeActionsDialogs()`: handles `data-open-duplicate-dialog` and `data-open-delete-dialog` buttons → open dialogs with `bindDialogBackdrop()`
- Close menus on outside click
- All bindings use `data-*-bound="1"` guard
- Listen on `astro:page-load` and `astro:after-swap`

**Unique IDs:**
- `menuId = \`ram-menu-${recipeId}\``
- `duplicateDialogId = \`ram-dup-dialog-${recipeId}\``
- `deleteDialogId = \`ram-del-dialog-${recipeId}\``

### 3. Refactor `[recipe].astro`

- Import `RecipeActionsMenu` component
- Replace inline menu markup (lines ~596-623: the `<div class="relative">` with trigger + panel) with:
  ```astro
  <RecipeActionsMenu
    recipeId={id}
    editHref={`${Astro.url.pathname}?edit=true`}
    canDuplicate={hasFeature(subscription, 'recipe_duplicate')}
    canDelete={true}
    variant="page"
  />
  ```
- Remove the standalone dialog markup for `recipe-delete-dialog` (lines ~488-515) and `recipe-duplicate-dialog` (lines ~517-546) — these are now inside the component
- Remove the standalone forms `recipe-delete-form` (lines ~478-481) and `recipe-duplicate-form` (lines ~483-486) — these are now inside the component
- Remove the `data-menu-toggle` JS block (lines ~1310-1335) — no longer needed
- Remove the dialog JS functions (`setupRecipeDeleteDialog`, `setupRecipeDuplicateDialog`) — now in component
- Keep the `recipeEditFormId` form and related JS (that's for editing, not actions menu)

### 4. Refactor `RecipeGridCard.astro`

- Import `RecipeActionsMenu` component
- Replace inline menu markup (trigger button + menu panel, lines ~53-132) with:
  ```astro
  <RecipeActionsMenu
    recipeId={id}
    editHref={`/recipes/${id}?edit=true`}
    canDuplicate={canDuplicate}
    canDelete={false}
    variant="card"
  />
  ```
- Remove the menu JS (`setupCardMenus` function and its event listeners, lines ~169-227)
- Remove the menu CSS (`[data-card-menu]` styles, lines ~153-166) — now in component
- Keep the card animation CSS (`cardFadeIn`, lines ~136-151)

### 5. Verify
- Run `pnpm astro check` — must pass with zero errors
- Run `pnpm eslint .` — must pass with zero errors
- Run `pnpm build` — must succeed

## Expected Output
- **Code changes**: 
  - `src/components/RecipeActionsMenu.astro` (new)
  - `src/pages/recipes/[recipe].astro` (modified — menu + dialogs replaced)
  - `src/components/RecipeGridCard.astro` (modified — menu replaced)
- **Report**: save to `docs/tasks/task-20260608-1200-implementer-report.md` with:
  - List of all changes made
  - Commands executed and their output
  - Any issues encountered and how they were resolved
  - Visual notes: describe how the menu looks in both contexts

## Guardrails
- Use `astro-icon` for all icons — NO inline SVGs
- Use semantic tokens only — NO hardcoded colors
- Use `backdrop:bg-backdrop/50` for dialog backdrops — NOT `backdrop:bg-slate-900/50`
- Follow `data-*-bound="1"` guard pattern for all event listeners
- Listen on both `astro:page-load` and `astro:after-swap`
- Forms must include CSRF token: `<input type="hidden" name="_csrf" value={Astro.locals.csrfToken || ""} />`
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files
- **SCOPE**: Only create/edit the files listed in "Files the Subagent May Create or Edit"
