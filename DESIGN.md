---
name: KitchCalc
description: Calculadora de costos de recetas para profesionales de la cocina
colors:
  blueprint-indigo: '#4f46e5'
  apron-white: '#f8fafc'
  recipe-card: '#ffffff'
  flour-dust: '#f1f5f9'
  cell-warmth: '#e2e8f0'
  espresso: '#0f172a'
  warm-slate: '#334155'
  cool-ash: '#64748b'
  vapor: '#94a3b8'
  pan-edge: '#e2e8f0'
  pan-edge-light: '#f1f5f9'
  chili-red: '#be123c'
  chili-bg: '#fff1f2'
  chili-border: '#fecdd3'
  chili-solid: '#e11d48'
  herb-green: '#047857'
  herb-bg: '#ecfdf5'
  herb-border: '#a7f3d0'
  herb-solid: '#10b981'
  turmeric-amber: '#b45309'
  turmeric-bg: '#fffbeb'
  turmeric-border: '#fde68a'
  turmeric-solid: '#f59e0b'
  ring-indigo: '#4f46e5'
typography:
  display:
    fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.875rem'
    fontWeight: 800
    lineHeight: 1.2
    letterSpacing: 'normal'
  headline:
    fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.5rem'
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 'normal'
  title:
    fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.125rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: 'normal'
  body:
    fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: 'normal'
  label:
    fontFamily: 'Outfit, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.6875rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: '0.16em'
    textTransform: 'uppercase'
  mono:
    fontFamily: "'JetBrains Mono', ui-monospace, 'SF Mono', 'Cascadia Code', 'Consolas', monospace"
    fontSize: 'inherit'
    fontWeight: 500
    lineHeight: 1.5
    letterSpacing: 'normal'
    fontFeature: "'tnum'"
rounded:
  lg: '8px'
  xl: '12px'
  2xl: '16px'
  3xl: '24px'
  full: '9999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '12px'
  lg: '16px'
  xl: '20px'
  2xl: '24px'
  3xl: '32px'
components:
  button-primary:
    backgroundColor: '{colors.blueprint-indigo}'
    textColor: '#ffffff'
    rounded: '{rounded.xl}'
    padding: '12px 24px'
    typography: '{typography.body}'
  button-primary-hover:
    backgroundColor: '#4338ca'
    textColor: '#ffffff'
    rounded: '{rounded.xl}'
    padding: '12px 24px'
  button-secondary:
    textColor: '{colors.cool-ash}'
    rounded: '{rounded.xl}'
    padding: '12px 20px'
  button-secondary-hover:
    backgroundColor: '{colors.apron-white}'
    textColor: '{colors.cool-ash}'
    rounded: '{rounded.xl}'
    padding: '12px 20px'
  button-danger:
    backgroundColor: '{colors.chili-solid}'
    textColor: '#ffffff'
    rounded: '{rounded.xl}'
    padding: '12px 20px'
  card-default:
    backgroundColor: '{colors.recipe-card}'
    rounded: '{rounded.2xl}'
  input-field:
    backgroundColor: '{colors.apron-white}'
    rounded: '{rounded.xl}'
    padding: '12px 16px'
  input-field-focus:
    backgroundColor: '{colors.recipe-card}'
    rounded: '{rounded.xl}'
    padding: '12px 16px'
---

# Design System: KitchCalc

> **Nota.** Este documento describe el sistema de diseño (tokens, tipografía, elevación, motion y las APIs visuales de los componentes). La **implementación de referencia** vive en `apps/web/app/components/ui/**` y `apps/web/app/features/**` (Vue 3 + Nuxt 4).

## 1. Overview

**Creative North Star: "La Cocina Ordenada"**

A professional kitchen at mise-en-place: every ingredient weighed, every tool in reach, every surface clean. The design system serves cooks who need numbers fast. It trades decoration for clarity, but never at the cost of warmth. The interface feels like a well-organized prep station — where the stainless steel counter (the data) is framed by wooden cutting boards (the containers) under warm task lighting (the accent).

