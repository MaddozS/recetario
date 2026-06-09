# Explore Report: Recipe Detail Page Header Layout

Date: 2026-06-07
Agent: explorer
Task: Ad-hoc exploration of recipe detail page header layout

## Target Area Explored

- **Primary files**:
  - `src/pages/recipes/[recipe].astro` — Main recipe detail page (1266 lines)
  - `src/components/ui/Button.astro` — Button component (4 variants)
  - `src/components/ui/Badge.astro` — Badge component (4 variants × 5 colors)
  - `src/components/Header.astro` — Top header bar with breadcrumbs
  - `src/layouts/Layout.astro` — App shell with sidebar + mobile nav
  - `src/components/FeedbackAlert.astro` — Feedback banner

- **Adjacent files**:
  - `src/components/ui/FinancialSummary.astro` — Financial metrics card
  - `src/components/ui/index.ts` — Barrel export
  - `src/components/RecipeInstructions.astro` — Instructions section
  - `src/components/PresentationCard.astro` — Presentation cards
  - `src/components/RecipeStats.astro` — Recipe stat pills
  - `DESIGN.md` — Full design system specification

## Pattern Found: Header Layout Structure

The recipe detail page header spans lines 463–643 of `[recipe].astro`. It follows a stacked vertical layout wrapped in the app shell. Here is the exact HTML/Tailwind structure:

```
Layout (app shell + sidebar)
  └─ div [transition:animate="slide", class="w-full"]
       └─ div [class="px-1 sm:px-2 lg:px-8 py-4"]
            ├─ FeedbackAlert (conditional)
            ├─ Hidden forms (edit, delete, duplicate)
            ├─ Dialogs (delete confirm, duplicate confirm)
            │
            ├─ [LINE 549] Actions Bar
            │  <div class="flex items-center justify-between gap-3 mb-2 px-1">
            │    └─ <div class="flex items-center gap-2 shrink-0 overflow-x-auto">
            │         ├─ Editar: <Button variant="primary" icon="pencil" size="sm" class="px-3 lg:px-5 lg:text-sm shadow-sm">
            │         ├─ Duplicar: <Button variant="ghost" size="sm" icon="copy" class="px-0 lg:px-4">
            │         └─ Eliminar: <Button variant="ghost" size="sm" icon="trash-2" class="text-danger hover:bg-danger-bg px-0 lg:px-4">
            │
            ├─ [LINE 571] Category Badge + Last Updated
            │  <div class="flex items-center gap-3 text-sm font-medium text-muted-foreground px-1">
            │    ├─ <Badge variant="category" color="accent" class="gap-1.5 px-3 py-1 tracking-wider uppercase font-black">
            │    │    <Icon name="lucide:tag" size={12} /> {category || "Sin categoría"}
            │    └─ <span class="text-xs text-subtle-foreground font-semibold">
            │         Actualizado {lastUpdatedText}
            │
            ├─ [LINE 583] Title + Mezclas Counter
            │  <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 px-1">
            │    ├─ [Left] <div class="flex-1">
            │    │    ├─ [View mode] <h1 class="text-3xl sm:text-4xl leading-tight font-black text-foreground">
            │    │    │              {recipe.name}
            │    │    └─ [Edit mode] <input type="text" class="w-full text-3xl sm:text-4xl leading-tight font-black bg-background border border-border rounded-xl p-2 text-foreground focus:ring-2 focus:ring-accent-500/20">
            │    │
            │    └─ [Right] <div class="flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
            │         └─ Mezclas counter form:
            │            <form class:list={[
            │              "flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 shadow-sm sm:w-auto sm:justify-start transition-colors",
            │              showAdjustedQuantity ? "border-accent-200 bg-accent-50/30" : "border-border bg-card"
            │            ]}>
            │              ├─ <span class="text-[10px] font-black uppercase tracking-widest text-subtle-foreground px-2">Mezclas</span>
            │              └─ <div class="flex items-center gap-1 bg-background rounded-full p-1 border border-border-light">
            │                   ├─ <a href={multiplierDownHref}>-</a>
            │                   ├─ <input type="number" name="multiplier" value={multiplier} step="0.0001" min="0.0001" class="w-10 bg-transparent text-center font-mono font-semibold text-foreground ... tabular-nums text-sm">
            │                   └─ <a href={multiplierUpHref}>+</a>
            │
            └─ [LINE 629] FinancialSummary
               <FinancialSummary rows={[...]} highlightRow={2} isEditMode={isEditMode} ... />
```

