# Explore Report: analysis-20260702-recipe-page-explore

## Task Question

Explore the recipe detail page at `apps/web/src/pages/recipes/[recipe].astro` to understand:
1. Overall page structure (sections, tabs, layout)
2. "Preparación" section rendering and visibility
3. "Presentación" section and fixed costs info display
4. Layout pattern (spacing, containers)
5. FinancialSummary positioning relative to other sections
6. Fixed costs UI patterns (add button, edit form, where forms appear)

## Context Received

- State: current working tree
- Spec/plan: none
- User request summary: full recipe page exploration for reported issue

## Skills Used

Selected:
- `graphify` — check existing knowledge graph (graph exists but this task required reading actual source files, not graph queries)
- `ponytail` — baseline style for keeping analysis concise

Discarded:
- `ui-ux-pro-max` / `design-system-verify` — not needed; this is structural exploration, not design implementation
- `security-best-practices` — no security concerns being investigated

Added During Execution:
- none

## Memory Context Used

- `AGENTS.md` invariants referenced from task description (ownerId scoping, form patterns)

## Parallel Explore Context

- Parallel group: none (standalone)
- Sibling explore tasks: none
- Assigned domain/question boundary: recipe detail page only

## Graphify Status

available (graph exists at `graphify-out/graph.json`) — but not useful for this template-structure exploration. Fallback to direct file reads.

## Graphify Queries

| Query | Purpose | Result Summary |
|-------|---------|----------------|
| none | — | — |

## Fallback Searches

| Search | Purpose | Result Summary |
|--------|---------|----------------|
| `grep FixedCost|fixed_cost|CostoFijo *.astro` | Find all fixed-cost related Astro components | 100+ matches across 5 files |
| `grep FixedCost|fixed_cost *.ts` | Find fixed-cost TS references | Prisma models, db helpers |
| `glob *FixedCost*` | Find fixed-cost component files | `FixedCostCard.astro`, `RecipeFixedCosts.astro`, `PresentationFixedCosts.astro` |
| `glob **/FinancialSummary.astro` | Find FinancialSummary | `packages/ui/src/FinancialSummary.astro` |

## Files Read

| File | Reason | Fact Learned |
|------|--------|--------------|
| `apps/web/src/pages/recipes/[recipe].astro` (full) | Main recipe detail page | Complete page layout, all sections and tabs, POST handlers, fixed cost CRUD |
| `apps/web/src/components/RecipeInstructions.astro` (full) | "Preparación" section | Renders instructions as step cards, supports HTML/markdown, includes cooking mode dialog |
| `apps/web/src/components/FinancialSummary.astro` (full) | Financial summary widget | Grid layout, edit mode inputs, highlight row |
| `apps/web/src/components/RecipeFixedCosts.astro` (full) | Recipe-level fixed costs | Dialog-based create, FixedCostCard list, AJAX submission |
| `apps/web/src/components/PresentationFixedCosts.astro` (full) | Presentation-level fixed costs | Similar to RecipeFixedCosts but simpler form (no PER_HOUR base), conditional on isEditing |
| `apps/web/src/components/FixedCostCard.astro` (full) | Individual fixed cost card | Custom element with display/edit toggle, inline edit form, delete confirmation dialog |
| `apps/web/src/components/PresentationCard.astro` (lines 1-100, 190-250) | Presentation card | Renders fixed costs breakdown internally (read-only) with line items and total |

## Key Findings

### 1. Overall Page Structure (line 823-1739)

```
<Layout>
  <div px-1 sm:px-2 lg:px-8 py-4>
    [FeedbackAlert (conditional)]
    [Hidden edit form (edit mode only)]

    <!-- Header Row 1: Title + Desktop multiplier + Menu -->
    <div flex items-start justify-between>

    <!-- Header Row 2: Badge (category) + Timestamp + Edit buttons -->
    <div flex>

    <!-- Header Row 1b: Multiplier counter (mobile only) -->
    <form flex sm:hidden>

    === FinancialSummary ===           ← wrapped in <div class="pt-6">
    <FinancialSummary>

    === Tabs ===
    <div role="tablist" id="recipe-tabs">
      [Ingredientes] [Costos Fijos] [Presentaciones]
    </div>

    === Tab Panels ===
    - panel-ingredientes (default visible)
    - panel-costos-fijos (hidden)
    - panel-presentaciones (hidden)
  </div>
</Layout>
```

### 2. "Preparación" (Instructions) Section

- **NOT a separate tab or section with its own heading "Preparación"** in the page layout.
- Rendered as the `RecipeInstructions` component **inside the "Ingredientes" tab panel** (lines 1178-1188), placed **below** the `Card` containing the ingredients list.
- Visibility condition: `!isEditMode && instructions && <RecipeInstructions>` — only visible in **view mode** when the recipe has instructions. Hidden in edit mode.
- The `RecipeInstructions.astro` component (separate file) has its own header with "Preparación" title and the cooking mode button.
- Structure inside RecipeInstructions: a `div.bg-card.border-border` container with `mx-1 mt-6` (small margins left/right + top margin), header with title + duration badge + cooking mode button, then step cards.
- **The "preparación" section IS visible by default** because the "ingredientes" tab is the initial active tab.

