# Explore Report: Recipe Detail Page Header Layout

Date: 2026-06-06 14:00
Agent: explorer
Task File: Requested in conversation

## Target Area Explored
- **Primary files**: `src/pages/recipes/[recipe].astro`
- **Adjacent files**: `src/layouts/Layout.astro`, `src/components/Header.astro`, `src/components/ui/FinancialSummary.astro`, `src/components/ui/SectionHeading.astro`, `src/components/FeedbackAlert.astro`, `src/pages/recipes/index.astro`, `src/pages/ingredients.astro`, `src/pages/produccion.astro`

## Patterns Found

### Page pattern
- Astro SSR page with client islands (`<script>` tags, no island directives)
- Uses `Layout` component with `currentRecipe`, `showSideBar`, `currentPage`, `breadcrumbs` props
- Form POST to same page pattern with `action` hidden field
- Dialog elements for delete/duplicate confirmation, Create Presentation dialog

### Layout structure (line 465)
Outer wrapper: `class="px-1 sm:px-2 lg:px-8 py-4"` — responsive horizontal padding.

### Header section — 6 structural sections stacked vertically (lines 549-643)

The "header area" the user refers to comprises lines 549–626 (Sections 4–6 below). Everything is within the outer `px-1 sm:px-2 lg:px-8` wrapper.

---

## Exact Current Layout Structure

### Section 1: FeedbackAlert (lines 466-468)
- Conditionally rendered when `feedbackType && feedbackMessage`
- Full-width banner

### Section 2: Hidden Forms (lines 470-486)
- 3 hidden forms for recipe edit, delete, duplicate (`.hidden` class)

### Section 3: Dialog elements (lines 488-546)
- Delete confirmation dialog (always rendered)
- Duplicate confirmation dialog (conditionally rendered behind `hasFeature`)
- Both use `fixed inset-0` positioning with `backdrop:bg-backdrop/50`

### Section 4: Action Buttons — `<!-- Actions -->` (lines 549-568)
```html
<div class="flex items-center justify-between gap-3 mb-2 px-1">
  {!isEditMode && (
    <div class="flex items-center gap-2 shrink-0 overflow-x-auto">
      <!-- Editar: form with Button variant="primary" icon="pencil" size="sm" class="px-3 lg:px-5 lg:text-sm shadow-sm" -->
      <!-- Duplicar: Button variant="ghost" size="sm" icon="copy" class="px-0 lg:px-4" -->
        Label: <span class="hidden lg:inline">Duplicar</span>
      <!-- Eliminar: Button variant="ghost" size="sm" icon="trash-2" class="text-danger hover:bg-danger-bg px-0 lg:px-4" -->
        Label: <span class="hidden lg:inline">Eliminar</span>
    </div>
  )}
</div>
```
- **Mobile**: Editar (full label), Duplicar (icon only, no label), Eliminar (icon only, no label)
- **Desktop (lg+)**: All show labels
- Uses `overflow-x-auto` for horizontal scroll on small screens
- Actions are at the TOP of the header, BEFORE the title

### Section 5: Category Badge + Timestamp — `<!-- Tag and Last Updated -->` (lines 571-580)
```html
<div class="flex items-center gap-3 text-sm font-medium text-muted-foreground px-1">
  <Badge variant="category" color="accent" class="gap-1.5 px-3 py-1 tracking-wider uppercase font-black">
    <Icon name="lucide:tag" size={12} /> {category || "Sin categoría"}
  </Badge>
  {lastUpdatedText && (
    <span class="text-xs text-subtle-foreground font-semibold">
      Actualizado ...
    </span>
  )}
</div>
```
- Simple flex row: badge + timestamp
- No responsive breakpoint changes — always inline

### Section 6: Title + Mezclas Counter — `<!-- Title and Actions Row -->` (lines 583-626)
```html
<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 px-1">
  <div class="flex-1">
    <h1 class="text-3xl sm:text-4xl leading-tight font-black text-foreground">{name}</h1>
  </div>
  <div class="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
    {!isEditMode && (
      <form class="flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 shadow-sm sm:w-auto sm:justify-start transition-colors ...">
        <span class="text-[10px] font-black uppercase tracking-widest text-subtle-foreground px-2">Mezclas</span>
        <div class="flex items-center gap-1 bg-background rounded-full p-1 border border-border-light">
          <a href={...} class="w-6 h-6 ...">-</a>
          <input type="number" ... class="w-10 ..." aria-label="Multiplicador" />
          <a href={...} class="w-6 h-6 ...">+</a>
        </div>
      </form>
    )}
  </div>
</div>
```
- **Mobile (default)**: Stacked — `flex-col`. Title fills width (`flex-1`). Mezclas counter is full-width (`w-full`), stretched
- **Desktop (md+)**: Side by side — `md:flex-row md:items-center`. Title left, counter right
- Mezclas counter transitions from `w-full flex-col items-stretch` (mobile) to `sm:w-auto sm:flex-row` (narrow desktop breakpoint already)

### Section 7: Financial Summary (lines 629-643)
- `FinancialSummary` component — full width below the header

---

## Current Responsive Breakpoints Summary

| Condition | Mobile (< sm, 640px) | Tablet (sm-md, 640-768px) | Desktop (md+, 768px+) |
|-----------|---------------------|--------------------------|----------------------|
| Actions (Editar/Duplicar/Eliminar) | Editar with label + icon; Duplicar/Eliminar icon-only (`hidden lg:inline`) | Same as mobile | All three show labels (`lg:inline`) |
| Category badge + timestamp | Flex row, full width | Same | Same |
| Title + Mezclas | Stacked: title above, full-width counter below | Same | Side-by-side: title left, counter right |
| Outer padding | `px-1` | `sm:px-2` | `lg:px-8` |

