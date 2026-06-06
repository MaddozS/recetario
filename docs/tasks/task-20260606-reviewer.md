# Task: Revisar Breadcrumb Global
Agent: reviewer
Date: 2026-06-06
Analysis: docs/analysis/analysis-20260606-breadcrumb-global-header.md
Plan: docs/plans/plan-20260606-breadcrumb-global-header.md

## Goal
Validar que el breadcrumb global funciona correctamente en todas las páginas, mobile y desktop, cumple convenciones del design system.

## Context
El implementer movió el breadcrumb de recipes/[recipe].astro al Header global. Todas las páginas autenticadas ahora deberían mostrar breadcrumb apropiado.

## Skills Required
- **ui-ux-pro-max**: Para validar diseño responsive y accesibilidad

## Checklist

### Functional
- [ ] Breadcrumb renders para cada página autenticada
- [ ] recipes/[recipe]: "Recetas > [nombre]" (Recetas es link a /recipes)
- [ ] settings/billing: "Configuración > Facturación" (Configuración es link a /settings)
- [ ] Top-level pages: label sola sin link
- [ ] 404 y landing pages: SIN breadcrumb
- [ ] Inline breadcrumb eliminado de recipes/[recipe].astro
- [ ] Action buttons en recipes/[recipe].astro aún funcionan (editar, duplicar, eliminar)

### Mobile
- [ ] Back arrow visible en mobile cuando hay breadcrumb
- [ ] Flecha es link clickable al padre correcto
- [ ] Touch target min-h-11 en mobile back button
- [ ] Logo oculto en mobile cuando breadcrumb presente

### Desktop
- [ ] Chevron separators entre items
- [ ] Último item no es link (font-semibold, text-foreground)
- [ ] Items previos son links con hover state
- [ ] Long text truncates (max-w)
- [ ] Logo visible alongside breadcrumb

### Conventions
- [ ] Semantic tokens used (text-muted-foreground, text-foreground, text-subtle-foreground, etc.)
- [ ] No hardcoded colors
- [ ] Icon from astro-icon/lucide (`lucide:chevron-left`, `lucide:chevron-right`)
- [ ] transition-colors on hover states
- [ ] aria-label="Breadcrumb" on nav element
- [ ] Spanish labels

### Build
- [ ] `pnpm astro check` passes
- [ ] No new TypeScript errors

## Files to Read
- src/components/Header.astro
- src/layouts/Layout.astro
- src/pages/recipes/index.astro
- src/pages/recipes/[recipe].astro
- src/pages/ingredients.astro
- src/pages/settings.astro
- src/pages/settings/billing.astro
- src/pages/produccion.astro
- src/pages/pricing.astro
- src/pages/404.astro

## Expected Output
Report at `docs/tasks/task-20260606-reviewer-report.md` with:
- Each checklist item: PASS/FAIL with explanation
- `pnpm astro check` output
- Any issues found
- Overall verdict: PASS / FAIL

## Guardrails
- IMMUTABLE: Never modify source code, spec files, plan files, or task files
- Read-only review