### Page-Level Layout (Layout.astro)

```astro
<Layout currentRecipe={id} showSideBar={true} currentPage="recipes"
  breadcrumbs={[{ label: "Recetas", href: "/recipes" }, { label: name }]}>
```

The Layout provides:
- `<Header />` — Top bar with logo, KitchCalc branding, breadcrumbs, sign-out
- Left sidebar `<RecipesSidebar />` (desktop) / overlay (mobile)
- Mobile bottom nav (Recipes, Ingredients, Production?, Settings)
- `<main class="p-4 md:p-8 pb-24 md:pb-8 flex-1 overflow-y-auto w-full bg-background">`
- `<div class="max-w-7xl mx-auto">` wrapping the slot

### Data Fetching (frontmatter)

```typescript
const recipe = await getRecipeById(recipeIdParam, ownerId);
const { ingredients, name, category, instructions, id, desiredMargin, fixedCostsPercentage, presentations, updatedAt } = recipe;
```

Auth guard: redirects to `/sign-in` if no session.

### Responsive States of Header

| Element | Mobile (< md) | Desktop (≥ md) |
|---------|---------------|----------------|
| Title | `text-3xl` | `sm:text-4xl` |
| Mezclas counter | `w-full flex-col` below title | `w-auto sm:flex-row` aligned right |
| Actions (Editar/Duplicar/Eliminar) | `px-0` compact (icons only for duplicate/delete, "Editar" shows text) | `lg:px-5 lg:px-4` with full text |
| Layout padding | `px-1 sm:px-2` | `lg:px-8` |
| Category + timestamp | Full width row | Same row |

Note: Mobile shows icon-only for Duplicar and Eliminar (labels use `hidden lg:inline`). The Mezclas counter switches from `flex-col` below title (mobile) to inline right-aligned (desktop).

### Components Involved in Header

| Component | Usage in Header | Props |
|-----------|----------------|-------|
| `Button` (from `@/components/ui`) | Editar, Duplicar, Eliminar, Cancelar | `variant`, `size`, `icon`, `class`, `ariaLabel` |
| `Badge` (from `@/components/ui`) | Category badge | `variant="category"`, `color="accent"`, plus custom classes |
| `Icon` (from `astro-icon/components`) | tag, pencil, copy, trash-2, plus, x | `name` (lucide:*), `size` |
| `FeedbackAlert` | Success/error banner | `type`, `message` |
| `FinancialSummary` (from `@/components/ui`) | Financial metrics below header | `rows`, `highlightRow`, `isEditMode`, `editFormId`, `editFields` |
| `Layout` | App shell | `currentRecipe`, `showSideBar`, `currentPage`, `breadcrumbs` |
| `Header` (in Layout) | Top bar with breadcrumbs | `currentPage`, `showMenuButton`, `breadcrumbs` |

### Tailwind/CSS Classes Used in the Header

**Container:**
- `px-1 sm:px-2 lg:px-8 py-4` — Responsive horizontal padding
- `w-full` — Full width

**Actions bar:**
- `flex items-center justify-between gap-3 mb-2 px-1` — Horizontal flex row
- `flex items-center gap-2 shrink-0 overflow-x-auto` — Button group container

**Category badge row:**
- `flex items-center gap-3 text-sm font-medium text-muted-foreground px-1`
- Badge: `gap-1.5 px-3 py-1 tracking-wider uppercase font-black`

