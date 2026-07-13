# Plan: Fix iconAccent Button Color Conflict

Created: 2026-06-09
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20260609-iconAccent-color-conflict.md

## Goal
Cambiar el variante `iconAccent` de Button para que no use `text-accent-600` directamente, evitando confusión visual con `iconDanger` cuando el acento es rojo/coral.

## Acceptance Criteria
- [ ] Botón editar (iconAccent) se ve neutral en reposo, no rojo
- [ ] Botón eliminar (iconDanger) mantiene su color danger
- [ ] Hover de iconAccent muestra color de acento (mantiene identidad)
- [ ] pnpm astro check pasa sin errores
- [ ] pnpm eslint pasa sin errores

## Analysis Summary
- `Button.astro` línea 73: `iconOnly: "text-accent-600 hover:bg-accent-50 rounded-full"`
- Cuando acento = rojo/coral, se confunde con `iconDanger` (`text-danger`)
- Solución: cambiar a `text-muted-foreground hover:text-accent-600 hover:bg-accent-50`

## Tasks
### Task 1: Fix iconAccent variant
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Cambiar variante iconAccent en Button.astro

### Task 2: Review changes
- **Agent**: reviewer
- **Skills**: ui-ux-pro-max, design-system-verify
- **Summary**: Verificar que el cambio no rompe otros usos y cumple design system

## Retrospective
[To be filled after Phase 7]
