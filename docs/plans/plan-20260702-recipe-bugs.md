# Plan: Recipe Page Bug Fixes

## Summary
Fix 6 bugs on the recipe detail page (`[recipe].astro`) related to the fixed costs UI, FinancialSummary widget, tab persistence, and edit animation. Changes span 3 files with no schema or data-layer modifications.

## Inputs
- Spec: Inline user request (6 bugs on recipe page)
- Memory context: none
- Explore report: `docs/analysis/analysis-20260702-recipe-page-bugs-explore.md`

## Skills
Selected:
- `ponytail` — keep changes minimal, shortest diff that works
- `security-best-practices` — verify no ownerId / CSRF issues introduced

Discarded:
- `ui-ux-pro-max` — no design work needed
- `stripe-best-practices` — no billing changes
- `prisma-client-api` — no new Prisma queries
- `design-system-verify` — no UI token changes

May load if needed:
- none

Added During Execution:
- none

## Human Approval
not-required — No schema changes, no auth/billing changes, no new POST handlers, no destructive data operations.

## Task Dependencies
| Task | Depends On | Parallel-Safe | Reason |
|------|------------|---------------|--------|
| Task 1: [recipe].astro fixes (Bugs 2,3,4,5) | — | yes | All changes in same file, non-overlapping regions |
| Task 2: RecipeFixedCosts button (Bug 1) | — | yes (with T1, T3) | Different file, no overlap |
| Task 3: RecipeActionsMenu animation (Bug 6) | — | yes (with T1, T2) | Different file, no overlap |

## Tasks

### Task 1: Fix financial rows, margin editability, widget position, tab persistence
**Scope**: fix — [recipe].astro (4 non-overlapping edits)
**Owner**: kitchcalc-builder
**Editable files**:
- `apps/web/src/pages/recipes/[recipe].astro`

**Instructions**:

#### A) Bug 2 — Remove per-fixed-cost rows from financial summary (lines 762-808)
In the `buildFinancialRows()` function, `hasAdvancedCosts` branch (line 763):
- **Remove** the for loop (lines 769-781) that iterates over `recipe.recipeFixedCosts` and pushes individual rows for each fixed cost
- **Change** `highlightIndex: 3` → `highlightIndex: 2` on line 807 (after removing rows 1..N, "Costo Total Receta" shifts from index N+2 to fixed index 2)
- **Change** `editRowIndices: [4]` → `editRowIndices: [3]` on line 807 (margin shifts from index N+3 to fixed index 3)

After the fix, advanced cost rows are stable regardless of fixed cost count:
| Index | Label | Color |
|-------|-------|-------|
| 0 | Costo Insumos | danger |
| 1 | Total Costos Fijos | muted |
| 2 | Costo Total Receta | accent (highlight) |
| 3 | Margen Deseado | success (editable) |

#### B) Bug 3 — Fix desired margin rowIndex (line 827)
In `buildFinancialEditFields()`, line 827:
- **Change** `rowIndex: 4` → `rowIndex: 3` to match the new row position after removing per-fixed-cost rows

#### C) Bug 4 — Move FinancialSummary above tabs
- **Move** the FinancialSummary div block (lines 1345-1354):
  ```astro
  <!-- Financial Summary - always visible -->
  <div class="pt-6">
    <FinancialSummary
      rows={financialRows}
      highlightRow={financialHighlightIndex}
      isEditMode={isEditMode}
      editFormId={recipeEditFormId}
      editFields={financialEditFields}
    />
  </div>
  ```
- **Move to**: between the header section (ending ~line 955) and the tabs section (starting ~line 957), placing it **before** the tabs block
- Remove the `<!-- Financial Summary - always visible below tabs -->` comment; add `<!-- Financial Summary - always visible above tabs -->`

#### D) Bug 5 — Preserve active tab across edit-mode redirects (script, lines 1459-1542)
In the `setupTabs` function, add sessionStorage persistence:

1. **In `activateTab`** (after `history.replaceState(...)` on line 1483): Add:
   ```javascript
   // Persist active tab per recipe across redirects
   sessionStorage.setItem(`recipe-tab:${window.location.pathname}`, tabId);
   ```

2. **In initialization** (replace lines 1487-1489): Change from:
   ```javascript
   const initialTab = window.location.hash?.replace('#', '') || 'ingredientes';
   ```
   To:
   ```javascript
   const storedTab = sessionStorage.getItem(`recipe-tab:${window.location.pathname}`);
   const initialTab = window.location.hash?.replace('#', '') || storedTab || 'ingredientes';
   ```

This ensures that after the `update_recipe` redirect (which drops the hash), the previously active tab is restored from sessionStorage. The pathname-based key scopes persistence to each recipe.

**Acceptance criteria**:
- With 0 fixed costs, the FinancialSummary shows 4 rows (Insumos, Total Costos Fijos, Costo Total Receta, Margen Deseado) — no per-cost rows
- With 3 fixed costs, same 4 rows — no per-cost rows
- Margen Deseado field is editable in edit mode (shows `<input type="number">`) regardless of fixed cost count
- FinancialSummary renders above the tab bar
- After editing and saving ("Guardar"), the user stays on the tab they were on before the edit
- Navigating between recipes resets the tab to hash/default (sessionStorage is pathname-scoped)

