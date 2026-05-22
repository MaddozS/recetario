# Fase 1 — Cimientos

> **Prioridad:** 🔴 Crítica
> **Dependencias:** Ninguna externa
> **Tier objetivo:** Basic + Pro
> **Feature gates involucrados:** `production_planner` (Basic+), `production_save` (Pro), `production_advanced` (Pro)
> **Estado:** ✅ Completado — 2026-05-17

---

## Objetivo

Abrir el planificador de producción al plan **Basic** (limitado a 3 recetas por plan), pulir la UX base del selector y la visualización de resultados. Todo sin depender de otras features del roadmap.

---

## Sub-fases

| Sub-fase | Descripción                                                                            | Plan detallado                                               |
| -------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| F1       | Migrar `production_planner` a Basic, agregar límite de 3 recetas, nuevos feature gates | [01-migracion-basic.md](./01-migracion-basic.md)             |
| F2       | Mejoras de visualización (colapsar breakdowns, sorting, totales peso/volumen)          | [09-mejoras-visualizacion.md](./09-mejoras-visualizacion.md) |

---

## Orden de implementación

1. **F1 primero** — Cambia los feature gates y agrega los nuevos flags. Sin esto, las mejoras de F2 no tienen sentido (el planificador seguiría siendo Pro-only).
2. **F2 después** — Mejoras visuales sobre la base ya abierta a Basic. Esfuerzo bajo, sin cambios en el backend.

---

## Verificación de fase completa

- [x] Usuario Free ve `<UpgradePrompt tier="basic">` en `/produccion`
- [x] Usuario Basic accede al planificador, selecciona hasta 3 recetas y calcula
- [x] Usuario Basic al seleccionar 4ª receta ve `<UpgradePrompt tier="pro">`
- [x] Usuario Pro accede sin límite de recetas
- [x] Breakdowns cargan colapsados por defecto
- [x] Tabla de ingredientes permite ordenar por columnas
- [x] Peso/volumen total visible en cada receta del breakdown
- [x] Nuevos feature gates (`production_save`, `production_advanced`) en `false` para Free y Basic
- [x] Nuevos feature gates en `true` para Pro
- [x] Planes de suscripción existentes se actualizan con nueva `featuresJson`

---

## Cambios adicionales no planeados originalmente

Durante la implementación se realizaron mejoras y ajustes no contemplados en los planes originales:

| Cambio                                                   | Detalle                                                                                                                                                                                                                |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Costos en summary del breakdown                          | En lugar de mostrar peso/volumen (kg/ml), el summary ahora muestra `Insumos: $X · Operativo: $Y · Total: $Z`                                                                                                           |
| Badges debajo del nombre                                 | Los badges "Seleccionada" y "Más rentable" se movieron debajo del nombre de la presentación en un `<div>` separado, en lugar de inline con flex                                                                        |
| Rediseño de `ProductionFinancialSummary`                 | Los 4 widgets se rediseñaron para coincidir visualmente con los de `[recipe].astro`: íconos con fondo de color, texto descriptivo, card verde sólida para ganancia estimada, y versión mobile con carrusel scroll-snap |
| `whitespace-nowrap` en badges                            | Evita saltos de línea dentro de los badges                                                                                                                                                                             |
| `flex-wrap` en labels del selector                       | Los controles (presentación + batches) bajan a la siguiente línea en mobile en lugar de forzar overflow                                                                                                                |
| `relative` en contenedor mobile del financial summary    | Los gradientes decorativos `absolute` se posicionaban incorrectamente sin este contenedor                                                                                                                              |
| `table-fixed` + anchos porcentuales en ingredients table | Columnas de Ingrediente (35%) y Recetas (22%) con distribución controlada mediante `table-fixed`                                                                                                                       |
| Soporte de `title` en `Layout.astro`                     | Se agregó la prop `title` al Layout y se usa directamente en `<title>`. También se agregó `currentPage === 'production'` como fallback                                                                                 |
| Alineación de controles en selector                      | `justify-end sm:justify-start` en el contenedor de controles para mejor layout en mobile                                                                                                                               |
