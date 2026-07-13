# Explore Report: analysis-20260702-recipe-page-bugs-explore

## Task Question
Map the recipe page structure and understand the FinancialSummary widget, fixed costs section, tab behavior, edit animation, and desired margin field for bug fixing.

## Context Received
- State: none specific
- Spec/plan: specs/006-password-reset-flow/plan.md (not relevant to this exploration)
- User request summary: Explore recipe page structure for bug fixing — tabs, FinancialSummary, fixed costs, edit animations, margin field

## Skills Used
Selected:
- `graphify` — architecture/file relationship discovery for recipe page structure
- `ponytail` — baseline style (already loaded)

Discarded:
- `ui-ux-pro-max` — not needed, this is structural exploration not UI design
- `diagnose` — no specific bug to diagnose yet

Added During Execution:
- none

## Memory Context Used
- none

## Graphify Status
available (graph.json exists at graphify-out/graph.json)

## Graphify Queries
| Query | Purpose | Result Summary |
|-------|---------|----------------|
| recipe-related nodes | Find recipe page in knowledge graph | Found nodes for `[recipe].astro` (1337 lines), `RecipeHeader.astro`, `RecipeActionsMenu.astro`, `RecipeIngredientList.astro` in extraction plan |
| FinancialSummary nodes | Find FinancialSummary component references | Found FinancialSummary reference in DESIGN.md, component extraction analysis. Component discovered at `packages/ui/src/FinancialSummary.astro` |

## Fallback Searches
| Search | Purpose | Result Summary |
|--------|---------|----------------|
| `glob **/components/**/*Financial*` | Find FinancialSummary component | `ProductionFinancialSummary.astro` only found |
| `glob **/components/**/*Summary*` | Find all Summary components | Only `ProductionFinancialSummary.astro` |
| `glob **/packages/ui/src/*.astro` | List all UI package components | `FinancialSummary.astro` found |
| `grep FinancialSummary *.astro` | Find FinancialSummary usage | Used in `[recipe].astro` L25/L761/L1347, `produccion.astro`, `ProductionFinancialSummary.astro` |
| `glob **/*FixedCost*` | Find fixed cost components | `RecipeFixedCosts.astro`, `PresentationFixedCosts.astro`, `FixedCostCard.astro` |
| `grep "animation\|@keyframes\|transition.*edit" *.astro` | Find edit animation code | No edit-specific animations found in recipe page |

## Files Read
| File | Reason | Fact Learned |
|------|--------|--------------|
| `apps/web/src/pages/recipes/[recipe].astro` | Main recipe page | 3-tab inline system (ingredientes, costos-fijos, presentaciones). FinancialSummary always visible below tabs. Edit mode = full page reload with `?edit=true` |
| `packages/ui/src/FinancialSummary.astro` | Financial summary widget | Props: rows (FinancialRow[]), highlightRow, isEditMode, editFormId, editFields. Renders 2-column grid. Edit mode renders inline `<input type="number">` per editable field |
| `apps/web/src/components/RecipeFixedCosts.astro` | Recipe fixed costs section | "Agregar Costo Fijo" button only shown when `isEditing`. Contains create dialog with form fields (name, type, base, value, hours) |
| `apps/web/src/components/FixedCostCard.astro` | Individual fixed cost card | WebComponent `<fixed-cost-card>` with display/edit toggle mode. Client-side form submission via fetch. Delete with confirm dialog |
| `apps/web/src/components/PresentationFixedCosts.astro` | Presentation fixed costs | Similar to RecipeFixedCosts but per-presentation. No PER_HOUR base option for presentations |
| `apps/web/src/components/RecipeActionsMenu.astro` | Action menu | Edit link href = `${Astro.url.pathname}?edit=true` — triggers full page reload |
| `apps/web/src/styles/global.css` L60-110 | Dialog animation CSS | `data-animated` dialogs have scale(0.95→1) + opacity transitions (200ms, ease-out) with `@starting-style` |
| `packages/ui/src/dialog.ts` | Dialog utility | `bindDialogBackdrop()` closes dialog on backdrop click |
| `apps/web/src/components/FeedbackAlert.astro` | Feedback banner | Renders success/error banner. Used for feedback messages passed via URL params |

