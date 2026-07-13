# Plan: Icon Button Homologation

Date: 2026-06-08
Spec: `docs/specs/2026-06-08-icon-button-homologation-design.md`

## Goal

Extend `Button.astro` with `iconOnly` prop and `iconAccent`/`iconDanger` variants. Migrate two call sites (`ingredients.astro`, `PresentationCard.astro`).

## Acceptance Criteria

1. Single design-system primitive used for all icon action buttons.
2. `ingredients.astro` and `PresentationCard.astro` render visually identical icon buttons.
3. No manual color overrides outside the Button component for icon action buttons.
4. Touch target ≥ 40x40px.
5. `pnpm astro check` and `pnpm eslint .` pass.

## Tasks (single implementer dispatch)

1. Create documentation (analysis, spec, plan, task files)
2. Modify `Button.astro` — add `iconOnly`, `iconAccent`, `iconDanger`, refactor variant classes to support per-variant icon-only styling
3. Migrate `ingredients.astro:450-479` — replace 2 Button instances with new variants
4. Migrate `PresentationCard.astro` — replace raw buttons, remove JS icon swap
5. Verify with `pnpm astro check` and `pnpm eslint .`
