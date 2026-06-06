# Analysis Report: Breadcrumb Global en Header

Created: 2026-06-06
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Mover el breadcrumb existente solo para recetas al Header global, haciéndolo disponible para todas las páginas del sistema con soporte móvil.

## Target Location
- **Primary anchors**: `src/components/Header.astro`, `src/layouts/Layout.astro`
- **Layer**: component (global header), layout

## Surrounding Context
- Header currently shows logo + sign-out. Used by Layout.astro which wraps all authenticated pages.
- Breadcrumb exists inline only in recipes/[recipe].astro with page-specific data ({name}).
- Layout already forwards currentPage to Header. Needs new breadcrumb-related props.
- Settings/billing.astro is a nested page under settings (needs two-level breadcrumb).
- recipes/[recipe].astro needs dynamic data (recipe name) injected into breadcrumb.

## Detected Tech Debt / Potential Refactors
- None significant. Straightforward refactor.

## Graphify Findings
[Skipped — codebase graph not needed for this scope]

## Codebase Patterns to Follow
- Import UI components from `@/components/ui` barrel
- Semantic tokens only (bg-card, text-foreground, etc.)
- Spanish labels
- Mobile-first responsive design
- `data-*-bound="1"` guard patterns for client JS

## Complexity Assessment
- **Decision**: ajuste
- **Rationale**: Mueve UI existente a un componente compartido. No crea nuevas páginas, rutas API, modelos Prisma, ni cambios auth/Stripe. Solo modifica componentes y layouts existentes.

## Dependencies & Prerequisites
- None

## Past Related Work
- None directly related
