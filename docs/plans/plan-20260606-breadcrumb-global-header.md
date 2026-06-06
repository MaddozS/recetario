# Plan: Breadcrumb Global en Header

Created: 2026-06-06
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20260606-breadcrumb-global-header.md

## Goal
Mover el breadcrumb al Header global para que aparezca en todas las páginas autenticadas, con versión móvil adecuada.

## Acceptance Criteria
- [ ] Breadcrumb visible en Header para todas las páginas usando Layout (excepto landing pages y 404)
- [ ] recipes/[recipe].astro muestra "Recetas > [nombre receta]"
- [ ] settings/billing.astro muestra "Configuración > Facturación"
- [ ] Páginas top-level muestran label simple (ej: "Recetas", "Ingredientes", etc.)
- [ ] Versión móvil: flecha back + nombre página padre (compacto)
- [ ] Versión desktop: breadcrumb completo con separadores chevron
- [ ] Breadcrumb original eliminado de recipes/[recipe].astro
- [ ] Usa semantic tokens (bg-card, text-foreground, etc.)
- [ ] `pnpm astro check` passes sin errores nuevos

## Analysis Summary
- Header actual: logo + sign-out, sin breadcrumb
- Breadcrumb solo existe en recipes/[recipe].astro líneas 548-558
- Layout pasa currentPage a Header
- 8 páginas autenticadas necesitan breadcrumb
- 2 páginas necesitan dos niveles (recipes/[recipe], settings/billing)

## User Stories
- Como usuario, quiero ver mi ubicación actual en el header para saber dónde estoy dentro de la app en todo momento.
- Como usuario móvil, quiero un botón de retroceso claro en el header para volver a la sección padre.

## Design Rationale
**Approach**: Pasar array de breadcrumb items como prop desde cada página -> Layout -> Header.

Estructura de datos:
```ts
type BreadcrumbItem = { label: string; href?: string }
```

Prop flow:
- Cada página define su array `breadcrumbs`
- Layout lo recibe como prop opcional y lo pasa a Header
- Header renderiza el breadcrumb entre logo y sign-out (desktop) o reemplaza el título "KitchCalc" con breadcrumb mobile (flecha back + label)
- Si no hay breadcrumbs (landing, 404), Header se ve como antes

Mobile behavior:
- Mostrar flecha izquierda (chevron-left) + label de la página padre/enlace
- Si es página top-level sin href padre, mostrar solo label (no clickable)
- El logo se oculta en mobile cuando hay breadcrumb para ahorrar espacio

Desktop behavior:
- Breadcrumb completo visible entre logo y sign-out
- Separadores chevron-right entre items
- Último item es texto plano (no link), font-semibold
- Items previos son links con hover state

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| Header muy ancho en desktop con breadcrumb largo | Medium | Truncar último item con max-w + truncate |
| Conflict space with sign-out button on small tablets | Low | Flex layout con gap ajustable |

## Tasks
### Task 1: Implementar breadcrumb global en Header
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: Crear Breadcrumb tipo, modificar Header para aceptar/renderizar breadcrumbs, actualizar Layout para pasar prop, actualizar todas las páginas para definir su breadcrumb, eliminar breadcrumb inline de recipes/[recipe].astro

### Task 2: Revisar implementación
- **Agent**: reviewer
- **Skills**: ui-ux-pro-max
- **Summary**: Verificar que breadcrumb aparece correctamente en todas las páginas, mobile/desktop, semantic tokens, `pnpm astro check` passes
