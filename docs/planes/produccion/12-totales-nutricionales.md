# F12: Totales nutricionales del plan

> **Prioridad:** 🟢 Baja
> **Dependencias:**
>
> - **Externa:** Feature `nutrition_info` (roadmap #10, tier Pro) — requiere campos nutricionales en `ingredients`
> - **Interna:** F1 (acceso al planificador)
>   **Tier:** Pro
>   **Feature gate:** `production_advanced` + `nutrition_info`

---

## Objetivo

Sumar los datos nutricionales de todos los ingredientes del plan de producción y mostrar una tabla nutricional consolidada estilo etiqueta regulatoria para toda la producción, y opcionalmente por presentación.

---

## 1. Requisitos previos

El feature `nutrition_info` (roadmap #10) debe estar implementado con campos en `ingredients`:

```prisma
model Ingredient {
  // ... campos existentes ...
  calories     Float? // kcal por 100g o por unidad
  protein      Float? // g por 100g o por unidad
  carbs        Float? // g por 100g o por unidad
  fat          Float? // g por 100g o por unidad
  fiber        Float? // g por 100g o por unidad
  sodium       Float? // mg por 100g o por unidad
  nutritionBaseUnit String? @map("nutrition_base_unit") @db.VarChar(10) // "100g" | "100ml" | "unit"
}
```

También debe existir una función helper:

```ts
// src/lib/nutrition.ts (existente del feature #10)
export type NutritionData = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  sodium: number;
};

export function calculateRecipeNutrition(
  ingredients: RecipeIngredientWithData[],
  batches: number,
): NutritionData;
```

---

## 2. Cálculo de totales nutricionales

### 2.1 Función en `production-calculator.ts`

```ts
export interface ProductionNutrition {
  calories: number; // kcal
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  fiber: number; // g
  sodium: number; // mg
  perRecipe: {
    recipeId: number;
    recipeName: string;
    nutrition: NutritionData;
  }[];
}

export function calculateProductionNutrition(
  selections: ProductionRecipeSelection[],
  recipes: RecipeWithIngredients[],
): ProductionNutrition | null {
  if (
    !recipes.some((r) =>
      r.ingredients.some((i) => i.ingredient.calories !== null),
    )
  ) {
    return null; // Sin datos nutricionales
  }

  const totals: NutritionData = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sodium: 0,
  };
  const perRecipe: ProductionNutrition["perRecipe"] = [];

  for (let i = 0; i < selections.length; i++) {
    const recipe = recipes[i];
    if (!recipe) continue;

    const batches = selections[i].batches;
    const nutrition = calculateRecipeNutrition(recipe.ingredients, batches);

    perRecipe.push({
      recipeId: recipe.id,
      recipeName: recipe.name,
      nutrition,
    });

    totals.calories += nutrition.calories;
    totals.protein += nutrition.protein;
    totals.carbs += nutrition.carbs;
    totals.fat += nutrition.fat;
    totals.fiber += nutrition.fiber;
    totals.sodium += nutrition.sodium;
  }

  return { ...totals, perRecipe };
}
```

---

## 3. Componente de tabla nutricional

### 3.1 Nueva sección en resultados

Tabla estilo etiqueta nutricional con diseño regulatorio:

```astro
---
import { Icon } from "astro-icon/components";

const nutrition = Astro.props.nutrition; // ProductionNutrition
---

<div
  class="production-sheet border-border bg-card max-w-md rounded-2xl border shadow-sm"
>
  <div class="border-b px-6 py-4">
    <h2 class="text-foreground flex items-center gap-2 text-lg font-bold">
      <Icon name="lucide:apple" size={20} class="text-accent-600" />
      Información nutricional
    </h2>
    <p class="text-muted-foreground mt-0.5 text-sm">
      Totales para toda la producción
    </p>
  </div>

  <div class="divide-y px-6 py-4 text-sm">
    <!-- Header estilo etiqueta -->
    <div class="flex justify-between py-1.5">
      <span class="text-foreground text-base font-black">Nutrition Facts</span>
    </div>

    <!-- Calorías (destacado) -->
    <div class="flex justify-between py-2">
      <span class="text-foreground font-bold">Calorías</span>
      <span class="text-foreground font-black tabular-nums">
        {Math.round(nutrition.calories).toLocaleString()} kcal
      </span>
    </div>

    <div class="py-1"></div>
    <!-- Separador grueso -->

    <!-- Macronutrientes -->
    <div class="flex justify-between py-1.5">
      <span class="text-secondary-foreground">Grasas totales</span>
      <span class="text-foreground font-bold tabular-nums"
        >{nutrition.fat.toFixed(1)} g</span
      >
    </div>
    <div class="flex justify-between py-1.5">
      <span class="text-secondary-foreground">Carbohidratos</span>
      <span class="text-foreground font-bold tabular-nums"
        >{nutrition.carbs.toFixed(1)} g</span
      >
    </div>
    <div class="flex justify-between py-1.5 indent-4">
      <span class="text-muted-foreground">Fibra</span>
      <span class="text-foreground tabular-nums"
        >{nutrition.fiber.toFixed(1)} g</span
      >
    </div>
    <div class="flex justify-between py-1.5">
      <span class="text-secondary-foreground">Proteínas</span>
      <span class="text-foreground font-bold tabular-nums"
        >{nutrition.protein.toFixed(1)} g</span
      >
    </div>

    <div class="py-1"></div>
    <!-- Separador grueso -->

    <div class="flex justify-between py-1.5">
      <span class="text-secondary-foreground">Sodio</span>
      <span class="text-foreground font-bold tabular-nums"
        >{nutrition.sodium.toFixed(0)} mg</span
      >
    </div>
  </div>

  <!-- Disclaimer -->
  <div class="bg-muted rounded-b-2xl px-6 py-3">
    <p class="text-muted-foreground text-[11px]">
      * Valores calculados a partir de los datos nutricionales de los
      ingredientes. Las cantidades reales pueden variar.
    </p>
  </div>
</div>
```

---

## 4. Desglose por receta

En el breakdown, agregar una sub-sección nutricional colapsable dentro de cada receta:

```astro
{
  recipe.nutrition && (
    <details class="mt-4">
      <summary class="text-muted-foreground cursor-pointer text-xs font-bold tracking-[0.16em] uppercase">
        Info nutricional ·{" "}
        {Math.round(recipe.nutrition.calories).toLocaleString()} kcal
      </summary>
      <div class="bg-muted mt-2 grid grid-cols-3 gap-2 rounded-xl p-3 text-xs">
        <div>
          <span class="text-muted-foreground">Grasas</span>
          <p class="text-foreground font-bold">
            {recipe.nutrition.fat.toFixed(1)} g
          </p>
        </div>
        <div>
          <span class="text-muted-foreground">Carbohidratos</span>
          <p class="text-foreground font-bold">
            {recipe.nutrition.carbs.toFixed(1)} g
          </p>
        </div>
        <div>
          <span class="text-muted-foreground">Proteínas</span>
          <p class="text-foreground font-bold">
            {recipe.nutrition.protein.toFixed(1)} g
          </p>
        </div>
        <div>
          <span class="text-muted-foreground">Fibra</span>
          <p class="text-foreground font-bold">
            {recipe.nutrition.fiber.toFixed(1)} g
          </p>
        </div>
        <div>
          <span class="text-muted-foreground">Sodio</span>
          <p class="text-foreground font-bold">
            {recipe.nutrition.sodium.toFixed(0)} mg
          </p>
        </div>
      </div>
    </details>
  )
}
```

---

## 5. Nutrición por presentación (opcional)

Si hay presentaciones configuradas, calcular el aporte nutricional por unidad de cada presentación:

```ts
const units = presentation.totalUnits;
const perUnit: NutritionData = {
  calories: totals.calories / units,
  protein: totals.protein / units,
  // ...
};
```

Mostrar en la tabla de presentaciones o como tooltip.

---

## 6. Integración en `produccion.astro`

```astro
---
import { calculateProductionNutrition } from "../lib/production-calculator";
import { hasFeature } from "../lib/subscription";

const hasNutrition = hasFeature(subscription, "nutrition_info");
const hasProductionAdvanced = hasFeature(subscription, "production_advanced");
const showNutrition = hasNutrition && hasProductionAdvanced;

let nutrition: ProductionNutrition | null = null;

if (showNutrition && results) {
  nutrition = calculateProductionNutrition(validSelections, validRecipes);
}
---

{
  showNutrition && nutrition && (
    <ProductionNutritionTable nutrition={nutrition} />
  )
}
```

---

## 7. Archivos involucrados

| Archivo                                          | Cambio                                                                     |
| ------------------------------------------------ | -------------------------------------------------------------------------- |
| `src/lib/production-calculator.ts`               | Nueva función `calculateProductionNutrition()`, tipo `ProductionNutrition` |
| `src/components/ProductionNutritionTable.astro`  | **Nuevo** — tabla nutricional consolidada                                  |
| `src/components/ProductionRecipeBreakdown.astro` | Sub-sección nutricional por receta                                         |
| `src/pages/produccion.astro`                     | Integrar cálculo y componente de nutrición                                 |

---

## 8. Verificación

- [ ] Solo usuarios con `nutrition_info` + `production_advanced` ven datos nutricionales
- [ ] Tabla nutricional muestra calorías, grasas, carbohidratos, fibra, proteínas, sodio
- [ ] Valores son la suma correcta de todos los ingredientes × batches
- [ ] Ingredientes sin datos nutricionales se omiten del cálculo (no rompen la suma)
- [ ] Si ningún ingrediente tiene datos nutricionales, la sección no se renderiza
- [ ] Cada receta en el breakdown tiene sub-sección nutricional colapsable
- [ ] Los valores coinciden con los esperados (verificar contra cálculo manual)
- [ ] Disclaimer legal visible al pie de la tabla
- [ ] La tabla nutricional es print-friendly (incluida en `production-sheet`)
