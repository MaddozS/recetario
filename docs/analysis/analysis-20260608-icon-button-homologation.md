# Analysis: Icon Button Homologation

Date: 2026-06-08
Complexity: feature (3 files, ~80 lines changed)

## Findings

- `src/components/ui/Button.astro` is the design system primitive. Variants: `primary | secondary | danger | ghost`. Sizes: `sm | md | lg`. Exported from `@/components/ui` barrel.
- `src/pages/ingredients.astro:450-479` uses `Button` with manual class overrides (`text-subtle-foreground hover:bg-accent-50 hover:text-accent-600 min-h-11 min-w-11 rounded-full` for edit, `text-danger hover:bg-danger-bg hover:text-danger min-h-11 min-w-11 rounded-full` for delete). Leaks design tokens outside the system.
- `src/components/PresentationCard.astro:60-87` uses raw `<button>` with hand-rolled classes. No design-system binding. Includes pencil↔X icon swap on edit toggle.
- Both use `lucide:pencil` and `lucide:trash-2` (already whitelisted in `astro.config.mjs:73,84`).
- Touch targets: 44x44 in both call sites. Visual icon size: 16px.

## Target files

1. `src/components/ui/Button.astro` — extend with `iconOnly`, `iconAccent`, `iconDanger`
2. `src/pages/ingredients.astro` — migrate 2 Button instances
3. `src/components/PresentationCard.astro` — migrate 2 raw `<button>` instances, remove JS icon swap

## Approach

Extend `Button` (not new `IconButton`) — keeps loading/disabled/focus logic shared. New `iconOnly` prop changes shape to 36x36 visible (40x40 touch target) rounded-full. Two new variants `iconAccent` (accent hover) and `iconDanger` (danger hover). Migrate both call sites.
