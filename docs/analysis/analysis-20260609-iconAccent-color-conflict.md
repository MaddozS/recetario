# Analysis Report: iconAccent Button Color Conflict

Created: 2026-06-09
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Cuando el color de acento es rojo/coral, los botones `iconAccent` (editar) se confunden visualmente con los botones `iconDanger` (eliminar) porque ambos usan tonos rojos.

## Target Location
- **Primary anchor**: `src/components/ui/Button.astro` (líneas 70-77)
- **Layer**: component (UI primitive)

## Surrounding Context
- `Button.astro` define 6 variantes: primary, secondary, danger, ghost, iconAccent, iconDanger
- `iconAccent` usa `text-accent-600` en modo iconOnly
- `iconDanger` usa `text-danger` en modo iconOnly
- Cuando el acento es rojo/coral, ambos se ven rojos

## Detected Tech Debt / Potential Refactors
- Ninguno. Es un cambio aislado en una variante de botón.

## Codebase Patterns to Follow
- **UI components**: `@/components/ui` barrel
- **Semantic tokens**: usar tokens semánticos, no colores hardcoded
- **Button variants**: definir en `variantClasses` object

## Complexity Assessment
- **Decision**: ajuste
- **Rationale**: Cambio de una línea en una variante de botón. No afecta arquitectura, API, ni datos.

## Dependencies & Prerequisites
- Ninguno. Cambio autocontenido en Button.astro.

## Past Related Work
- `docs/analysis/analysis-20260608-icon-button-homologation.md` — homologación de botones de icono
- `docs/plans/plan-20260608-1200-recipe-actions-menu.md` — extracción de RecipeActionsMenu
