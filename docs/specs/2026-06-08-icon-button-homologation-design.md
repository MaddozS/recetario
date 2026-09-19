# Spec: Icon Button Homologation

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

Created: 2026-06-08
Orchestrator: orchestrator
Status: approved

## Problem / Need
Icon action buttons in `src/pages/ingredients.astro` (uses `Button` with manual color overrides) and `src/components/PresentationCard.astro` (uses raw `<button>` with hand-rolled classes) are visually inconsistent and bypass the design system.

## Context (from Phase 1 Analysis)
- `src/components/ui/Button.astro` is the design system primitive. Variants: `primary | secondary | danger | ghost`. Sizes: `sm | md | lg`. Exports: `src/components/ui/index.ts:4`.
- `src/pages/ingredients.astro:450-479` uses `Button` with overrides: `variant="ghost"`, `size="sm"`, `class="text-subtle-foreground hover:bg-accent-50 hover:text-accent-600 min-h-11 min-w-11 rounded-full"` for edit, and `text-danger hover:bg-danger-bg hover:text-danger min-h-11 min-w-11 rounded-full"` for delete. Color overrides leak outside the system.
- `src/components/PresentationCard.astro:60-87` uses raw `<button>` elements with hand-rolled classes. No design-system binding. Includes a pencil→X icon swap on edit toggle (lines 631-635, 673-676).
- Both use `lucide:pencil` and `lucide:trash-2` (already in `astro.config.mjs:73,84` whitelist).
- Touch target: 44x44 in ingredients, 44x44 in PresentationCard. Visual content: 16px icon.

## Success Criteria
- [ ] Single design-system primitive used for all icon action buttons (edit / delete).
- [ ] `ingredients.astro` and `PresentationCard.astro` render visually identical icon buttons.
- [ ] No manual color overrides (`text-X`, `hover:bg-X-bg`, `hover:text-X`) outside the Button component for icon action buttons.
- [ ] Touch target ≥ 40x40px.
- [ ] `pnpm astro check` and `pnpm eslint .` pass.

## User Stories
- As a user, I want edit / delete actions to look identical wherever they appear so the UI feels predictable.
- As a developer, I want one component to maintain for icon action buttons.
- As a designer, I want the design system to define destructive vs constructive action language.

## Approaches Considered

### Approach A: Extend `Button` with `iconOnly` prop (selected)
- Adds `iconOnly?: boolean` and two new variants `iconAccent` and `iconDanger`.
- Both call sites consume the same component.
- Pros: minimal new surface, single source of truth.
- Cons: Button API grows slightly.

### Approach B: New `IconButton` component (rejected)
Pros: cleaner separation. Cons: duplicates Button's loading / disabled / focus logic.

### Approach C: Override-only (rejected)
Pros: zero design-system change. Cons: doesn't fix the root inconsistency; PresentationCard still uses raw `<button>`.

## Design

### Component: `src/components/ui/Button.astro`

```typescript
interface Props {
  variant?: "primary" | "secondary" | "danger" | "ghost"
            | "iconAccent" | "iconDanger";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  href?: string;
  icon?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  loading?: boolean;
  id?: string;
  ariaLabel?: string;
  class?: string;
  [key: string]: unknown;
}
```

### Behavior matrix

| iconOnly | variant      | Shape           | Background      | Text             | Hover bg       |
| -------- | ------------ | --------------- | --------------- | ---------------- | -------------- |
| false    | primary      | rounded-xl      | accent-600      | white            | accent-700     |
| false    | secondary    | rounded-xl      | card + border   | muted-foreground | background     |
| false    | danger       | rounded-xl      | danger-solid    | white            | danger-hover   |
| false    | ghost        | rounded-xl      | transparent     | muted-foreground | muted          |
| **true** | primary      | **rounded-full** | accent-600     | white            | accent-700     |
| **true** | secondary    | **rounded-full** | card + border  | muted-foreground | background     |
| **true** | danger       | **rounded-full** | danger-solid   | white            | danger-hover   |
| **true** | ghost        | **rounded-full** | transparent    | muted-foreground | muted          |
| **true** | iconAccent   | rounded-full    | transparent     | accent-600       | accent-50      |
| **true** | iconDanger   | rounded-full    | transparent     | danger           | danger-bg      |

