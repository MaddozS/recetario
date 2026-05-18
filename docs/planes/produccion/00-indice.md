# Índice — Planificador de Producción

> **Fecha del plan:** 2026-05-17
>
> Desglose detallado de las fases de implementación del planificador de producción. Cada fase tiene su propio archivo con arquitectura, archivos involucrados, dependencias y criterios de verificación.

---

## División de tiers

| Feature gate          | Free    | Basic      | Pro    | Controla                                                  |
| --------------------- | ------- | ---------- | ------ | --------------------------------------------------------- |
| `production_planner`  | `false` | **`true`** | `true` | Acceso a `/produccion`, funcionalidad base                |
| `production_save`     | `false` | `false`    | `true` | Guardar/cargar planes, historial                          |
| `production_advanced` | `false` | `false`    | `true` | Compras, escenarios, CSV, checklist, precios interactivos |

**Basic** tiene límite de **3 recetas por plan**. Al seleccionar la 4ª, se muestra `<UpgradePrompt tier="pro">`.

---

## Fases de implementación

### Fase 1 — Cimientos (sin dependencias externas) ✅ Completado — 2026-05-17

| #     | Archivo                                                      | Prioridad  | Tier                | Estado |
| ----- | ------------------------------------------------------------ | ---------- | ------------------- | ------ |
| F1    | [01-migracion-basic.md](./01-migracion-basic.md)             | 🔴 Crítica | **Basic**           | ✅     |
| F2    | [09-mejoras-visualizacion.md](./09-mejoras-visualizacion.md) | 🟢 Baja    | **Basic**           | ✅     |
| F1+F2 | [01-fase-1-cimientos.md](./01-fase-1-cimientos.md)           | 🔴         | Guía de integración | ✅     |

### Fase 2 — Experiencia interactiva

| #   | Archivo                                                      | Prioridad  | Tier |
| --- | ------------------------------------------------------------ | ---------- | ---- |
| F3  | [02-calculo-client-side.md](./02-calculo-client-side.md)     | 🔴 Crítica | Pro  |
| F4  | [03-pedido-compras.md](./03-pedido-compras.md)               | 🟠 Alta    | Pro  |
| F5  | [04-guardar-cargar-planes.md](./04-guardar-cargar-planes.md) | 🟠 Alta    | Pro  |

### Fase 3 — Features avanzadas

| #   | Archivo                                                          | Prioridad | Tier |
| --- | ---------------------------------------------------------------- | --------- | ---- |
| F6  | [06-precios-interactivos.md](./06-precios-interactivos.md)       | 🟡 Media  | Pro  |
| F7  | [07-exportacion-csv.md](./07-exportacion-csv.md)                 | 🟡 Media  | Pro  |
| F8  | [05-comparativa-escenarios.md](./05-comparativa-escenarios.md)   | 🟡 Media  | Pro  |
| F9  | [08-checklist-mise-en-place.md](./08-checklist-mise-en-place.md) | 🟢 Baja   | Pro  |

### Fase 4 — Integraciones (dependen de otros módulos)

| #   | Archivo                                                        | Prioridad | Tier | Dependencia externa            |
| --- | -------------------------------------------------------------- | --------- | ---- | ------------------------------ |
| F10 | [10-integracion-stock.md](./10-integracion-stock.md)           | 🟡 Media  | Pro  | `stock_tracking` (roadmap #7)  |
| F11 | [11-costos-fijos-avanzados.md](./11-costos-fijos-avanzados.md) | 🟡 Media  | Pro  | `advanced_costs` (roadmap #9)  |
| F12 | [12-totales-nutricionales.md](./12-totales-nutricionales.md)   | 🟢 Baja   | Pro  | `nutrition_info` (roadmap #10) |

---

## Dependencias entre fases

```
Fase 1:  F1 ──────────────► F2
           │                  │
           ▼                  ▼
Fase 2:  F3 ──────────────► F4 ──► F5
           │                  │
           ▼                  ▼
Fase 3:  F6 ──► F7 ──► F8 ──► F9
           │
Fase 4:  F10 · F11 · F12 (esperan features externas)
```

- **F3 (client-side)** es habilitador de F4, F6, F8, F9
- **F4 (compras)** requiere toggle client-side de F3
- **F5 (guardar)** es independiente de F3-F4, puede implementarse en paralelo
- **F6-F9** requieren F3 completado
- **F10-F12** requieren sus respectivos módulos externos implementados

---

## Archivos del sistema afectados (visión global)

| Archivo                                           | Fases que lo tocan         |
| ------------------------------------------------- | -------------------------- |
| `src/lib/db/billing.ts`                           | F1                         |
| `src/lib/subscription.ts`                         | F1                         |
| `src/pages/produccion.astro`                      | F1, F2, F3, F4, F5, F7, F8 |
| `src/lib/production-calculator.ts`                | F2, F3, F6, F11            |
| `src/lib/production-types.ts`                     | F1, F5                     |
| `src/components/ProductionRecipeSelector.astro`   | F1, F2, F3, F5             |
| `src/components/ProductionIngredientsTable.astro` | F2, F10                    |
| `src/components/ProductionFinancialSummary.astro` | F2, F6                     |
| `src/components/ProductionRecipeBreakdown.astro`  | F2, F6, F9                 |
| `src/components/ProductionShoppingList.astro`     | F4 (nuevo)                 |
| `src/components/ProductionSavedPlans.astro`       | F5 (nuevo)                 |
| `src/components/ProductionScenarioCompare.astro`  | F8 (nuevo)                 |
| `src/components/ProductionChecklist.astro`        | F9 (nuevo)                 |
| `src/lib/db/production-plans.ts`                  | F5 (nuevo)                 |
| `src/lib/export-csv.ts`                           | F7 (nuevo)                 |
| `prisma/schema.prisma`                            | F5                         |
| `src/styles/global.css`                           | F2, F4                     |
