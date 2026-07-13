# Plan: Extract Shared RecipeActionsMenu Component

Created: 2026-06-08 12:00
Orchestrator: orchestrator
Analysis: [analysis-20260608-1200-recipe-actions-menu.md](../analysis/analysis-20260608-1200-recipe-actions-menu.md)

## Goal
Create a reusable `RecipeActionsMenu.astro` component that unifies the recipe actions menu currently duplicated (with differences) in `[recipe].astro` and `RecipeGridCard.astro`. Both consumers must render identical menus. Destructive actions (delete, duplicate) require confirmation dialogs.

## Acceptance Criteria
- [ ] New `RecipeActionsMenu.astro` component exists at `src/components/RecipeActionsMenu.astro`
- [ ] `[recipe].astro` uses `RecipeActionsMenu` instead of inline menu markup
- [ ] `RecipeGridCard.astro` uses `RecipeActionsMenu` instead of inline menu markup
- [ ] Both menus look identical: same trigger style, same item styling, same animation
- [ ] All menu items use `astro-icon` (`lucide:*`) — no inline SVGs
- [ ] Eliminar renders with danger styling (`text-danger`, `hover:bg-danger-bg`)
- [ ] Duplicar opens a confirmation dialog in both contexts
- [ ] Eliminar opens a confirmation dialog in both contexts
- [ ] Menu open/close uses CSS animation (scale + opacity)
- [ ] `pnpm astro check` passes with zero errors
- [ ] `pnpm eslint .` passes with zero errors
- [ ] `pnpm build` succeeds

## Analysis Summary
- Two different menu systems exist with different trigger styles, icon approaches, animation, and confirmation behavior
- The `data-card-menu-trigger` / `data-card-menu` pattern from RecipeGridCard has better UX (CSS animation) and should be the unified pattern
- `astro-icon` should replace inline SVGs
- Confirmation dialogs for both Duplicar and Eliminar

## Design Decisions

### Component API
```typescript
interface Props {
  recipeId: number;
  editHref: string;           // URL for Editar action
  canDuplicate?: boolean;     // show Duplicar option
  canDelete?: boolean;        // show Eliminar option
  variant?: 'card' | 'page'; // positioning context
}
```

- `variant='card'`: trigger is absolute-positioned (for RecipeGridCard)
- `variant='page'`: trigger is a bordered button (for [recipe].astro)
- Component renders: trigger button + menu panel + duplicate dialog + delete dialog
- Dialogs are self-contained within the component (each instance has unique IDs based on recipeId)

### Menu Items
- **Editar**: `<a href={editHref}>` link (simpler than form GET)
- **Duplicar**: button that opens confirmation dialog → form POST on confirm
- **Eliminar**: button with danger styling that opens confirmation dialog → form POST on confirm

### Styling (unified)
- Trigger: `text-subtle-foreground hover:bg-muted hover:text-secondary-foreground rounded-lg`
- Menu panel: `border-border bg-card rounded-xl border p-1 shadow-lg` with CSS animation
- Normal items: `text-muted-foreground hover:bg-accent-50 hover:text-accent-600 rounded-lg`
- Danger items: `text-danger hover:bg-danger-bg hover:text-danger rounded-lg`
- Icons: `astro-icon` with `lucide:pencil`, `lucide:copy`, `lucide:trash-2`

### JS Behavior
- Menu toggle: `data-card-menu-trigger` / `data-card-menu` with `card-menu-open` class
- Dialogs: `bindDialogBackdrop()` from `@/lib/dialog`
- All bindings use `data-*-bound="1"` guard + `astro:page-load` / `astro:after-swap`

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Duplicate dialog IDs when multiple menus on same page | Dialogs open incorrectly | Use `recipeId` to generate unique IDs: `duplicate-dialog-${recipeId}` |
| RecipeGridCard loses its card-specific animation | Visual regression | Component includes the CSS animation in its own `<style>` block |
| `data-card-menu` JS conflicts with existing `data-menu-toggle` JS | Both handlers fire | Remove `data-menu-toggle` JS from `[recipe].astro` after migration |

## Tasks

### Task 1: Explore current menu patterns
- **Agent**: explorer
- **Skills**: none
- **Summary**: Verify all consumers of menu-related data attributes and dialog patterns. Confirm no other files use `data-menu-toggle` or `data-card-menu-trigger`.

### Task 2: Implement RecipeActionsMenu component and refactor consumers
- **Agent**: implementer
- **Skills**: `ui-ux-pro-max`
- **Summary**: Create `RecipeActionsMenu.astro`, refactor `[recipe].astro` and `RecipeGridCard.astro` to use it, remove dead menu JS.

### Task 3: Review implementation
- **Agent**: reviewer
- **Skills**: `ui-ux-pro-max`
- **Summary**: Verify both menus render identically, confirmation dialogs work, danger styling applied, `pnpm astro check` + `pnpm eslint .` + `pnpm build` pass.

### Task 4: Post-implementation analysis
- **Agent**: closer
- **Skills**: none
- **Summary**: Mode ANALYZE — audit the refactor for missed patterns, suggest improvements.

## Retrospective

### Rework Cycles: 2

**Fix 1** (closer suggestion): Dialog binding used `querySelector` (singular) — only first instance's dialogs bound on multi-instance pages. Fixed by changing to `querySelectorAll` + iteration. Also added document-level click listener guard for SPA safety.

**Fix 2** (reviewer finding): Close button selectors were document-global, undermining fix 1. Non-first dialogs' "Cancelar" buttons didn't work. Fixed by scoping to `dialog.querySelectorAll(...)`.

### Lessons
- Shared components with dialogs must use `querySelectorAll` + iteration for ALL element queries (open triggers AND close buttons)
- Document-level event listeners need SPA guards (`documentElement.dataset.*`)
- The reviewer's residual issue detection caught an incomplete fix before deployment