**Title + Mezclas row:**
- `flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 px-1` — Stacks on mobile, row on desktop
- Title: `text-3xl sm:text-4xl leading-tight font-black text-foreground`
- Mezclas container: `flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 shadow-sm sm:w-auto sm:justify-start transition-colors`
- Mezclas label: `text-[10px] font-black uppercase tracking-widest text-subtle-foreground px-2`
- Multiplier controls: `flex items-center gap-1 bg-background rounded-full p-1 border border-border-light`
- ± buttons: `w-6 h-6 flex items-center justify-center rounded-full hover:bg-hover-muted text-muted-foreground font-bold transition-colors active:scale-95`
- Input: `w-10 bg-transparent text-center font-mono font-semibold text-foreground ... tabular-nums text-sm`
- Accent state: `border-accent-200 bg-accent-50/30` (when `showAdjustedQuantity` is true)

### Semantic Tokens Used

All colors use Tailwind semantic tokens:
- `text-foreground`, `text-muted-foreground`, `text-secondary-foreground`, `text-subtle-foreground`
- `bg-background`, `bg-card`, `bg-muted`, `bg-hover-muted`
- `border-border`, `border-border-light`, `border-accent-200`
- `bg-accent-50/30`, `bg-accent-50`
- `text-danger`, `bg-danger-bg`, `hover:bg-danger-bg`
- `accent-500` (focus rings), `accent-600` (active/highlight), `accent-700` (hover)
- `backdrop:bg-backdrop/50` (dialog backdrops)

## DESIGN.md Relevant Tokens

