# Task: Implementer — Icon Button Homologation

Date: 2026-06-08
Spec: `docs/specs/2026-06-08-icon-button-homologation-design.md`
Plan: `docs/plans/plan-20260608-icon-button-homologation.md`
Agent: implementer

## Goal

Extend `src/components/ui/Button.astro` with `iconOnly` prop and `iconAccent`/`iconDanger` variants. Migrate 2 call sites (ingredients.astro, PresentationCard.astro). Eliminate manual color overrides and raw `<button>` elements.

## Context

- `Button.astro` is the design system primitive (`@/components/ui` barrel). Current variant union: `primary | secondary | danger | ghost`.
- `ingredients.astro:450-479` uses Button with manual class overrides for edit/delete icon buttons.
- `PresentationCard.astro:60-87` uses raw `<button>` with hand-rolled classes + JS icon swap (pencil↔X).
- Both icons (`pencil`, `trash-2`) already in astro-icon whitelist.

## Files Involved

| File | Change |
|------|--------|
| `src/components/ui/Button.astro` | Add `iconOnly` prop, `iconAccent`/`iconDanger` variants, refactor variant classes |
| `src/pages/ingredients.astro` | Replace 2 Button instances with new variants |
| `src/components/PresentationCard.astro` | Replace 2 raw `<button>` elements with Button, remove JS icon swap logic |

## Files May Create

| File | Purpose |
|------|---------|
| `docs/specs/2026-06-08-icon-button-homologation-design.md` | Spec |
| `docs/analysis/analysis-20260608-icon-button-homologation.md` | Analysis |
| `docs/plans/plan-20260608-icon-button-homologation.md` | Plan |
| `docs/tasks/task-20260608-implementer.md` | This task file |
| `docs/tasks/task-20260608-implementer-report.md` | Report (created at end) |

## Technical Steps

1. Read current Button.astro, ingredients.astro:440-490, PresentationCard.astro (full file), index.ts, astro.config.mjs:28-92.
2. Modify `src/components/ui/Button.astro`:
   - Add `iconOnly?: boolean` to Props.
   - Add `"iconAccent" | "iconDanger"` to variant union.
   - In frontmatter, validate: if `variant` is `iconAccent`/`iconDanger` and `!iconOnly`, `console.warn` + fallback to `ghost`.
   - Refactor `variantClasses` to a `Record<string, { solid: string; iconOnly: string }>`:
     - `iconAccent`: solid=`text-muted-foreground hover:bg-muted rounded-xl`; iconOnly=`text-accent-600 hover:bg-accent-50 rounded-full`
     - `iconDanger`: solid=`text-muted-foreground hover:bg-muted rounded-xl`; iconOnly=`text-danger hover:bg-danger-bg rounded-full`
     - Existing variants: same solid as before, iconOnly = solid but `rounded-xl` → `rounded-full`
   - Pick variant class based on `iconOnly`.
   - Icon size: `iconOnly ? 14 : (size === "sm" ? 14 : size === "lg" ? 18 : 16)`.
   - When `iconOnly`, omit `<slot />`.
   - Remove `paddingOnly` variable (replaced by per-variant iconOnly classes).
   - When `iconOnly`, use `min-h-10 min-w-10 p-2` (sizeClasses override) instead of normal size classes.
3. Modify `src/pages/ingredients.astro:450-479`:
   - Edit button: `variant="iconAccent" iconOnly icon="pencil" ...`
   - Delete button: `variant="iconDanger" iconOnly icon="trash-2" ...`
   - Remove all class overrides.
4. Modify `src/components/PresentationCard.astro`:
   - Import `Button` from `@/components/ui`.
   - Replace raw `<button>` at lines 61-68 with `<Button variant="iconDanger" iconOnly ...>`.
   - Replace raw `<button>` at lines 69-86 with `<Button variant="iconAccent" iconOnly ...>`.
   - Remove lines 631-635 (pencil→X swap in toggleEdit ON).
   - Remove lines 673-676 (pencil→X swap in toggleEdit OFF).
   - Remove the `edit-icon edit-icon-pencil` / `edit-icon edit-icon-cancel` classes from the template.
5. Verify: `pnpm astro check` and `pnpm eslint .`. Fix any issues.
6. Create implementer report.

## Expected Output

- Button.astro supports `iconOnly` + new variants.
- Both call sites use Button without manual classes or raw buttons.
- `pnpm astro check` and `pnpm eslint .` pass.

## Guardrails

- Never modify spec, plan, analysis, or task files that weren't created by this task.
- Never modify agent specs.
- Use caveman lite.
- After code changes, run verification before claiming success.
- If verification fails, attempt 1 fix cycle. If still failing, report in task report.