## Key Findings

### 1. Recipe Page Structure (`apps/web/src/pages/recipes/[recipe].astro`)

**Layout**: Uses `Layout` component with sidebar. Outer `<div transition:animate="slide">` enables Astro view transitions.

**Page sections (top to bottom)**:
1. **Header** (lines 853-955): Title (editable if `isEditMode`), category, "Mezclas" multiplier, RecipeActionsMenu, timestamp
2. **Tabs** (lines 957-989): 3 tabs — Ingredientes, Costos Fijos, Presentaciones
3. **Tab Panels** (lines 991-1343):
   - **Ingredientes** (lines 993-1193): Ingredient list (edit/display mode) + RecipeInstructions
   - **Costos Fijos** (lines 1195-1202): `RecipeFixedCosts` component
   - **Presentaciones** (lines 1204-1343): Presentation cards + `PresentationFixedCosts` per presentation
4. **FinancialSummary** (lines 1345-1354): Always visible below tabs
5. **Hidden edit form** (lines 845-851): `<form id="recipe-edit-form">` with hidden fields for recipe update submission

### 2. FinancialSummary Widget

**File**: `packages/ui/src/FinancialSummary.astro` (lines 1-133)

**Interface**:
```typescript
interface FinancialRow {
  label: string;       // Display label (e.g. "Costo Insumos", "Margen Deseado")
  value: string;       // Display value (e.g. "$12.50", "25%")
  subtitle?: string;   // Subtitle below value
  secondaryValue?: string; // Shown in display mode only
  color?: string;      // Semantic: "danger" | "muted" | "accent" | "success"
}
interface Props {
  rows: FinancialRow[];
  highlightRow?: number;  // Index of row to highlight with accent color
  isEditMode?: boolean;
  editFormId?: string;
  editFields?: Array<{
    rowIndex: number;
    name: string;
    currentValue: string;
    suffix?: string;       // "%" suffix shown next to input
  }>;
}
```

**Layout**: 2-column responsive grid (`sm:grid-cols-2`), each row has colored left border.

**Edit mode**: When `isEditMode && editField` matches a row, renders `<input type="number">` instead of the display value. Each input gets id `fs-edit-${name}`.

**Row data** is built inline in `[recipe].astro`:

**Advance mode** (`hasFeature('advanced_costs')`, lines 763-808):
| Row | Label | Color | Editable? |
|-----|-------|-------|-----------|
| 0 | Costo Insumos | danger | No |
| 1..N | Per-fixed-cost rows | muted | No |
| N+1 | Total Costos Fijos | muted | No |
| N+2 | Costo Total Receta | accent | No |
| N+3 | Margen Deseado | success | **Yes** (row 4) |

**Legacy mode** (lines 811-820):
| Row | Label | Color | Editable? |
|-----|-------|-------|-----------|
| 0 | Costo Insumos | danger | No |
| 1 | Gastos Operativos (fixedCostsPercentage) | muted | **Yes** |
| 2 | Costo Total Real | accent | No |
| 3 | Margen Utilidad / Margen Deseado | success | **Yes** |

### 3. Fixed Costs Section

**Recipe-level** (`RecipeFixedCosts.astro`):
- "Agregar Costo Fijo" button **only visible when `isEditing`** (line 30: `isEditing &&`)
- Dialog opens via `data-open-recipe-fixed-dialog` attribute
- Form submits via `fetch` with JSON response expectation
- On success: appends new `FixedCostCard` to container, removes empty state
- Hours field only visible when base is PER_HOUR

**Presentation-level** (`PresentationFixedCosts.astro`):
- Same pattern, but no PER_HOUR base option (only PER_BATCH and PER_UNIT)

**FixedCostCard** (`FixedCostCard.astro`):
- Custom element `<fixed-cost-card>` with display/edit toggle
- Edit button toggles display ↔ edit content
- Inline form submission via `fetch`
- Delete flows through confirmation dialog

### 4. Tab Behavior