### 3. "Presentación" Section and Fixed Costs

The "Presentaciones" tab panel (line 1201-1338) contains:
- **SectionHeading** "Presentaciones de Venta" with subtitle "Define cuantas piezas salen por mezcla"
- **"Nueva Presentación" button** (opens a dialog)
- **Grid** `grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4` of presentation cards:

```astro
{presentations?.map(pres => (
  <div class="flex flex-col gap-3">
    <PresentationCard ... />
    <PresentationFixedCosts ... />    ← Fixed costs for this presentation
  </div>
))}
```

#### Fixed Costs in PresentationCard (read-only)
The `PresentationCard.astro` component (lines 206-238) internally renders a **fixed costs breakdown** within the card itself:
- Section title: "Costos Fijos de Presentación"
- Each fixed cost as a line item with name + amount (computed server-side)
- Total line "Total C.F."
- Only shown when `presentationFixedCosts.length > 0`
- **Also** the computed values (effectiveBatchCost, unitCost, unitPriceRecommended) **include** presentation fixed costs in the calculations (lines 48-52)

### 4. Layout Pattern

| Element | Classes | Notes |
|---------|---------|-------|
| Page wrapper | `px-1 sm:px-2 lg:px-8 py-4` | Responsive horizontal padding |
| Cards | `rounded-2xl border shadow-sm` | Consistent card style |
| Card headers | `border-b border-border-light p-5 sm:p-6 lg:p-8` | |
| Tab panels | `class="tab-panel"` + `hidden` attribute | JS-driven show/hide |
| Section spacing | `pt-6`, `mt-6`, `mb-6`, `space-y-4` | |
| Financial wrapper | `<div class="pt-6">` | Sits between header and tabs |
| Fixed cost card | `bg-card border-border flex flex-col rounded-2xl border p-5 shadow-sm` | Same as other cards |
| Presentation grid | `grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4` | |
| Presentation + FC wrapper | `<div class="flex flex-col gap-3">` | Stacked vertical |

### 5. FinancialSummary Positioning

- **Positioned right after the mobile multiplier counter** (which is after header row 2), but **before the tabs**.
- Wrapped in `<div class="pt-6">` for top spacing.
- Always visible regardless of active tab.
- Receives `rows`, `highlightRow`, `isEditMode`, and optional `editFields` for inline editing.
- Uses a `Card` (from `@recetario/ui`) with `lg` padding.
- Internal layout: `grid grid-cols-1 gap-4 sm:grid-cols-2` — 2 columns on desktop, 1 on mobile.
- Each row has a colored left border (`border-l-{color}`), label, value (or edit input), subtitle, optional secondary value.
- Financial data is computed server-side in the page's frontmatter (lines 762-820).

### 6. Fixed Costs UI Patterns

#### 6a. Recipe-Level Fixed Costs ("Costos Fijos" tab)

**Component**: `RecipeFixedCosts.astro`
- **"Agregar Costo Fijo"** button (always shown) opens a `<dialog>` modal.
- Create dialog has form fields: Nombre, Tipo (Monto/Percentage), Base (Por Mezcla/Por Unidad/Por Hora), Valor, Horas (conditional on Base=Por Hora).
- Dialog uses AJAX (`fetch POST` with `Accept: application/json`).
- On success: appends new `FixedCostCard` to the container, removes empty state.
- **Empty state**: "No hay costos fijos definidos para esta receta."

#### 6b. Presentation-Level Fixed Costs

**Component**: `PresentationFixedCosts.astro`
- **"Agregar"** button (smaller, only shown when `isEditing` is true).
- Same dialog pattern but **simpler form**: no PER_HOUR base option, just PER_BATCH and PER_UNIT.
- Uses AJAX, appends to `[data-presentation-fc-list]` container.
- **Empty state**: "Sin costos fijos"

#### 6c. FixedCostCard (display/edit card)

**Component**: `FixedCostCard.astro` — Custom element `<fixed-cost-card>`
- **Display mode** (default): Shows name, type badge, base badge, value, hours (if PER_HOUR), edit button (pencil), delete button (trash, hidden by default).
- **Edit mode** (toggle via pencil button): Reveals inline form with Name/Tipo/Base/Valor/Horas inputs. Shows edit-delete, cancel, save buttons.
- **Delete**: Opens a `<dialog>` confirmation modal ("¿Eliminar este costo fijo? Esta acción no se puede deshacer.") with Cancel/Confirm buttons.
- All CRUD operations use **AJAX** (fetch POST to same page URL with `Accept: application/json`).
- **Form appears inline** within the card itself — not a separate modal. The card has two content divs (`display-content` and `edit-content`) toggled with `hidden` class.
- **`isRecipeLevel` prop** controls: whether PER_HOUR option is available in base select, and hours field visibility logic.