---

## Spacing/Padding Issues Noticed

1. **Redundant horizontal padding**: Outer wrapper uses `px-1 sm:px-2 lg:px-8`. But every inner section also adds `px-1`. The `px-1` on the outer wrapper + `px-1` on sections = `px-2` actual padding on mobile, which compounds to `px-3` on tablet and `px-9` on desktop. This means the title, badge, and actions have inconsistent alignment with the `FinancialSummary` below (which has NO additional inner padding).

2. **Vertical rhythm inconsistency**: 
   - Actions row: `mb-2`
   - Tag row: no bottom margin
   - Title row: `pb-4`
   - No consistent spacing pattern between sections

3. **Semantic ordering problem**: The action buttons (Editar/Duplicar/Eliminar) appear BEFORE the recipe title and badge. This is unusual — typically the title is the primary H1 heading and should come first, with actions following. On mobile this is especially awkward because the small icon-only buttons are at the very top before any context.

4. **Visual density**: On mobile, 4 separate stacked rows of content (actions → badge+timestamp → title+mezclas → financial summary) with inconsistent gaps creates a cramped and fragmented appearance.

5. **Mezclas counter on mobile**: Full-width (`w-full items-stretch`) with label on one side and stepper on the other (`justify-between`), which forces the counter wide even when it doesn't need to be. This eats into the limited vertical space.

6. **Overflow-x-auto on actions**: The `overflow-x-auto` on the actions section suggests they were designed to potentially overflow, but with only 2-3 buttons it shouldn't be necessary and creates an unnecessary scroll container.

---

## Adjacent Patterns

### SectionHeading component (`src/components/ui/SectionHeading.astro`)
- Used for section titles: `flex items-center gap-2 text-lg font-bold` with optional icon
- Pattern: `SectionHeading` + action `Button` in a `flex items-start justify-between gap-3` wrapper (line 844)
- This pattern is used on the same page for "Presentaciones de Venta" section heading

### Recipes index page (`src/pages/recipes/index.astro`)
- Uses `RecipeStats` component then `info-cards` grid
- No direct header pattern — the page title comes from `Layout` breadcrumbs

### Ingredients page (`src/pages/ingredients.astro`, lines 315-358)
- Card header pattern: `flex flex-col gap-4 md:flex-row md:items-center md:justify-between` div inside a Card
- Title + count + search bar laid out side by side on desktop, stacked on mobile
- This pattern could be adapted for the recipe detail header

### Production page (`src/pages/produccion.astro`, line 127)
- Uses `SectionHeading` with `level="h1"` — clean, minimal heading approach

---

## Commands Executed
- `read` `src/pages/recipes/[recipe].astro` — main recipe detail page
- `read` `src/layouts/Layout.astro` — overall layout structure
- `read` `src/components/Header.astro` — global header with breadcrumbs
- `read` `src/pages/recipes/index.astro` — recipes listing page
- `read` `src/pages/ingredients.astro` — ingredients page
- `read` `src/pages/produccion.astro` — production page
- `read` `src/components/ui/FinancialSummary.astro` — financial summary component
- `read` `src/components/ui/SectionHeading.astro` — section heading component
- `read` `src/components/FeedbackAlert.astro` — feedback alert component
- `grep` for patterns like `SectionHeading`, `FinancialSummary`, `flex.*items-center.*justify-between`

## Files Read
- `src/pages/recipes/[recipe].astro` (1266 lines): Full recipe detail page with header, ingredient table, instructions, presentations section
- `src/layouts/Layout.astro` (329 lines): App shell with sidebar, header, mobile nav, theme management
- `src/components/Header.astro` (178 lines): Global header with breadcrumb navigation and sign-out button
- `src/components/ui/FinancialSummary.astro` (133 lines): 2-column financial metrics display
- `src/components/ui/SectionHeading.astro` (29 lines): Reusable section heading with optional icon
- `src/components/FeedbackAlert.astro` (46 lines): Success/error feedback banner
- `src/pages/ingredients.astro` (lines 260-370): Ingredients page card-header pattern
- `src/pages/recipes/index.astro` (lines 100-200): Recipes listing page structure
- `src/pages/produccion.astro` (lines 100-163): Production page with SectionHeading usage

## Recommendations for Orchestrator

### Suggested reorder
Consider reordering the header to place the **title first** (semantic H1), then metadata (badge + timestamp), then action buttons (Editar/Duplicar/Eliminar), then the Mezclas counter integrated nearby. This is more natural: "what is this → what type → what I can do with it → batch multiplier."

### Suggested layout approach (inspiration from ingredients page)
A single responsive container using `flex flex-col gap-4` on mobile, transitioning to a more structured grid or flex layout on desktop, rather than 3 separate top-level flex divs.

### Padding fix
Remove the `px-1` from each inner section and rely solely on the outer wrapper's `px-1 sm:px-2 lg:px-8` for consistent horizontal alignment with the FinancialSummary below.

### Mobile-specific concerns
- **Actions**: Consider placing Duplicar/Eliminar in a dropdown/kebab menu or keeping them icon-only (current approach is OK)
- **Mezclas counter**: On mobile, consider a compact inline format so it doesn't consume a full row

### Risks
- Any refactor must handle the `isEditMode` branch (edit mode hides the actions and Mezclas counter, shows input fields instead)
- The `px-1` inner padding appears in 3 separate containers — changing it requires updating all 3 consistently
- The actions section uses `overflow-x-auto` which may have intended scroll behavior on very small screens