**HTML** (lines 957-989):
```html
<div role="tablist" id="recipe-tabs">
  <button role="tab" data-tab="ingredientes" aria-selected="true">Ingredientes</button>
  <button role="tab" data-tab="costos-fijos" aria-selected="false">Costos Fijos</button>
  <button role="tab" data-tab="presentaciones" aria-selected="false">Presentaciones</button>
</div>
<div id="panel-ingredientes" class="tab-panel" role="tabpanel">...</div>
<div id="panel-costos-fijos" class="tab-panel" hidden>...</div>
<div id="panel-presentaciones" class="tab-panel" hidden>...</div>
```

**JS** (`setupTabs`, lines 1459-1542):
- **activateTab(tabId)** (lines 1463-1485):
  - Updates `aria-selected` on all tabs
  - Toggles classes: `text-accent-600` / `border-accent-500` for selected, `text-muted-foreground` / `border-transparent` for unselected
  - Shows/hides panels via `p.hidden = !isSelected`
  - Updates `window.location.hash`
- **Initial tab** read from URL hash, defaults to `ingredientes`
- **Keyboard**: ArrowRight/ArrowDown = next tab, ArrowLeft/ArrowUp = previous tab (cyclic)
- **Hash change** listener syncs tabs to URL hash changes
- **No redirect to Ingredients** — tab switching is purely client-side DOM manipulation

**CRITICAL**: Tab switching does NOT cause any redirect or navigation. The panels are simply shown/hidden. The only page navigation is the `?edit=true` link which goes to the server.

### 5. Edit Animation

**Page-level**: `transition:animate="slide"` on outer `<div>` (line 839) — this is an Astro View Transition that applies on page navigation (e.g., entering/exiting edit mode).

**Dialog animation**: `data-animated` dialogs have CSS transitions in `global.css` (lines 67-105):
```css
dialog[data-animated] {
  opacity: 0;
  transform: scale(0.95);
  transition: opacity 200ms var(--ease-out), transform 200ms var(--ease-out), ...;
}
dialog[data-animated][open] { opacity: 1; transform: scale(1); }
@starting-style {
  dialog[data-animated][open] { opacity: 0; transform: scale(0.95); }
}
```

**No other edit-specific animations exist.** Entering edit mode is a full server navigation with View Transition.

### 6. Desired Margin Field

**Editability conditions**:
- **Edit mode required**: The `FinancialSummary` component only shows inputs when `isEditMode={isEditMode}` AND an `editField` is defined for that row index
- **buildFinancialEditFields()** (lines 825-835):
  - Advanced mode: `[{ rowIndex: 4, name: "desiredMargin", currentValue, suffix: "%" }]` — only the margin is editable
  - Legacy mode: `[{ rowIndex: 1, name: "fixedCostsPercentage" }, { rowIndex: 3, name: "desiredMargin" }]` — both operating costs and margin are editable
- **Visibility**: The input is rendered inline inside the FinancialSummary card's grid
- **Value clamping**: `desiredMarginValue = clampPercentageValue(desiredMargin, 99.99)` — clamped to 0-99.99%
- **Submission**: Part of the `update_recipe` action (line 377: `const desiredMargin = Number(formData.get('desiredMargin')) || 0`)

### 7. Edit Mode Flow

1. User clicks "Editar" in `RecipeActionsMenu` → navigates to `${pathname}?edit=true`
2. Server re-renders the page with `isEditMode = true` (line 610)
3. All ingredients are loaded for the ingredient picker
4. Header becomes editable (name input, category input)
5. Ingredients panel shows edit-mode layout with pickers
6. Fixed costs panels show "Agregar Costo Fijo" buttons
7. FinancialSummary renders inline inputs for editable fields
8. "Guardar" and "Cancelar" buttons appear in header
9. Submitting the hidden `recipe-edit-form` POSTs to the same URL with `action=update_recipe`
10. On success, server redirects back to the clean URL (no `?edit=true`)

### 8. POST Action Handlers (lines 196-592)