### 7. Fixed Cost API Endpoints (all inline in the page)

All handled in the same `[recipe].astro` page's frontmatter POST handler (lines 393-591):

| Action | Method | Auth | Returns | Cache |
|--------|--------|------|---------|-------|
| `create_recipe_fixed_cost` | POST+AJAX | session+ownerId | JSON `{ fixedCost, fixedCostCardHtml }` | None (direct Prisma) |
| `create_presentation_fixed_cost` | POST+AJAX | session+ownerId+recipe ownership | JSON `{ fixedCost, fixedCostCardHtml }` | None (direct Prisma) |
| `update_fixed_cost` | POST+AJAX | session+ownerId | JSON `{ fixedCost }` | None (direct Prisma) |
| `delete_fixed_cost` | POST+AJAX | session+ownerId | JSON `{ deleted: true }` | None (direct Prisma) |

- **No separate API routes** — no files under `pages/api/` for fixed costs.
- **Owner verification**: Every operation checks `ownerId` by walking the relationship chain (RecipeFixedCost → Recipe → ownerId, or PresentationFixedCost → Presentation → Recipe → ownerId).
- **No cache behavior** beyond any implicit framework caching. The 60s subscription cache mentioned in AGENTS.md is unrelated (it's for subscription state).

## Candidate Files

| File | Why It Matters | Suggested Owner |
|------|----------------|-----------------|
| `apps/web/src/pages/recipes/[recipe].astro` | Main recipe page — all layout, POST handlers, financial calculations | Build/Review |
| `apps/web/src/components/RecipeInstructions.astro` | Instructions rendering, cooking mode | Build/Review |
| `apps/web/src/components/RecipeFixedCosts.astro` | Recipe-level fixed costs (tab panel) | Build/Review |
| `apps/web/src/components/PresentationFixedCosts.astro` | Presentation-level fixed costs | Build/Review |
| `apps/web/src/components/FixedCostCard.astro` | Reusable fixed cost card with inline edit | Build/Review |
| `apps/web/src/components/PresentationCard.astro` | Presentation card with fixed costs breakdown | Build/Review |
| `packages/ui/src/FinancialSummary.astro` | Financial summary widget | Review only |

## Risks And Unknowns

- **No cache for fixed cost operations**: Every create/update/delete hits Prisma directly. No risk for correctness but may matter under rapid edits.
- **renderFixedCostCardSnippet (line 125-193)**: Server-side HTML string generation in the page frontmatter duplicates the `FixedCostCard.astro` template logic. This is a maintenance hazard — any change to FixedCostCard.astro must be manually replicated in the snippet function.
- **AJAX pattern**: All fixed cost operations expect `application/json` response. If the session expires mid-edit, the redirect response (HTML) will fail JSON parse and show a generic error.
- **Presentation fixed costs rely on `isEditing`**: The "Agregar" button for presentation fixed costs only shows when the recipe is in edit mode. This means presentation fixed costs cannot be created in view mode — a constraint vs. recipe fixed costs which are always available.
- **FinancialSummary rows are duplicated logic**: The server-side `buildFinancialRows()` and `buildFinancialEditFields()` in the page frontmatter (lines 762-820) compute what to show based on subscription features. Template-level coupling.

## Orchestrator Decisions Supported

- **Repo scope**: `apps/web` (src/pages, src/components) + `packages/ui`
- **Merge guidance**: standalone report, no siblings to merge
- **Candidate builder scope**: separate tasks for fixed cost UI changes vs. layout/tab changes vs. FinancialSummary changes
- **Risk level**: low (exploration only)
- **Human approval gates**: none
- **Suggested validation**: `pnpm dev` and visually inspect:
  1. Tab switching (ingredientes → costos fijos → presentaciones)
  2. Fixed cost create (dialog opens, form submits via AJAX, card appears)
  3. Fixed cost inline edit (pencil toggles edit mode, save updates display)
  4. Fixed cost delete (dialog confirmation, card removed)
  5. Responsive: mobile (375px) and desktop (1280px)

## Suggested Skills For Next Agents

Builder:
- `ponytail` — baseline lazy approach for any implementation
- `design-system-verify` — if modifying UI components (badges, cards, forms)

Reviewer:
- `design-system-verify` — verify no hardcoded colors, correct semantic tokens, ownerId checks
- `security-best-practices` — verify ownerId scoping in Prisma queries

Validator:
- none specific (visual QA checklist above covers it)

## Budget Used

- Graphify queries: 0/3
- Searches: 4/12
- Files read: 7/12
