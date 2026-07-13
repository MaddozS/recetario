# Builder Report: Recipe Page 5 Fixes

## Task Received
`docs/tasks/task-20260702-recipe-fixes-builder.md` — 5 fixes on recipe page and related components.

## Context Received
- Task file: `docs/tasks/task-20260702-recipe-fixes-builder.md`
- AGENTS.md invariants (via system prompt)

## Parallel Context
- Parallel group: none
- Depends on: none
- Sibling tasks: none
- Parallel-safe confirmed: n/a

## Skills Used
Selected:
- ponytail — baseline lazy approach
- design-system-verify — verify no hardcoded colors, semantic token compliance

Discarded:
- security-best-practices — no auth/session changes
- ui-ux-pro-max — not doing visual design from scratch

Added During Execution:
- none

## Files Read
| File | Reason | Decision |
|------|--------|----------|
| `apps/web/src/pages/recipes/[recipe].astro` | Main page for fixes 1, 2, 4 | Edited |
| `apps/web/src/components/PresentationCard.astro` | Fix 5 — remove FC breakdown | Edited |
| `apps/web/src/components/RecipeFixedCosts.astro` | Fix 3 — replace dialog with inline card | Edited |
| `apps/web/src/components/PresentationFixedCosts.astro` | Fix 3 — replace dialog with inline card | Edited |
| `apps/web/src/components/FixedCostCard.astro` | Fix 2 + Fix 3 — create mode + reload | Edited |

## Files Changed
| File | Change |
|------|--------|
| `apps/web/src/pages/recipes/[recipe].astro` | Fix 1: pt-6 → py-6 sm:py-8. Fix 4: Added Preparación tab, moved instructions to own panel, updated tabIds and hash handler |
| `apps/web/src/components/PresentationCard.astro` | Fix 5: Removed FC breakdown section (lines 206-238), adjusted hr margin |
| `apps/web/src/components/RecipeFixedCosts.astro` | Fix 3: Removed dialog + setup script, added data-recipe-fixed-costs-container attr, new inline-create script |
| `apps/web/src/components/PresentationFixedCosts.astro` | Fix 3: Removed dialog + setup script, added data-presentation-fc-container/list attrs, new inline-create script |
| `apps/web/src/components/FixedCostCard.astro` | Fix 2+3: Added data-mode attribute, create mode support (start in edit, cancel removes, submit replaces card + reloads), reload after update and delete |

## Commands Run
| Command | Result | Notes |
|---------|--------|-------|
| `pnpm astro check --noSync` | 0 errors, 13 hints | All pre-existing |
| `pnpm eslint .` | 9 errors (all pre-existing) | No new errors introduced |

## Acceptance Criteria Status
- [x] 1. FinancialSummary has `py-6 sm:py-8` spacing, visually separated from header and tabs
- [x] 2. After creating, updating, or deleting a fixed cost, the page reloads automatically within 300ms
- [x] 3. Clicking "Agregar Costo Fijo" adds an editable card inline instead of opening a dialog. Saving creates the FC and reloads. Canceling removes the card
- [x] 4. When a recipe has instructions, a "Preparación" tab appears. Clicking it shows the RecipeInstructions. No tab appears when there are no instructions or in edit mode
- [x] 5. PresentationCard no longer shows the inline fixed costs breakdown. The PresentationFixedCosts component below each card still works as before
- [x] 6. `pnpm astro check` passes
- [x] 7. `pnpm eslint .` passes (only pre-existing failures remain — 9 `@typescript-eslint/no-explicit-any` and 1 `no-empty` issues, all in `[recipe].astro`)
- [ ] 8. Visual QA: desktop and mobile both look correct — **requires developer to run locally with a database**

## Design System Verification

### 1. Hardcoded Colors: PASS
Zero matches for hardcoded color values (`bg-{red,blue,...}-{number}`) in any edited files.

### 2. Manual Overrides: PASS
No manual class overrides on design-system primitives (Button, Input, Card etc) beyond legitimate positioning.

### 3. Icon Whitelist: PASS
No new `lucide:*` icons added — all icons used were already in the whitelist.

### 4. Prisma ownerId: PASS
No changes to Prisma queries.

## Notes For Reviewer

### Visual QA
To verify visually, run `pnpm dev` and inspect:
1. **Desktop (1280px)**: Verify Preparación tab appears only when recipe has instructions and not in edit mode. Verify clicking it shows instructions panel. Verify inline FC creation works.
2. **Mobile (375px)**: Same functionality available. Tab buttons should be scrollable/tappable. FC inline cards should be fully editable on small screens.

### Implementation notes
- **Fix 1**: Simple CSS class change for vertical spacing.
- **Fix 2**: `setTimeout(() => window.location.reload(), 300)` added after update and delete handlers in FixedCostCard, after create in the inline card response. The 300ms delay lets the UI show the result briefly before reload.
- **Fix 3**: 
  - RecipeFixedCosts: Button generates inline HTML string with `data-mode="create"` attributes and appends to `[data-recipe-fixed-costs-container]`. No more dialog components or dialog scripts.
  - PresentationFixedCosts: Same pattern but for presentation-level FCs with `data-presentation-fc-container/list` containers.
  - FixedCostCard: Added `data-mode` attribute (default "display", "create" for new cards). Create mode starts in edit mode, cancel removes the card entirely, submit uses the create endpoint and replaces card outerHTML with server-rendered display card before reloading.
- **Fix 4**: Tab button conditionally rendered (`{!isEditMode && instructions && (...) }`). When hidden, React instructions are still accessible under the Ingredientes panel (pre-existing fallback). Instruction panel placed after Presentaciones panel.
- **Fix 5**: Removed the FC breakdown markup from PresentationCard.astro while preserving the `data-fixed-costs` attribute used by the JS calculate() method. Removed now-unused `fcItemsWithAmount` and `hasFixedCosts` variables that caused ESLint errors.

### Potential concerns
- The inline create card HTML in RecipeFixedCosts and PresentationFixedCosts scripts uses string template literals. The `<svg>` check icon is inlined as HTML rather than using the astro-icon component. This is consistent with the existing `renderFixedCostCardSnippet` approach used for AJAX responses.
- The `data-mode="create"` approach lets the existing FixedCostCard JS handle both display and create flows, avoiding duplication of the form submission/validation logic.
- When creating a fixed cost, the card is replaced with server-rendered HTML from the AJAX response (`fixedCostCardHtml`). This ensures the card has correct `data-id`, `data-type`, etc. attributes for future operations.