### Colors (Section 2)
- **Accent family**: Default #4f46e5 (Blueprint Indigo), user-switchable (indigo, violet, blue, emerald, rose, amber, coral)
- **Neutrals**: Recipe Card (#fff), Apron White (#f8fafc), Flour Dust (#f1f5f9), Espresso (#0f172a), Warm Slate (#334155), Cool Ash (#64748b)
- **Feedback**: Chili Red (#be123c) for danger, Herb Green (#047857) for success, Turmeric Amber (#b45309) for warning

### Typography (Section 3)
- **Display**: Outfit 800 weight, 1.875rem–2.25rem, line-height 1.2
- **Headline**: Outfit 700 weight, 1.5rem, line-height 1.3
- **Title**: Outfit 700 weight, 1.125rem, line-height 1.4
- **Body**: System font, 400 weight, 0.875rem
- **Label**: System font, 700 weight, 0.6875rem, 0.16em tracking, uppercase
- **Mono**: JetBrains Mono, 500 weight, tabular-nums — used for all numeric values

Key rule: "The Data Speaks Mono Rule" — every dollar amount, gram, percentage renders in JetBrains Mono + tabular-nums.

### Components (Section 5)
- **Buttons**: `rounded-xl` (12px), `min-h-11` (44px touch target), `font-bold text-sm`, `scale(0.97)` on `:active`
  - Primary: `bg-accent-600 text-white` → hover `bg-accent-700`
  - Secondary: `border border-border bg-card text-muted-foreground` → hover `bg-background`
  - Ghost: `text-muted-foreground` → hover `bg-muted text-secondary-foreground`
  - Danger: `bg-danger-solid text-white` → hover `bg-danger-hover`
- **Badges**: Category variant: `rounded-full`, accent-50 bg, accent-600 text, accent-200 border
- **Cards**: `rounded-2xl` (16px), Recipe Card bg, Pan Edge border, `shadow-sm`
- **Dialogs**: `rounded-3xl` (24px), `backdrop:bg-backdrop/50`, `shadow-2xl`

### Elevation (Section 4)
- Flat by default. Depth through tonal layering (`bg-background` → `bg-card` → `bg-muted`)
- `shadow-sm` for default cards, `shadow-2xl` for dialogs
- Hover: `translateY(-6px)`, 250ms transition

### Semantic Token Bans (Section 9)
- `backdrop:bg-slate-900/50` → replaced with `backdrop:bg-backdrop/50` (10 instances across app, noted as fixed)

## Tech Debt / Potential Refactors

1. **Mezclas counter ± controls use `<a>` tags with `data-astro-reload`** (lines 619, 621). These trigger full page reloads for simple multiplier adjustments. Could be replaced with client-side JS for instant updates.

2. **FinancialSummary component sits between header and content** — not within the header itself but visually below it. The header zones (actions → badge → title/mezclas → financial summary) form the full "header area."

3. **Category badge uses hardcoded inline classes** `gap-1.5 px-3 py-1 tracking-wider uppercase font-black` rather than reusing the Badge component's built-in size variants. Minor inconsistency.

4. **The comment `<!-- El footer de métricas se movió al header -->`** (line 830) suggests the FinancialSummary was moved to the header section from a previous footer position — historical artifact.

5. **Edit mode title has no aria-label or labeling relationship** with the form — the `<input>` for recipe name (line 588) is disconnected from its `<form>` context visually.

6. **Multipier input** (line 620) uses `step="0.0001" min="0.0001"` with `onchange="this.form.submit()"` — inline JS handler mixed with Astro component architecture.

## Commands Executed

- `glob src/pages/recipes/**` — Found recipe pages
- `glob src/components/**/*recipe*` — Found `RecipeGridCard`, `RecipeStats`, `RecipeInstructions`, `RecipesSidebar`, `ProductionRecipeBreakdown`, `ProductionRecipeSelector`, `RecipeMiniCard`
- `glob **/DESIGN.md` — Found `DESIGN.md`
- `read src/pages/recipes/[recipe].astro` — Main recipe detail page (full, 1266 lines)
- `read DESIGN.md` — Full design system (643 lines)
- `read src/components/ui/Button.astro` — Button component
- `read src/components/ui/Badge.astro` — Badge component
- `read src/components/ui/index.ts` — Barrel export
- `read src/components/FeedbackAlert.astro` — Feedback banner
- `read src/layouts/Layout.astro` — App shell layout
- `read src/components/Header.astro` — Top header bar
- `read src/components/RecipeInstructions.astro` — Instructions section
- `read src/components/RecipeStats.astro` — Recipe stat pills

## Files Read

- `src/pages/recipes/[recipe].astro`: 1266 lines — Full recipe detail page with all form handling, dialogs, ingredient table, instructions, and presentation cards
- `DESIGN.md`: 643 lines — Complete design system: colors, typography, components, elevation, motion
- `src/components/ui/Button.astro`: 96 lines — Button with 4 variants (primary/secondary/danger/ghost), 3 sizes, loading state
- `src/components/ui/Badge.astro`: 77 lines — Badge with 4 variants × 5 color mappings
- `src/components/ui/index.ts`: 11 lines — Barrel export of 8 UI components
- `src/components/FeedbackAlert.astro`: 46 lines — Success/error alert with optional recipes list
- `src/layouts/Layout.astro`: 329 lines — App shell with sidebar, mobile nav, theme handling
- `src/components/Header.astro`: 178 lines — Top bar with logo, breadcrumbs, sign-out
- `src/components/RecipeInstructions.astro`: 629 lines — Instructions rendering with cooking mode
- `src/components/RecipeStats.astro`: 66 lines — Recipe/ingredient/category count pills

## Recommendations

- The header layout is fully contained in `src/pages/recipes/[recipe].astro` and uses only `@/components/ui` primitives + `Icon` from astro-icon
- No custom CSS — everything is Tailwind utility classes with semantic tokens
- All icons used (`tag`, `pencil`, `copy`, `trash-2`, `plus`, `x`, `chevron-right`, `folder-open`, `menu`, `log-out`) are lucide icons — verify they're in the `astro.config.mjs` allowlist
- The mezlcas counter would benefit from client-side interactivity to avoid full page reloads on ± clicks
- Edit mode header reorganizes to show text inputs for name/category instead of the `h1` and `Badge`