### Size & icon rules
- `iconOnly`: `min-h-10 min-w-10 p-2` (40x40 touch target, 36x36 visible). Icon `size=14`.
- `!iconOnly`: behavior unchanged. Icon `size=14 (sm) / 16 (md) / 18 (lg)`.
- `iconOnly` ignores `<slot />` text.

### Validation
- TS warning if `iconAccent`/`iconDanger` used without `iconOnly`.
- Runtime: fall back to ghost with `console.warn`.
- `ariaLabel` becomes **required** (TS warning) when `iconOnly=true`.

### Responsive state enumeration

| Condition | Mobile (< md) | Desktop (≥ md) |
| --- | --- | --- |
| Ingredient table row | 2 icon buttons, 40x40 | 2 icon buttons, 40x40 |
| PresentationCard header | 2 icon buttons, hidden until edit mode | Same |
| Modal close (X) ingredients | NOT migrated (different semantic) | NOT migrated |

### Migration: `src/pages/ingredients.astro` (lines 450-479)
Remove class overrides, use new variants. Size drops 44px → 40px.

```astro
<Button
  variant="iconAccent"
  iconOnly
  icon="pencil"
  data-edit-trigger
  data-ingredient-payload={ingredientPayload}
  ariaLabel="Editar ingrediente"
/>
<Button
  variant="iconDanger"
  iconOnly
  icon="trash-2"
  data-delete-trigger
  data-ingredient-id={ingredient.id}
  data-ingredient-name={ingredient.name}
  data-used-recipes={usedRecipesPayload}
  title={usedRecipes.length > 0 ? "Ingrediente en uso" : "Eliminar ingrediente"}
  ariaLabel={usedRecipes.length > 0 ? "Ingrediente en uso" : "Eliminar ingrediente"}
/>
```

### Migration: `src/components/PresentationCard.astro` (lines 60-87)
Replace raw `<button>` with `Button`. Drop the pencil↔X icon swap, use `aria-pressed` only.

```astro
<Button
  variant="iconDanger"
  iconOnly
  icon="trash-2"
  class="delete-btn hidden"
  ariaLabel="Eliminar presentación"
  title="Eliminar"
/>
<Button
  variant="iconAccent"
  iconOnly
  icon="pencil"
  class="edit-btn"
  ariaLabel="Editar presentación"
  aria-pressed="false"
  title="Editar"
/>
```

JS adjustments in PresentationCard (lines 307-682):
- `querySelector(".edit-btn")` and `querySelector(".delete-btn")` keep working (class is forwarded).
- Toggle `aria-pressed` and `aria-label` on edit/cancel remains.
- Remove `edit-icon-pencil` / `edit-icon-cancel` swap logic (use static pencil icon).
- The two lines that swap icons in `toggleEdit()` (currently at 631-635 and 673-676) must be removed.

### Data Layer (Prisma)
No changes.

### Auth
No changes.

### Stripe / Billing
No changes.

### UI / UX
- **Components**: existing `Button` from `@/components/ui` barrel.
- **Tokens**: all from existing semantic tokens. No new tokens.
- **Forms**: no form changes.
- **Client bindings**: `data-*` attributes pass through `...attrs` to inner button.

### Error Handling
- TS warning at compile time if `iconAccent`/`iconDanger` is used without `iconOnly`.
- Runtime `console.warn` if detected.
- No user-facing error.

### Invariants
- Touch target ≥ 40x40px for any clickable action button.
- Action color semantics: edit = accent, delete = danger. No mixing.

### Verification
- `pnpm astro check` — type-check new props.
- `pnpm eslint .` — lint modified files.
- grep for `min-h-11 min-w-11 rounded-full` to ensure no leftover overrides in ingredients.astro.
- grep for `edit-icon-pencil` / `edit-icon-cancel` to ensure JS icon-swap is removed.

## Risks & Mitigations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| 40px vs 44px disrupts table rhythm | Low | Table uses `gap-2` (8px), proportional |
| `aria-pressed` not propagated to inner `<button>` | Medium | Verify rendered DOM; if missing, set via `data-editing` instead |
| Variants used without `iconOnly` | Low | TS warning + runtime fallback to ghost with `console.warn` |
| Other call sites with similar overrides | Low | grep before implementing |

## Out of Scope
- Modal close (X) buttons in `ingredients.astro:537-544, 604-611` — different semantic.
- Other icon buttons in the app.
- New `IconButton` component.
- Changing solid Button variants' behavior.
- Adding new icons to the astro-icon whitelist (existing `pencil`, `trash-2` suffice).