This is a product UI for food entrepreneurs running real businesses. It rejects SaaS-cream genericism (no floating white cards on pale gradients, no purple CTAs, no hero-metric templates). It rejects enterprise coldness (no dense Jira tables, no monospace everywhere, no ERP jargon). It rejects playful food-app infantilism (no cartoon vegetables, no rainbow palettes, no rounded-everything).

**Key Characteristics:**

- Numbers own the page — costs and quantities in tabular mono, framed by restrained sans
- Flat tonal layering — depth comes from background shifts, not shadow stacks
- Tactile, responsive components — buttons press down (scale on :active), cards lift on hover
- Accent as signal, not decoration — indigo appears only on primary actions and current selection
- Dark mode through token remapping, not CSS overrides
- Spanish-first copy with kitchen-familiar vocabulary

## 2. Colors

The palette is restrained: a single accent family (user-selectable from 7 options, indigo by default) plus a slate-tinted neutral scale and a tight feedback vocabulary. The neutral axis carries a barely-perceptible blue undertone (hue ~258) so it never reads as sterile gray.

### Primary

- **Blueprint Indigo** (#4f46e5): The default accent. Used for primary action buttons, current selection indicators, focus rings, and progress bars. Covers ≤10% of any given screen. The accent family is user-switchable (indigo, violet, blue, emerald, rose, amber, coral) but the role is constant.

### Neutral

- **Apron White** (#f8fafc): Page background. The canvas behind all content. Light mode only; maps to oklch(0.176 0.008 258) in dark mode.
- **Recipe Card** (#ffffff): Card and container surfaces. Sits one step above Apron White. Maps to oklch(0.208 0.008 258) in dark mode.
- **Flour Dust** (#f1f5f9): Muted or inset surfaces — disabled states, secondary regions, skeleton loaders. Same lightness as Recipe Card in dark mode.
- **Cell Warmth** (#e2e8f0): Hover state for muted elements — sidebar links, ghost buttons, table rows. Maps to oklch(0.31 0.008 258) in dark mode.
- **Espresso** (#0f172a): Primary text. The darkest neutral, used for headings and body copy where maximum contrast is needed.
- **Warm Slate** (#334155): Secondary text. Descriptions, supporting information, card metadata.
- **Cool Ash** (#64748b): Muted text. Button labels on secondary actions, form placeholders, less critical information.
- **Vapor** (#94a3b8): Subtle text. Disabled states, footer links, decorative separators.
- **Pan Edge** (#e2e8f0): Default border. Card boundaries, input strokes, table rules.
- **Pan Edge Light** (#f1f5f9): Lighter border. Internal dividers, subtle separations.

### Feedback

- **Chili Red** (#be123c): Danger text. Error messages, destructive action labels.
  - Chili BG (#fff1f2): Danger background. Alert banners, delete hover surfaces.
  - Chili Border (#fecdd3): Danger border. Destructive action outlines.
  - Chili Solid (#e11d48): Danger action button fill.
- **Herb Green** (#047857): Success text. Confirmation messages, included features.
  - Herb BG (#ecfdf5): Success background. Confirmation banners.
  - Herb Border (#a7f3d0): Success border.
  - Herb Solid (#10b981): Success action button fill.
- **Turmeric Amber** (#b45309): Warning text. Caution messages, partial states.
  - Turmeric BG (#fffbeb): Warning background.
  - Turmeric Border (#fde68a): Warning border.
  - Turmeric Solid (#f59e0b): Warning action button fill.

### Named Rules

**The One Voice Rule.** The accent color is used on primary actions, current selection, and focus indicators only. It never decorates. Its rarity on the page is what makes it signal.

**The Action Fill Rule.** Fills that carry text or are the primary action (primary buttons, active nav items, the landing CTA band) use `accent-solid` with `text-on-accent`, both emitted per family and theme by `getAccentCssVars`. Light starts at the family's 700. Dark keeps that same tone (the accent is the constant; the neutrals are what change) and only steps up to the 600 when the 700 does not clear 3:1 against the dark background (indigo, violet, blue). The label is white in both themes, and every pair is measured in `test/unit/accent-colors.spec.ts`. Shade classes (`bg-accent-700`, `text-accent-600`) stay for text, tints, borders, and indicators, and follow `darkShadeMap` with no overrides.

**The Token Bridge Rule.** Every color is a semantic token (`bg-card`, `text-foreground`) referencing a CSS variable (`--tw-card`, `--tw-fg`). Never hardcode a hex or oklch value in a component. This is how dark mode works without a single `.dark` override in component code.

**The Marketing Is Light Rule.** Las superficies públicas indexables (`/`, `/funciones`, `/pricing`, la privacidad y los términos) fuerzan el tema claro: `app.vue` ignora la preferencia guardada cuando la ruta pasa `isPublicMarketingPath()`, y su navbar no monta el toggle. La app privada y el login conservan el toggle y los dos temas. Las capturas de esas superficies se sirven en una sola variante (`*_light`).

## 3. Typography

**Display Font:** Outfit (with -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui fallback). Used only for page headings (h1–h3) and landing hero text via `--font-display`.
**Body/UI Font:** System font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, ui-sans-serif, sans-serif`). All UI text — buttons, labels, form fields, data tables, sidebar links — uses `--font-sans`. The switch from Outfit to system fonts for body/UI ensures native platform feel and avoids display-font fatigue.
**Mono Font:** JetBrains Mono (with ui-monospace, SF Mono, Cascadia Code, Consolas fallback). All currency values, ingredient quantities, costs, margins, percentages, and production totals.

### Hierarchy

- **Display** (`--font-display`, 800 weight, 1.875rem–2.25rem, line-height 1.2): Page-level headings. Used once per view, at the top of the content area. Never in cards or components.
- **Headline** (`--font-display`, 700 weight, 1.5rem, line-height 1.3): Section headings within a page. Recipe names in detail view.
- **Title** (`--font-display`, 700 weight, 1.125rem, line-height 1.4): Card titles, dialog headings, modal headers.
- **Body** (`--font-sans`, 400 weight, 0.875rem, line-height 1.6): Default text. Descriptions, form content, table cells, button labels (with weight 700 override for buttons).
- **Label** (`--font-sans`, 700 weight, 0.6875rem, line-height 1.4, letter-spacing 0.16em, uppercase): Form field labels, input group headings. The tracked-uppercase label is the system's single typographic signature — used deliberately on form labels only, not as section grammar.
- **Mono** (`--font-mono`, 500 weight, inherited size, line-height 1.5, `font-variant-numeric: tabular-nums`): All currency values, ingredient quantities, costs, margins, percentages, and production totals. Tabular numbers so columns align in data tables.

### Named Rules

**The Data Speaks Mono Rule.** Every dollar amount, every gram, every percentage — any computed or entered numeric value — renders in JetBrains Mono with tabular-nums enabled. The font shift signals "this is data, not prose."

**The One Label Rule.** The tracked-uppercase label style (`text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground`) appears on form field labels and input group headings. It does not appear above sections, card headings, or as decorative kickers.

## 4. Elevation

The system is flat by default. Depth is conveyed through tonal layering: page background (Apron White) → card surfaces (Recipe Card) → inset regions (Flour Dust). Shadows are reserved for interactions that genuinely elevate — hover states on cards, open dialogs, dropdown menus, and the sidebar overlay.

### Shadow Vocabulary

- **Ambient Low** (`shadow-sm`): Default card shadow in light mode. Subtle, used to lift Recipe Card surfaces off Apron White. Darkened in dark mode (0.4 opacity).
- **Ambient Mid** (`shadow-md`): Elevated card shadow. Recipe cards on hover, sign-in cards, recipe stats.
- **Ambient High** (`shadow-lg`): Dropdown menus, popovers.
- **Overlay** (`shadow-2xl`): Dialogs, modals, the mobile sidebar. Heavy shadow indicates a surface that demands attention.
- **Accent Tint** (`shadow-accent-tint`): A custom multi-layer shadow tinted with the accent color at 18% opacity. Used on landing page cards and the Pro pricing card to draw the eye without adding a border. Maps to 30% opacity in dark mode.

### Named Rules

**The Flat-By-Default Rule.** Surfaces are flat at rest. Shadows appear only as a response to state: hover, focus, or elevation into overlay territory (dialogs, drawers). No decorative drop-shadows.

**The Tonal Depth Rule.** In the absence of shadows, depth is tonal: `background` → `card` → `muted`. Each step is a distinct background color, perceptible in both light and dark modes.

## 5. Components

### Buttons

- **Shape:** `rounded-xl` (12px). Rounded enough to feel approachable, not so rounded as to feel toy-like.
- **Primary:** Blueprint Indigo fill (#4f46e5), white text, 12px vertical / 24px horizontal padding. `transition-colors 150ms`. Hover darkens to #4338ca. Disabled state: Flour Dust background, Vapor text.
- **Secondary:** Recipe Card background, Pan Edge border, Cool Ash text. Hover shifts background to Apron White.
- **Danger solid:** Chili Solid fill, white text. Hover darkens to Chili Red.
- **Danger outline:** Recipe Card background, Chili Border border, Chili Red text. Hover adds Chili BG background.
- **Ghost/icon:** Transparent background, Cool Ash text. Hover adds Cell Warmth background, shifts text to Espresso.
- **Global:** All buttons get `transform: scale(0.97)` on `:active` (160ms ease-out). Buttons are `min-h-11` (44px) for touch targets. `font-bold`, `text-sm`.

### Cards

- **Shape:** `rounded-2xl` (16px). Distinct from button radius to create hierarchy.
- **Background:** Recipe Card. Border: Pan Edge.
- **Shadow:** `shadow-sm` at rest. On hover (`.card-hover`): `translateY(-6px)`, border shifts to accent-tinted, shadow deepens. Transition: 250ms.
- **Internal padding:** 16px–24px depending on density needs. Recipe grid cards: `p-5`. Form cards: `p-6`.

### Inputs / Fields

- **Style:** `rounded-xl` (12px, matching buttons), Apron White background, Pan Edge border, 12px vertical / 16px horizontal padding. Body text size.
- **Focus:** Border shifts to accent-300, background shifts to Recipe Card, a 3px accent-tinted ring appears. 150ms transition.
- **Error:** Chili Border border, optional Chili BG background hint.
- **Disabled:** Flour Dust background, Vapor text.
- **Select:** Custom chevron via inline SVG background-image. No browser default arrow.

### Chips / Badges

- **Category badge:** Accent-50 background, accent-600 text, accent-200 border. `rounded-full`. 11px bold label.
- **Status pill:** Same shape, semantic color per state (success/danger/warning backgrounds).
- **Tier badge (Pro):** Accent-600 fill, white text. `rounded-full`. `text-xs font-bold`.

### Navigation

- **Desktop sidebar:** Recipe Card background, Pan Edge right border. `w-[320px]` max. Recipe links: `rounded-xl`, hover uses Cell Warmth background, accent-600 text on active.
- **Desktop top bar:** Transparent background, blending with page. Desktop nav tabs use `text-sm font-semibold` with accent-600 highlight on active.
- **Mobile bottom nav:** Fixed bar with Recipe Card background, top border shadow. Each tab: `rounded-xl`, icon + label, accent-600 fill when active, Cool Ash when inactive.

### Dialogs / Modals

- **Shape:** `rounded-3xl` (24px). The largest radius in the system, signaling a surface completely removed from the page.
- **Backdrop:** Slate-900 at 50% opacity. Blurred (backdrop-blur-sm).
- **Animation:** Scale from 0.95 + fade, 200ms ease-out. Backdrop fades simultaneously.
- **Internal:** Recipe Card background, Pan Edge border, shadow-2xl. 24px padding.

### Skeleton Loading

- Flour Dust background, `animate-pulse`, `rounded-xl`. Matches the shape of the content it replaces. No spinners.

## 6. Do's and Don'ts

### Do:

- **Do** use semantic color tokens (`bg-card`, `text-foreground`, `border-border`) everywhere. Never hardcode hex or oklch in markup.
- **Do** render all currency and quantity values in JetBrains Mono with `tabular-nums`.
- **Do** use `min-h-11` (44px) on all interactive touch targets.
- **Do** apply `transform: scale(0.97)` on button `:active` states (160ms ease-out).
- **Do** convey depth through background color shifts first, shadows only at elevated interaction points.
- **Do** use `rounded-xl` (12px) for buttons and inputs, `rounded-2xl` (16px) for cards, `rounded-3xl` (24px) for dialogs.
- **Do** animate with `cubic-bezier(0.23, 1, 0.32, 1)` (ease-out) for state transitions. Keep transitions at 150–250ms.
- **Do** use `--font-display` (Outfit) for headings h1–h3 and landing hero text. All UI text, buttons, labels, and body use the system font stack (`-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui`).

### Don't:

- **Don't** use SaaS-cream patterns: no white cards floating on pale gradients, no purple CTAs.
- **Don't** use enterprise-cold patterns: no dense Jira-style tables, no monospace everywhere, no ERP jargon in labels.
- **Don't** use playful-food-app patterns: no cartoon vegetables, no rounded-everything, no rainbow palettes, no confetti animations.
- **Don't** use `border-left` or `border-right` greater than 1px as a colored accent stripe on cards or list items.
- **Don't** use gradient text (`background-clip: text`).
- **Don't** use glassmorphism (blurred glass cards) as default card treatment.
- **Don't** reach for a modal before exhausting inline / progressive alternatives.
- **Don't** use identical card grids with icon + heading + text repeated endlessly.
- **Don't** write `.dark` CSS selector overrides. The token system handles dark mode automatically.
- **Don't** animate CSS layout properties (width, height, top, left). Use `transform` and `opacity` only.
- **Don't** use em dashes in copy.

## 7. Motion

All animations use CSS custom properties for easing and duration, defined in `:root` in `src/styles/global.css`.

### Easing tokens

| Token              | Value                             | Use                                                |
| ------------------ | --------------------------------- | -------------------------------------------------- |
| `--ease-out`       | `cubic-bezier(0.23, 1, 0.32, 1)`  | Default state transitions (buttons, inputs, cards) |
| `--ease-in-out`    | `cubic-bezier(0.77, 0, 0.175, 1)` | Modal/dialog enter/exit                            |
| `--ease-out-quint` | `cubic-bezier(0.22, 1, 0.36, 1)`  | Slower, smoother exits                             |
| `--ease-out-expo`  | `cubic-bezier(0.16, 1, 0.3, 1)`   | Sidebar slide, overlay transitions                 |

### Duration tokens

| Token               | Value   | Use                                |
| ------------------- | ------- | ---------------------------------- |
| `--duration-fast`   | `150ms` | Input focus, hover color shifts    |
| `--duration-normal` | `200ms` | Dialog open/close, card lift       |
| `--duration-slow`   | `300ms` | Sidebar collapse, page transitions |

### Keyframe animations

| Name            | Location     | Purpose                                                                       |
| --------------- | ------------ | ----------------------------------------------------------------------------- |
| `cardFadeIn`    | `global.css` | Staggered card grid entry (35ms delay/stagger)                                |
| `page-enter`    | `global.css` | View-transition: page enter (fade + translateY)                               |
| `page-exit`     | `global.css` | View-transition: page exit                                                    |
| `cookingStepIn` | `global.css` | Cooking mode step transition                                                  |
| `timerPulse`    | `global.css` | Expired kitchen timer pulse                                                   |
| `sp`            | `global.css` | Loading spinner rotation (guarded by `prefers-reduced-motion: no-preference`) |

### Animation rules

- All keyframe animations respect `prefers-reduced-motion: reduce` — disabled entirely via `animation: none !important`.
- Never animate layout properties (width, height, top, left, margin, padding). Use `transform` and `opacity` only.
- No bounce or elastic easing curves. Exponential deceleration only.
- No orchestrated page-load sequences. Product loads into a task; users don't want to watch it load.

## 8. UI Component Library

All reusable UI primitives live in `apps/web/app/components/ui/{atoms,molecules,organisms}/` and are **auto-registered without prefix** by Nuxt (`nuxt.config.ts` → `components`).

### Import convention

```vue
<!-- El kit (~/components/ui) no necesita import: <Button>, <Card>, <Dialog>… -->
<!-- Los componentes de una feature SÍ: -->
<script setup lang="ts">
import BillingSection from '~/features/billing/BillingSection.vue';
</script>
```

### Button

**File:** `apps/web/app/components/ui/atoms/Button.vue`

```vue
<Button variant="primary" icon="plus">Nueva Receta</Button>
<Button variant="secondary">Cancelar</Button>
<Button variant="danger" icon="trash-2">Eliminar</Button>
<Button variant="ghost" icon="settings" />
<Button variant="primary" href="/recipes">Ir a recetas</Button>
<Button variant="primary" loading>Guardando...</Button>
```

| Prop       | Type                                              | Default     | Description                                 |
| ---------- | ------------------------------------------------- | ----------- | ------------------------------------------- |
| `variant`  | `"primary" \| "secondary" \| "danger" \| "ghost"` | `"primary"` | Visual style                                |
| `size`     | `"sm" \| "md" \| "lg"`                            | `"md"`      | Size preset (sm: 40px, md: 44px, lg: 48px)  |
| `href`     | `string`                                          | —           | Renders `<a>` instead of `<button>`         |
| `icon`     | `string`                                          | —           | Lucide icon name (without `lucide:` prefix) |
| `type`     | `"button" \| "submit"`                            | `"button"`  | HTML button type                            |
| `disabled` | `boolean`                                         | `false`     | Disabled state                              |
| `loading`  | `boolean`                                         | `false`     | Shows spinner, disables button              |
| `class`    | `string`                                          | —           | Additional Tailwind classes                 |

### Card

**File:** `apps/web/app/components/ui/molecules/Card.vue`

```vue
<Card padding="md" hover>
  <!-- content -->
</Card>
<Card padding="lg" accent>
  <!-- highlighted card -->
</Card>
```

| Prop      | Type                   | Default | Description                     |
| --------- | ---------------------- | ------- | ------------------------------- |
| `padding` | `"sm" \| "md" \| "lg"` | `"md"`  | sm: p-4, md: p-5, lg: p-6       |
| `hover`   | `boolean`              | `false` | Adds hover lift + border accent |
| `accent`  | `boolean`              | `false` | Uses accent-100 border tint     |
| `class`   | `string`               | —       | Additional Tailwind classes     |

### Input

**File:** `apps/web/app/components/ui/atoms/Input.vue`

```vue
<Input label="Nombre" name="name" required />
<Input label="Precio" name="price" type="number" monospace error="Debe ser mayor a 0" />
<Input name="search" type="search" placeholder="Buscar..." />
```

| Prop          | Type                                                      | Default  | Description                             |
| ------------- | --------------------------------------------------------- | -------- | --------------------------------------- |
| `label`       | `string`                                                  | —        | Visible label text                      |
| `name`        | `string`                                                  | —        | Input name (required)                   |
| `id`          | `string`                                                  | `name`   | Input id (defaults to name)             |
| `type`        | `"text" \| "number" \| "email" \| "password" \| "search"` | `"text"` | HTML input type                         |
| `placeholder` | `string`                                                  | —        | Placeholder text                        |
| `required`    | `boolean`                                                 | `false`  | Adds required attribute + `*` indicator |
| `error`       | `string`                                                  | —        | Error message below input               |
| `monospace`   | `boolean`                                                 | `false`  | Uses JetBrains Mono font                |
| `class`       | `string`                                                  | —        | Additional classes                      |

### Badge

**File:** `apps/web/app/components/ui/atoms/Badge.vue`

```vue
<Badge variant="category" color="accent">Postres</Badge>
<Badge variant="status" color="success">Activo</Badge>
<Badge variant="tier" color="accent">Pro</Badge>
<Badge variant="outline" color="neutral">Borrador</Badge>
```

| Prop      | Type                                                          | Default      | Description        |
| --------- | ------------------------------------------------------------- | ------------ | ------------------ |
| `variant` | `"category" \| "tier" \| "outline" \| "status"`               | `"category"` | Badge shape/style  |
| `color`   | `"accent" \| "success" \| "danger" \| "warning" \| "neutral"` | `"accent"`   | Semantic color     |
| `size`    | `"sm" \| "md"`                                                | `"sm"`       | sm: 10px, md: 11px |
| `class`   | `string`                                                      | —            | Additional classes |

### Dialog

**File:** `apps/web/app/components/ui/organisms/Dialog.vue`

```vue
<Dialog id="my-dialog" title="Confirmar" description="Esta accion no se puede deshacer.">
  <div class="flex justify-end gap-3">
    <Button variant="secondary">Cancelar</Button>
    <Button variant="danger">Eliminar</Button>
  </div>
</Dialog>
```

| Prop          | Type     | Default | Description                      |
| ------------- | -------- | ------- | -------------------------------- |
| `id`          | `string` | —       | Dialog id (required)             |
| `title`       | `string` | —       | Dialog heading                   |
| `description` | `string` | —       | Descriptive text below title     |
| `class`       | `string` | —       | Additional classes on `<dialog>` |

Dialog uses native `<dialog>` with `data-animated` for enter/exit transitions. Add `bindDialogBackdrop(dialogElement)` for click-outside-to-close.

### FinancialSummary

**File:** `apps/web/app/components/ui/molecules/FinancialSummary.vue`

A single-card layout for financial metrics — replaces the old 4-card icon-circle metric template. Like a restaurant POS receipt: a labeled header (title + scope chip) and label + mono value rows, no decorative chrome.

Every row declares its `group`; the card draws the section label (`.section-label`) when the group changes: `Costo de la mezcla` / `Precio de venta` in the recipe, `Costos` / `Resultado` in the planner. The section states its arithmetic with the row's `op` (`Insumos + Costos Fijos = Costo Total`), the row that closes it carries `emphasis: "total"` (one type step larger) and, when the plan has more than one batch, it translates itself to an average per batch.

The section's lever carries `emphasis: "control"`: it renders in the section header, next to the label, as the editable field of the section (the margin). The rows with `emphasis: "answer"` render together inside the tinted accent band, each with the line that explains it: the base (what it costs to produce), the price (with which margin) and the profit (what is left) — the same resource as the system's metric pills and category badges. Cost rows stay in neutral ink: a red number reads as loss, and the accent is reserved for actions, selection, and focus (The One Voice Rule).

```vue
<FinancialSummary
  title="Resumen financiero"
  scope="1 mezcla"
  rows={[
    {
      label: "Insumos",
      value: "$120.50",
      subtitle: "Costo base de materiales",
      group: "Costo de la mezcla",
    },
    {
      label: "Gastos Operativos",
      value: "25%",
      subtitle: "Servicios, labor, etc.",
      secondaryValue: "$66.80",
      group: "Costo de la mezcla",
      op: "+",
    },
    {
      label: "Costo Total",
      value: "$187.30",
      subtitle: "Insumos + Operativos",
      secondaryValue: "≈ $93.65 por mezcla",
      group: "Costo de la mezcla",
      emphasis: "total",
      op: "=",
    },
    {
      label: "Margen Deseado",
      value: "35%",
      subtitle: "Objetivo de ganancia",
      group: "Precio de venta",
      emphasis: "control",
    },
    {
      label: "Costo Total",
      value: "$187.30",
      subtitle: "Lo que cuesta producir",
      group: "Precio de venta",
      emphasis: "answer",
    },
    {
      label: "Precio Sugerido",
      value: "$288.15",
      subtitle: "Con 35% de margen",
      group: "Precio de venta",
      emphasis: "answer",
    },
    {
      label: "Ganancia",
      value: "$100.85",
      subtitle: "Después de costos",
      group: "Precio de venta",
      emphasis: "answer",
    },
  ]}
  isEditMode
  editFormId="recipe-edit-form"
  editFields={[
    {
      rowIndex: 1,
      name: "fixedCostsPercentage",
      currentValue: "25",
      suffix: "%",
    },
    { rowIndex: 3, name: "desiredMargin", currentValue: "35", suffix: "%" },
  ]}
/>
```

| Prop         | Type             | Default | Description                                                                                                                                                                        |
| ------------ | ---------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rows`       | `FinancialRow[]` | —       | `{ label, value, subtitle?, secondaryValue?, group?, emphasis?, op? }` — `op` declara la aritmética, `total` cierra el tramo, `control` va en su encabezado y `answer` en la banda |
| `title`      | `string`         | —       | Encabezado de la card (icono + texto); sin él no hay encabezado                                                                                                                    |
| `scope`      | `string`         | —       | Alcance de las cifras («1 mezcla»), como chip a la derecha del encabezado                                                                                                          |
| `isEditMode` | `boolean`        | `false` | Enable inline edit inputs on specified rows                                                                                                                                        |
| `editFormId` | `string`         | —       | Form id for edit inputs to attach to                                                                                                                                               |
| `editFields` | `EditField[]`    | `[]`    | `{ rowIndex, name, currentValue, suffix? }` — which rows to make editable                                                                                                          |
| `class`      | `string`         | —       | Additional classes                                                                                                                                                                 |

### SectionHeading

**File:** `apps/web/app/components/ui/atoms/SectionHeading.vue`

```vue
<SectionHeading
  icon="factory"
  title="Planificador de Produccion"
  subtitle="Selecciona recetas y calcula costos"
/>
<SectionHeading title="Configuracion" level="h1" />
```

| Prop       | Type                   | Default | Description                    |
| ---------- | ---------------------- | ------- | ------------------------------ |
| `icon`     | `string`               | —       | Lucide icon name               |
| `title`    | `string`               | —       | Heading text                   |
| `subtitle` | `string`               | —       | Descriptive text below heading |
| `level`    | `"h1" \| "h2" \| "h3"` | `"h2"`  | Heading level                  |
| `class`    | `string`               | —       | Additional classes             |

## 9. CSS Utility Classes

Reusable Tailwind component classes in `apps/web/app/assets/css/global.css` `@layer components`:

| Class            | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `.label-tracked` | Form field label: tracked uppercase style           |
| `.section-label` | Section subheading above card groups                |
| `.divider`       | Horizontal rule using `border-border-light`         |
| `.skeleton`      | Skeleton loading placeholder                        |
| `.focus-ring`    | Accessible focus-visible ring replacement           |
| `.card-hover`    | Hover lift effect on cards (respects pointer media) |

## 10. File Structure

```
apps/web/app/components/ui/
  ├── atoms/       # Button, Input, Badge, Icon, Skeleton, SectionHeading, UnitCostDisplay
  ├── molecules/   # Card, FeedbackAlert, EmptyState, PasswordInput, AppBreadcrumbs, UpgradePrompt
  └── organisms/   # Dialog, AppHeader, AppSidebar, AppBottomNav, NavProgressBar, AppLoadingOverlay
apps/web/app/features/   # componentes de feature (no auto-registrados; import explícito)
```

### App-level components

```
apps/web/app/components/ui/molecules/  # FeedbackAlert, EmptyState, PasswordInput, UpgradePrompt
apps/web/app/features/billing/         # BillingSection (plan, uso, features)
```

### BillingSection

**File:** `apps/web/app/features/billing/BillingSection.vue` (feature `billing`, import explícito).

Muestra el plan actual (trial, cancelación programada, cambio programado), el uso, las funciones incluidas, el portal de Stripe y el cambio de plan con confirmación. La suscripción entra como prop desde la página (`useSettingsOverview`); las mutaciones (`useCheckout`, `useBillingPortal`) viven dentro y nunca recargan la página.

## Semantic color tokens

The following tokens are defined in `apps/web/app/assets/css/tokens.css` (importado desde `global.css`) via `@theme`:

### Danger

- `--color-danger` / `--color-danger-bg` / `--color-danger-border`
- `--color-danger-solid` / `--color-danger-hover`

### Overlay

- `--color-backdrop`: rgba(15, 23, 42, 0.5) light, rgba(0, 0, 0, 0.6) dark

Use `backdrop:bg-backdrop/50` on dialog backdrops instead of hardcoded `backdrop:bg-slate-900/50`.

Los componentes consumen el sistema de tokens semánticos de `global.css`/`tokens.css` y se adaptan a dark mode sin overrides `.dark` en CSS.

### Hardcoded color bans

The following hardcoded values have been eliminated from all app pages:

- `backdrop:bg-slate-900/50` — replaced with `backdrop:bg-backdrop/50`
- `dark:md:border-gray-950` — removed from the recipe detail template (token system handles dark borders automatically)
