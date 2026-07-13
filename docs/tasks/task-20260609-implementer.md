# Task: Fix iconAccent Button Variant
Agent: implementer
Date: 2026-06-09
Analysis: docs/analysis/analysis-20260609-iconAccent-color-conflict.md
Plan: docs/plans/plan-20260609-iconAccent-fix.md

## Goal
Cambiar el variante `iconAccent` en Button.astro para usar color neutral en reposo y color de acento solo en hover.

## Context
Cuando el color de acento es rojo/coral, el botón de editar (iconAccent) se confunde con el botón de eliminar (iconDanger) porque ambos se ven rojos. Necesitamos que iconAccent sea neutral en reposo.

## Skills Required
- **ui-ux-pro-max**: UI/UX design, semantic tokens

## Files Involved
- `src/components/ui/Button.astro`: modify — cambiar variante iconAccent

## Files the Subagent May Create or Edit
- [ ] `src/components/ui/Button.astro`: cambiar línea 73
- [ ] `docs/tasks/task-20260609-implementer-report.md` — the report file (mandatory)

## Technical Steps
1. **Load skills**: ui-ux-pro-max
2. **Read** `src/components/ui/Button.astro`
3. **Modify** línea 73 del objeto `variantClasses`:
   - Antes: `iconOnly: "text-accent-600 hover:bg-accent-50 rounded-full",`
   - Después: `iconOnly: "text-muted-foreground hover:text-accent-600 hover:bg-accent-50 rounded-full",`
4. **Run verification**: `pnpm astro check` y `pnpm eslint .`
5. **Write report** to `docs/tasks/task-20260609-implementer-report.md`

## Expected Output
- **Code changes**: `src/components/ui/Button.astro` (1 línea cambiada)
- **Report**: save to `docs/tasks/task-20260609-implementer-report.md`

## Guardrails
- NO cambiar otros variantes (iconDanger, ghost, etc.)
- NO cambiar el variante `solid` de iconAccent (solo `iconOnly`)
- Usar semantic tokens, no colores hardcoded
- IMMUTABLE: Never modify spec files, plan files, analysis reports, or other task files