| Action | Method | Type | Notes |
|--------|--------|------|-------|
| `update_presentation` | POST | Form/JSON | Updates presentation name, units, sale price |
| `delete_presentation` | POST | Form/JSON | Deletes presentation, redirects with hash |
| `create_presentation` | POST | Form | Creates new presentation, redirects |
| `delete_recipe` | POST | Form | Deletes recipe, redirects to /recipes |
| `duplicate_recipe` | POST | Form | Duplicates recipe, redirects to copy |
| `update_recipe` | POST | Form | Destructive transaction: deletes all RecipeIngredients, recreates them |
| `create_recipe_fixed_cost` | POST | JSON only | Creates recipe fixed cost, returns JSON with card HTML |
| `create_presentation_fixed_cost` | POST | JSON only | Creates presentation fixed cost, returns JSON |
| `update_fixed_cost` | POST | JSON only | Updates existing fixed cost (recipe or presentation) |
| `delete_fixed_cost` | POST | JSON only | Deletes fixed cost, returns `{ deleted: true }` |

**Key rule**: `create_*fixed_cost`, `update_fixed_cost`, and `delete_fixed_cost` all require `Accept: application/json` header and return JSON responses. The `update_recipe` action is the only one that forces a full page redirect.

## Candidate Files
| File | Why It Matters | Suggested Owner |
|------|----------------|-----------------|
| `apps/web/src/pages/recipes/[recipe].astro` | Main recipe page — all tab logic, financial calculations, POST handlers, edit mode rendering | builder |
| `packages/ui/src/FinancialSummary.astro` | Financial summary display/edit widget | builder |
| `apps/web/src/components/RecipeFixedCosts.astro` | Recipe fixed costs section with create dialog | builder |
| `apps/web/src/components/FixedCostCard.astro` | Individual fixed cost card with edit/delete | builder |
| `apps/web/src/components/PresentationFixedCosts.astro` | Presentation-level fixed costs | builder |
| `apps/web/src/components/RecipeActionsMenu.astro` | Edit/duplicate/delete actions menu | reviewer |
| `apps/web/src/styles/global.css` (lines 67-105) | Dialog animation CSS | reviewer |

## Risks And Unknowns
- **Unknown**: Whether there's an actual bug where tab switching redirects to Ingredients tab — the tab JS (`setupTabs`) only does DOM show/hide and hash updates, no navigation. If a redirect happens, it could be from a form submission, not tab switching.
- **Astro View Transition side effects**: The `transition:animate="slide"` on the page wrapper may cause unexpected behavior when navigating between edit/view modes. After a view transition, the `astro:after-swap` event should re-initialize all scripts, but could miss some bindings.
- **Fixed costs editing requires edit mode**: Adding or editing fixed costs is only possible when `isEditMode=true`. If there's a UX requirement to edit costs without entering full edit mode, that's a design gap.
- **The `data-astro-reload` attribute on the hidden edit form** (line 846) may cause a full page reload on submit, bypassing the view transition.

## Orchestrator Decisions Supported
- **Repo scope**: Mixed — `apps/web/src/pages/recipes/[recipe].astro` (main), `packages/ui/src/FinancialSummary.astro` (UI package)
- **Candidate builder scope**: 
  - Bug 1 (tab redirect): Investigate if `activateTab` triggers any navigation — likely a hash change issue
  - Bug 2 (margin editing): Edit margin works when `isEditMode=true`, check if `advanced_costs` feature flag logic is correct
  - Bug 3 (animation): The only "edit animation" is the View Transition `slide` — check if dialogs animate correctly
  - Bug 4 (fixed cost constraints): "Agregar Costo Fijo" is only available in edit mode
- **Risk level**: medium — the recipe page is complex (1800+ lines) with intertwined client/server logic
- **Human approval gates**: Changes to POST handlers or the destructive `update_recipe` transaction
- **Suggested validation**: `pnpm dev`, navigate to `/recipes/[id]`, verify tab switching, edit mode toggle, margin editing, fixed cost CRUD

## Suggested Skills For Next Agents
Builder:
- `ponytail` — keep changes minimal and focused
- `security-best-practices` — validate ownerId scoping on all Prisma queries when modifying POST handlers

Reviewer:
- `design-system-verify` — verify no hardcoded colors, icons in whitelist
- `security-best-practices` — verify ownerId scoping on all new/changed queries

Validator:
- `ui-ux-pro-max` — verify responsive rendering of FinancialSummary grid and fixed cost cards

## Budget Used
- Graphify queries: 2/3
- Searches: 9/12
- Files read: 11/12

## Decision
complete
