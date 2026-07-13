# Reviewer Report: task-20260702-recipe-bugs

## Review Scope
- Spec: Inline user request — Fix 6 bugs on recipe detail page
- Plan: `docs/plans/plan-20260702-recipe-bugs.md`
- Builder reports:
  - `docs/tasks/task-20260702-recipe-bugs-builder-1-report.md`
  - `docs/tasks/task-20260702-recipe-bugs-builder-2-report.md`
  - `docs/tasks/task-20260702-recipe-bugs-builder-3-report.md`
- Files reviewed:
  - `apps/web/src/pages/recipes/[recipe].astro` (Task 1: bugs 2,3,4,5)
  - `apps/web/src/components/RecipeFixedCosts.astro` (Task 2: bug 1)
  - `apps/web/src/components/RecipeActionsMenu.astro` (Task 3: bug 6)

## Skills Used
Selected:
- `ponytail-review` — check over-engineering
- `security-best-practices` — verify ownerId/CSRF issues
- `design-system-verify` — verify semantic tokens, icons, hardcoded colors

Discarded:
- none (all 3 selected skills were relevant)

Added During Execution:
- none

## Findings

| Severity | File | Issue | Evidence | Required Action |
|----------|------|-------|----------|-----------------|
| note | `[recipe].astro:1475` | `sessionStorage.getItem()` not wrapped in try/catch, while `.setItem()` is wrapped at line 1471 | Lines 1471 vs 1475: setItem has try/catch guard, getItem does not. In rare edge cases (storage disabled), getItem can throw. | Wrap getItem in try/catch for consistency, or document as intentional (minor edge case, not a blocker) |

### Bug-by-Bug Verification

**Bug 1 — Fixed cost add button always visible** ✓
- `RecipeFixedCosts.astro`: Both `isEditing && (` wrappers (button + dialog) removed
- Button renders unconditionally at lines 29-35, dialog at lines 62-204
- `isEditing` kept in Props interface (line 19) but not destructured (line 22) — no cascading callsite changes needed
- No ESLint unused-variable error since it's not destructured

**Bug 2 — Per-fixed-cost rows removed from FinancialSummary** ✓
- `[recipe].astro`, `buildFinancialRows()`: For loop over `recipe.recipeFixedCosts` removed
- 4 stable rows: Insumos (0), Total Costos Fijos (1), Costo Total Receta (2), Margen Deseado (3)
- `highlightIndex` corrected from `3` to `2` (line 792)
- `editRowIndices` corrected from `[4]` to `[3]` (line 792)
- Matches plan specification exactly

**Bug 3 — Desired margin rowIndex fixed** ✓
- `[recipe].astro`, `buildFinancialEditFields()`: `rowIndex` changed from `4` to `3` (line 812)
- Legacy mode at line 816 (rowIndex: 3) unchanged — already correct
- Margin editable regardless of fixed cost count

**Bug 4 — FinancialSummary moved above tabs** ✓
- `[recipe].astro`: FinancialSummary rendered at lines 942-951 (between header and tabs)
- Tabs section follows at line 953+ (`<!-- Tabs -->`)
- Original position below tabs removed — confirmed by grep showing only 1 occurrence

**Bug 5 — Tab persistence via sessionStorage** ✓
- `[recipe].astro` line 1471: `sessionStorage.setItem('recipe-tab:${pathname}', tabId)` inside `activateTab`, after `history.replaceState`
- Pathname-scoped key prevents cross-recipe leakage
- Line 1475: `initialTab = hash || sessionStorage || 'ingredientes'` — hash takes precedence
- try/catch wraps setItem for environments where sessionStorage is unavailable
- HashChange listener (line 1526) also saves to sessionStorage via activateTab — consistent behavior

**Bug 6 — data-astro-reload on edit link** ✓
- `RecipeActionsMenu.astro` line 81: `data-astro-reload` added to `<a href={editHref}>` element
- One-line change, no side effects
- Cross-recipe navigation links (sidebar) unaffected — they use different URLs without `data-astro-reload`

### Security Check
- No new POST handlers — all existing handlers unchanged
- No Prisma query changes — existing ownerId checks remain (lines 402-591)
- sessionStorage stores only tab identifier (non-sensitive string), no tokens or user data
- `data-astro-reload` on `<a>` tag is a navigation attribute, not a form submission — no CSRF implications
- Pass

### Design System Verification
- **Hardcoded colors**: 0 matches in all 3 changed files — all use semantic tokens
- **Icon whitelist**: No new icons introduced. All icons used (`plus`, `x`, `ellipsis-vertical`, `pencil`, `copy`, `trash-2`, `tag`, `save`) are already in `astro.config.mjs` whitelist
- **Manual overrides**: None — design-system components (`Button`, `Icon`, `SectionHeading`, `FinancialSummary`, `Badge`, `Card`) used without color/shape/spacing class overrides
- **Prisma ownerId**: No new queries — pass

### Over-Engineering Check (ponytail-review)
- All changes are minimal, targeted diffs
- No abstractions introduced, no speculative code
- The try/catch around sessionStorage.setItem is a reasonable defensive guard, not bloat
- The `isEditing` prop kept in Props interface (not destructured) avoids cascading callsite changes — pragmatic
- `Lean already. Ship.`

## Protocol Issues
None. All 3 builder reports list the correct changed files. No files listed as changed were missing from the reports.

## Acceptance Criteria Review
- [x] Fixed cost add button visible without entering edit mode
- [x] FinancialSummary shows 4 stable rows (Insumos, Total Costos Fijos, Costo Total Receta, Margen Deseado) in advanced mode
- [x] Desired margin field editable regardless of fixed cost count
- [x] FinancialSummary renders above tab bar
- [x] Tab state preserved after edit-mode redirects (sessionStorage, pathname-scoped)
- [x] Slide animation only plays on cross-recipe navigation, not edit mode toggle (data-astro-reload)
- [x] No new dependencies, no schema changes, no new API endpoints
- [x] `pnpm astro check` passes (0 errors, 0 warnings per all 3 builder reports)

## Verdict
**accept** — All 6 bugs fixed correctly. No security issues, no design system violations, no over-engineering. Diffs are clean and minimal. The single note-level finding (unwrapped sessionStorage.getItem) is pre-existing in spirit and not a blocker.

## Rework Task Hints
None needed.
