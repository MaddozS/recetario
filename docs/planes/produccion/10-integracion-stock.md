# F10: Integración con stock de ingredientes

> **Prioridad:** 🟡 Media
> **Dependencias:**
> - **Interna:** F1 (migración Basic, acceso al planificador)
> - **Externa:** Feature `stock_tracking` (roadmap #7, tier Basic) — requiere `stock_quantity`, `min_stock_threshold`, `stock_unit` en tabla `ingredients`
> **Tier:** Pro (la vista integrada en producción requiere `production_planner` = Pro; aunque `stock_tracking` es Basic, el cruce de datos dentro del planificador es valor Pro)
> **Feature gate:** `production_advanced` + `stock_tracking`

---

## Objetivo

Cruzar los datos de stock de ingredientes con el plan de producción para mostrar alertas de disponibilidad en la tabla de ingredientes consolidados. El usuario sabe de inmediato si tiene suficiente inventario para ejecutar el plan o si necesita comprar antes.

---

## 1. Requisitos previos

El feature `stock_tracking` (roadmap #7) debe estar implementado y los siguientes campos deben existir en la tabla `ingredients`:

```prisma
model Ingredient {
  // ... campos existentes ...
  stockQuantity     Float?  @map("stock_quantity")
  minStockThreshold Float?  @map("min_stock_threshold")
  stockUnit         String? @map("stock_unit") @db.VarChar(10)
}
```

También deben existir las funciones de consulta de stock en `src/lib/db/ingredients.ts`:

```ts
export type IngredientStock = {
  ingredientId: number;
  stockQuantity: number | null;
  minStockThreshold: number | null;
  stockUnit: string | null;
};
```

---

## 2. Cálculo de disponibilidad

### 2.1 Función helper

```ts
// src/lib/production-calculator.ts

export type StockStatus = "sufficient" | "tight" | "insufficient" | "unknown";

export interface IngredientWithStock extends ConsolidatedIngredient {
  stockQuantity: number | null;
  minStockThreshold: number | null;
  stockUnit: string | null;
  stockStatus: StockStatus;
  deficit: number; // Cantidad faltante (0 si suficiente), en la unidad del ingrediente
}

export function calculateStockStatus(
  ingredient: ConsolidatedIngredient,
  stock: { stockQuantity: number | null; minStockThreshold: number | null; stockUnit: string | null }
): StockStatus {
  if (stock.stockQuantity === null) return "unknown";

  // Convertir unidades si es necesario
  const required = ingredient.totalQuantity;
  const available = stock.stockQuantity;

  if (available >= required) {
    const threshold = stock.minStockThreshold ?? 0;
    const remaining = available - required;
    return remaining < threshold ? "tight" : "sufficient";
  }

  return "insufficient";
}
```

### 2.2 Integración en `calculateProduction()`

Modificar la función para que acepte datos de stock opcionales:

```ts
export function calculateProduction(
  selections: ProductionRecipeSelection[],
  recipes: RecipeWithIngredients[],
  stockMap?: Map<number, { stockQuantity: number | null; minStockThreshold: number | null; stockUnit: string | null }>,
): {
  consolidatedIngredients: (ConsolidatedIngredient & { stockStatus: StockStatus; deficit: number })[];
  summary: ProductionSummary;
}
```

---

## 3. Indicadores visuales en la tabla

### 3.1 `ProductionIngredientsTable.astro`

Agregar columna "Stock" con indicador de color:

```astro
<th class="px-6 py-4">Stock</th>

<!-- En cada fila: -->
<td class="px-6 py-4">
  {ing.stockStatus === "unknown" ? (
    <span class="text-subtle-foreground text-xs">—</span>
  ) : ing.stockStatus === "sufficient" ? (
    <span class="text-success inline-flex items-center gap-1 text-xs font-bold">
      <span class="bg-success-solid h-2 w-2 rounded-full"></span>
      Suficiente
    </span>
  ) : ing.stockStatus === "tight" ? (
    <span class="text-warning inline-flex items-center gap-1 text-xs font-bold">
      <span class="bg-warning-solid h-2 w-2 rounded-full"></span>
      Ajustado
    </span>
  ) : (
    <span class="text-danger inline-flex items-center gap-1 text-xs font-bold">
      <span class="bg-danger-solid h-2 w-2 rounded-full"></span>
      Faltan {formatQuantity(ing.deficit)} {ing.unit}
    </span>
  )}
</td>
```

---

## 4. Barra de resumen de stock

Encima de la tabla de ingredientes, mostrar un resumen rápido:

```astro
---
const stockSummary = {
  sufficient: ingredients.filter(i => i.stockStatus === "sufficient").length,
  tight: ingredients.filter(i => i.stockStatus === "tight").length,
  insufficient: ingredients.filter(i => i.stockStatus === "insufficient").length,
  unknown: ingredients.filter(i => i.stockStatus === "unknown").length,
};
---

<div class="flex flex-wrap gap-3 mb-4">
  {stockSummary.sufficient > 0 && (
    <span class="bg-success-bg text-success border-success-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold">
      {stockSummary.sufficient} suficiente
    </span>
  )}
  {stockSummary.tight > 0 && (
    <span class="bg-warning-bg text-warning border-warning-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold">
      {stockSummary.tight} ajustado
    </span>
  )}
  {stockSummary.insufficient > 0 && (
    <span class="bg-danger-bg text-danger border-danger-border inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold">
      {stockSummary.insufficient} insuficiente
    </span>
  )}
  {stockSummary.unknown > 0 && (
    <span class="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold">
      {stockSummary.unknown} sin stock registrado
    </span>
  )}
</div>
```

---

## 5. Flujo en `produccion.astro`

```astro
---
import { hasFeature } from "../lib/subscription";

const hasStockTracking = hasFeature(subscription, "stock_tracking");
const hasProductionAdvanced = hasFeature(subscription, "production_advanced");
const showStock = hasStockTracking && hasProductionAdvanced;

let stockMap: Map<number, any> | undefined;

if (showStock && selections.length > 0) {
  // Obtener stock de los ingredientes involucrados
  const ingredientIds = [...new Set(
    validRecipes.flatMap(r => r.ingredients.map(i => i.ingredientId))
  )];
  const stocks = await getIngredientsStock(ingredientIds, ownerId); // Nueva función en db/ingredients.ts
  stockMap = new Map(stocks.map(s => [s.ingredientId, s]));
}

// Pasar stockMap a calculateProduction si existe
results = calculateProduction(validSelections, validRecipes, stockMap);
---
```

---

## 6. Lista de compras sugerida por stock insuficiente

En el modo "Pedido de Compras" (F4), resaltar automáticamente los ingredientes con stock insuficiente y sugerir la cantidad a comprar:

```
☐ Harina 000 — 2.5 kg — Pureza
  ⚠ Stock actual: 1 kg — Necesitas comprar al menos 1.5 kg más
```

---

## 7. Opcional: Botón "Descontar del stock"

Después de ejecutar la producción, un botón que descuenta las cantidades usadas del stock:

```ts
async function deductStock(ingredients: ConsolidatedIngredient[], ownerId: string) {
  for (const ing of ingredients) {
    if (ing.stockQuantity === null) continue;
    const newQuantity = ing.stockQuantity - ing.totalQuantity;
    await updateIngredientStock(ing.ingredientId, Math.max(0, newQuantity), ownerId);
  }
}
```

Este botón requiere confirmación ("¿Descontar ingredientes del inventario?") y muestra un resumen de lo que se descontará.

---

## 8. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/lib/production-calculator.ts` | Nuevo tipo `StockStatus`, función `calculateStockStatus`, parámetro opcional `stockMap` |
| `src/lib/production-types.ts` | Nuevo tipo `IngredientWithStock` |
| `src/lib/db/ingredients.ts` | Nueva función `getIngredientsStock(ids, ownerId)` |
| `src/components/ProductionIngredientsTable.astro` | Columna "Stock" con indicadores, barra de resumen |
| `src/components/ProductionShoppingList.astro` | Alertas de stock insuficiente en modo compras |
| `src/pages/produccion.astro` | Carga de stock data, integración con calculadora |

---

## 9. Verificación

- [ ] Solo usuarios con `stock_tracking` + `production_advanced` ven indicadores de stock
- [ ] Ingrediente con stock suficiente muestra indicador verde "Suficiente"
- [ ] Ingrediente con stock que cubre pero queda bajo umbral muestra "Ajustado" en amarillo
- [ ] Ingrediente con stock insuficiente muestra "Faltan X [unidad]" en rojo
- [ ] Ingredientes sin stock registrado muestran "—"
- [ ] Barra de resumen muestra conteos correctos
- [ ] Modo compras sugiere cantidades a comprar para cubrir déficit
- [ ] Cálculo de déficit convierte unidades correctamente
- [ ] (Opcional) Botón "Descontar del stock" actualiza el inventario