**Validation**:
```bash
pnpm astro check
pnpm dev
# Manual: navigate to a recipe with advanced costs, verify FinancialSummary
# has 4 rows, no per-fixed-cost rows. Toggle edit mode, verify margin is
# editable. Verify FinancialSummary is above tabs. Switch tabs, edit, save —
# verify tab persists.
```

**Suggested skills**:
- `ponytail` — minimal diff

---

### Task 2: Always show "Agregar Costo Fijo" button (Bug 1)
**Scope**: fix — RecipeFixedCosts.astro
**Owner**: kitchcalc-builder
**Editable files**:
- `apps/web/src/components/RecipeFixedCosts.astro`

**Instructions**:

**Remove the `isEditing &&` guard** from two locations:

1. **Button** (lines 30-38): Remove the `isEditing && (` wrapper and its closing `)` after the `</Button>`:
   ```diff
   - {
   -   isEditing && (
         <Button variant="primary" icon="plus" data-open-recipe-fixed-dialog={createDialogId}>
           Agregar Costo Fijo
         </Button>
   -   )
   - }
   + <Button variant="primary" icon="plus" data-open-recipe-fixed-dialog={createDialogId}>
   +   Agregar Costo Fijo
   + </Button>
   ```

2. **Dialog** (lines 67-212): Remove the `isEditing && (` wrapper and its closing `)` after the `</dialog>`:
   ```diff
   - {
   -   isEditing && (
         <dialog data-animated id={createDialogId} ...>
           ...
         </dialog>
   -   )
   - }
   ```

**Note**: The `isEditing` prop can remain in the Props interface — it's still accepted but no longer read. This avoids cascading changes to the call site in `[recipe].astro`. The `FixedCostCard` component handles its own edit/display toggle independently.

**Acceptance criteria**:
- "Agregar Costo Fijo" button is visible in both view and edit mode
- Clicking it opens the create dialog
- Dialog submits correctly via fetch JSON endpoint (existing behavior)
- Fixed cost cards still display edit/delete toggles via their own web component logic

**Validation**:
```bash
pnpm dev
# Navigate to a recipe, verify "Agregar Costo Fijo" button is visible
# without entering edit mode. Create a fixed cost. Verify card appears.
```

**Suggested skills**:
- `ponytail` — minimal diff

---

### Task 3: Disable slide animation for edit-mode navigation (Bug 6)
**Scope**: fix — RecipeActionsMenu.astro
**Owner**: kitchcalc-builder
**Editable files**:
- `apps/web/src/components/RecipeActionsMenu.astro`

**Instructions**:

**Add `data-astro-reload`** to the edit link `<a>` tag (line 79-85):
```diff
  <a
    href={editHref}
+   data-astro-reload
    class="text-muted-foreground hover:bg-accent-50 hover:text-accent-600 flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
    role="menuitem"
  >
    <Icon name="lucide:pencil" size={16} /> Editar
  </a>
```

This causes the "Editar" link to perform a full page load instead of an Astro View Transition. The `transition:animate="slide"` on the outer div (line 839 of `[recipe].astro`) will therefore NOT fire when entering edit mode. Recipe-to-recipe navigation still uses View Transitions (those use different URLs).

**Acceptance criteria**:
- Clicking "Editar" navigates to edit mode without the slide animation
- Navigating between different recipes still shows the slide animation (View Transition active for cross-recipe links)
- The `data-astro-reload` does not affect the edit form submission (that form already has its own `data-astro-reload`)

**Validation**:
```bash
pnpm dev
# Navigate to recipe A, click Editar — no slide animation.
# Navigate from recipe A to recipe B via sidebar — slide animation plays.
```

**Suggested skills**:
- `ponytail` — one-line change

## Parallel Execution Notes

All three tasks modify **different files** with no overlap:
- Task 1: `apps/web/src/pages/recipes/[recipe].astro`
- Task 2: `apps/web/src/components/RecipeFixedCosts.astro`
- Task 3: `apps/web/src/components/RecipeActionsMenu.astro`

Safe to execute in any order or in parallel. No merge conflicts.

## Acceptance Criteria
- All 6 bugs fixed across 3 files
- No new dependencies, no schema changes, no new API endpoints
- All existing functionality preserved (financial calculations, fixed cost CRUD, tabs, edit mode)

## Validation Plan
```bash
pnpm astro check
pnpm dev --host  # Then manual QA per each bug's acceptance criteria
```

## Reviewer Focus
- Verify no introduced security issues (no ownerId/CSRF changes needed, but confirm no new attack surface)
- Verify FinancialSummary rows are correct for both advanced and legacy cost modes
- Verify tab persistence doesn't leak state between different recipes (pathname-scoped sessionStorage key)
- Verify slide animation is disabled only for edit-mode navigation, not cross-recipe navigation

## Risks And Non-Goals
- Non-goal: Converting the FinancialSummary widget to edit fixed costs inline (per-cost rows removed intentionally)
- Non-goal: Adding a dedicated animation for cross-recipe navigation (existing slide works for that)
- Risk: If `data-astro-reload` on the edit link causes a flash/UX regression, consider using `transition:name` approach instead
- Risk: SessionStorage approach for tab persistence could persist stale state if user opens recipe in a new tab — mitigated by pathname-scoped key

## Planner Verdict
ready
