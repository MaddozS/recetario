# F11: Integración con costos fijos avanzados

> **Prioridad:** 🟡 Media
> **Dependencias:**
> - **Externa:** Feature `advanced_costs` (roadmap #9, tier Pro) — requiere tabla `fixed_cost_lines` con múltiples líneas de costo fijo por receta
> - **Interna:** F1 (acceso al planificador)
> **Tier:** Pro
> **Feature gate:** `production_advanced` + `advanced_costs`

---

## Objetivo

Cuando el sistema de costos fijos avanzados esté implementado (múltiples líneas de costo: mano de obra, electricidad, gas, empaque, etc.), el planificador debe incorporar esas líneas en lugar del `fixedCostsPercentage` único, mostrando un desglose detallado.

---

## 1. Requisitos previos

El feature `advanced_costs` (roadmap #9) debe estar implementado con:

### 1.1 Modelo esperado

```prisma
model FixedCostLine {
  id        Int     @id @default(autoincrement())
  recipeId  Int     @map("recipe_id")
  name      String  @db.VarChar(100)       // "Mano de obra", "Electricidad", etc.
  amount    Float                          // Monto
  type      String  @db.VarChar(20)        // "fixed_per_batch" | "per_unit" | "percentage" | "per_hour"
  hours     Float?                         // Solo si type = "per_hour"
  unitCount Int?    @map("unit_count")     // Solo si type = "per_unit"

  recipe Recipe @relation(fields: [recipeId], references: [id], onDelete: Cascade)

  @@map("fixed_cost_lines")
}
```

### 1.2 Tipo en `RecipeWithIngredients`

```ts
export type RecipeWithIngredients = {
  // ... campos existentes ...
  fixedCostLines?: FixedCostLine[]; // NUEVO
};

export type FixedCostLine = {
  id: number;
  name: string;
  amount: number;
  type: "fixed_per_batch" | "per_unit" | "percentage" | "per_hour";
  hours?: number;
  unitCount?: number;
};
```

---

## 2. Cálculo de costos fijos por receta

### 2.1 Función helper

```ts
// src/lib/production-calculator.ts

export function calculateFixedCosts(
  fixedCostLines: FixedCostLine[] | undefined,
  batches: number,
  ingredientsCost: number,
): number {
  if (!fixedCostLines || fixedCostLines.length === 0) return 0;

  return fixedCostLines.reduce((total, line) => {
    switch (line.type) {
      case "fixed_per_batch":
        return total + line.amount * batches;
      case "per_unit":
        return total + line.amount * (line.unitCount ?? 1) * batches;
      case "percentage":
        return total + ingredientsCost * (line.amount / 100);
      case "per_hour":
        return total + line.amount * (line.hours ?? 1) * batches;
      default:
        return total;
    }
  }, 0);
}
```

### 2.2 Reemplazo en `calculateProduction()`

```diff
- const recipeOperationalCost =
-   recipeIngredientCost * (recipe.fixedCostsPercentage / 100);
+ const recipeOperationalCost =
+   recipe.fixedCostLines && recipe.fixedCostLines.length > 0
+     ? calculateFixedCosts(recipe.fixedCostLines, batches, recipeIngredientCost)
+     : recipeIngredientCost * (recipe.fixedCostsPercentage / 100);
```

Esto mantiene compatibilidad hacia atrás: recetas sin `fixedCostLines` siguen usando `fixedCostsPercentage`.

---

## 3. Desglose de costos fijos en el breakdown

### 3.1 `ProductionRecipeBreakdown.astro`

Si la receta tiene `fixedCostLines`, mostrar tabla de desglose en lugar del card único "Operativo":

```astro
{recipe.fixedCostLines && recipe.fixedCostLines.length > 0 ? (
  <div>
    <h4 class="text-muted-foreground mb-3 text-xs font-bold tracking-[0.16em] uppercase">
      Costos fijos
    </h4>
    <div class="border-border overflow-x-auto rounded-xl border">
      <table class="min-w-full text-left text-sm">
        <thead>
          <tr class="text-muted-foreground bg-background text-[11px] font-bold tracking-[0.16em] uppercase">
            <th class="px-4 py-3">Concepto</th>
            <th class="px-4 py-3">Tipo</th>
            <th class="px-4 py-3">Monto</th>
          </tr>
        </thead>
        <tbody class="divide-y">
          {recipe.fixedCostLines.map((line) => {
            const lineCost = calculateLineCost(line, recipe.batches, recipe.ingredientsCost);
            return (
              <tr class="hover:bg-hover-muted">
                <td class="text-foreground px-4 py-3 font-medium">{line.name}</td>
                <td class="text-muted-foreground px-4 py-3 text-xs">
                  {formatCostType(line)}
                </td>
                <td class="text-secondary-foreground px-4 py-3 font-mono tabular-nums">
                  {formatCurrency(lineCost)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr class="bg-muted border-t font-bold">
            <td class="px-4 py-3" colspan="2">Total costos fijos</td>
            <td class="text-foreground px-4 py-3 font-mono tabular-nums">
              {formatCurrency(recipe.operationalCost)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  </div>
) : (
  <!-- Fallback: card único "Operativo" (comportamiento actual) -->
  <div class="grid grid-cols-3 gap-3">
    <div class="bg-muted rounded-xl p-3">...</div>
  </div>
)}
```

Donde `formatCostType` traduce los tipos:

```ts
function formatCostType(line: FixedCostLine): string {
  switch (line.type) {
    case "fixed_per_batch": return "Fijo por batch";
    case "per_unit": return `Por unidad (×${line.unitCount ?? 1})`;
    case "percentage": return `${line.amount}% de insumos`;
    case "per_hour": return `×${line.hours ?? 1}h (por hora)`;
    default: return line.type;
  }
}
```

---

## 4. Archivos involucrados

| Archivo | Cambio |
|---|---|
| `src/lib/production-calculator.ts` | Nueva función `calculateFixedCosts()`, lógica condicional en `calculateProduction()` |
| `src/lib/production-types.ts` | Sin cambios (usa tipos existentes + `FixedCostLine` de `db/types.ts`) |
| `src/components/ProductionRecipeBreakdown.astro` | Tabla de desglose de costos fijos, fallback a card único |
| `src/pages/produccion.astro` | Sin cambios (la calculadora maneja la lógica internamente) |

---

## 5. Verificación

- [ ] Receta con `fixedCostLines` usa el cálculo avanzado en lugar de `fixedCostsPercentage`
- [ ] Receta sin `fixedCostLines` sigue usando `fixedCostsPercentage` (compatibilidad)
- [ ] Cada línea de costo fijo aparece en el breakdown con nombre, tipo y monto
- [ ] Costo `per_hour` multiplica por horas y batches correctamente
- [ ] Costo `per_unit` multiplica por unitCount y batches
- [ ] Costo `fixed_per_batch` multiplica por batches
- [ ] Costo `percentage` calcula sobre el costo de insumos
- [ ] Total de costos fijos en el breakdown coincide con `recipe.operationalCost`
- [ ] Solo usuarios con `advanced_costs` + `production_advanced` ven el desglose detallado
- [ ] Usuarios sin `advanced_costs` ven el card único de siempre
