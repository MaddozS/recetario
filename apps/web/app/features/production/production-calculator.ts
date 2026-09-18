import type {
  ConsolidatedIngredient,
  ProductionRecipeRecord,
  ProductionRecipeResult,
  ProductionSelection,
  ProductionSummary,
} from "./production-types";

/**
 * Cálculo del planificador de producción: consolida los insumos de todas las
 * recetas seleccionadas, escala por mezclas y proyecta costos e ingresos.
 *
 * Puerto de `src/lib/production-calculator.ts` del árbol Astro con la misma
 * fórmula; la única diferencia es que las recetas se cruzan por **id** y no por
 * posición. Módulo puro: cubierto en `test/unit`.
 */

/** Redondeo contable half-up (el que usaba el baseline). */
function roundHalfUp(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

/** g/ml se redondean a entero; el resto conserva decimales. */
function aplicarRedondeoUnidadPequena(
  cantidad: number,
  unidad: string,
): number {
  const u = unidad.toLowerCase();
  if (u === "g" || u === "ml") {
    return roundHalfUp(cantidad);
  }
  return cantidad;
}

function ingredientUnitCost(price: number, purchaseQuantity: number): number {
  if (!purchaseQuantity || purchaseQuantity <= 0) return 0;
  return price / purchaseQuantity;
}

function calcularCantidadAjustada(
  quantity: number,
  recipeUnit: string,
  ingredientUnit: string,
  batches: number,
): number {
  let cantidad = aplicarRedondeoUnidadPequena(quantity * batches, recipeUnit);
  const unidadInsumo = ingredientUnit.toLowerCase();
  const unidadReceta = recipeUnit.toLowerCase();

  // Conversión: si el insumo se compra en kg/lt y la receta usa g/ml.
  if (
    (unidadInsumo === "kg" || unidadInsumo === "lt") &&
    (unidadReceta === "g" || unidadReceta === "ml")
  ) {
    cantidad = cantidad / 1000;
  }

  return cantidad;
}

/** Margen de una presentación (`null` sin ingresos o sin costo). */
export function presentationMargin(
  revenue: number,
  totalCost: number,
): number | null {
  if (!(revenue > 0) || !(totalCost > 0)) return null;
  return ((revenue - totalCost) / revenue) * 100;
}

/**
 * Presentación más rentable de una receta: la de mayor margen con ingresos.
 * Devuelve `null` cuando ninguna presentación genera ingresos.
 */
export function bestPresentationId(
  recipe: ProductionRecipeResult,
): number | null {
  let bestId: number | null = null;
  let bestMargin = Number.NEGATIVE_INFINITY;

  for (const presentation of recipe.presentations) {
    const margin = presentationMargin(presentation.revenue, recipe.totalCost);
    if (margin === null) continue;
    if (margin > bestMargin) {
      bestMargin = margin;
      bestId = presentation.id;
    }
  }

  return bestId;
}

export function calculateProduction(
  selections: ReadonlyArray<ProductionSelection>,
  recipes: ReadonlyArray<ProductionRecipeRecord>,
): {
  consolidatedIngredients: ConsolidatedIngredient[];
  summary: ProductionSummary;
} {
  const recipeById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const ingredientMap = new Map<number, ConsolidatedIngredient>();
  const perRecipe: ProductionRecipeResult[] = [];

  let totalIngredientsCost = 0;
  let totalOperationalCost = 0;
  let totalRevenue = 0;

  for (const selection of selections) {
    const recipe = recipeById.get(selection.recipeId);
    if (!recipe) continue;

    const batches = selection.batches;
    if (!Number.isFinite(batches) || batches <= 0) continue;

    let recipeIngredientCost = 0;
    let recipeWeightGrams = 0;
    let recipeVolumeMl = 0;

    for (const row of recipe.ingredients) {
      if (!row.quantity || row.quantity <= 0) continue;

      const unitCost = ingredientUnitCost(
        row.ingredient.price,
        row.ingredient.purchaseQuantity,
      );

      const adjustedQuantity = calcularCantidadAjustada(
        row.quantity,
        row.unit,
        row.ingredient.unit,
        batches,
      );
      const cost = unitCost * adjustedQuantity;
      recipeIngredientCost += cost;

      const unit = row.unit.toLowerCase();
      const rawQuantity = row.quantity * batches;
      if (unit === "g") recipeWeightGrams += rawQuantity;
      else if (unit === "kg") recipeWeightGrams += rawQuantity * 1000;
      else if (unit === "ml") recipeVolumeMl += rawQuantity;
      else if (unit === "lt") recipeVolumeMl += rawQuantity * 1000;

      const existing = ingredientMap.get(row.ingredientId);
      if (existing) {
        existing.totalQuantity += adjustedQuantity;
        existing.totalCost += cost;
        existing.sourceRecipes.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          quantity: adjustedQuantity,
        });
      } else {
        ingredientMap.set(row.ingredientId, {
          ingredientId: row.ingredientId,
          name: row.ingredient.name,
          brand: row.ingredient.brand,
          supplier: row.ingredient.supplier,
          totalQuantity: adjustedQuantity,
          unit: row.ingredient.unit,
          unitCost,
          totalCost: cost,
          sourceRecipes: [
            {
              recipeId: recipe.id,
              recipeName: recipe.name,
              quantity: adjustedQuantity,
            },
          ],
        });
      }
    }

    const recipeOperationalCost =
      recipeIngredientCost * (recipe.fixedCostsPercentage / 100);
    const recipeTotalCost = recipeIngredientCost + recipeOperationalCost;

    if (recipe.presentations.length > 0) {
      let recipeRevenue: number;
      let selectedPresentationId: number;
      const suggestedBatchPrice =
        recipeTotalCost > 0 && recipe.desiredMargin > 0
          ? recipeTotalCost / (1 - recipe.desiredMargin / 100)
          : 0;
      const candidatePresentations = recipe.presentations.map(
        (presentation) => {
          const totalUnits = presentation.unitsPerBatch * batches;
          const unitCost =
            recipeTotalCost > 0
              ? recipeTotalCost / (presentation.unitsPerBatch * batches)
              : 0;
          const salePrice =
            presentation.salePrice ??
            (suggestedBatchPrice > 0
              ? suggestedBatchPrice / (presentation.unitsPerBatch * batches)
              : undefined);
          const revenue = salePrice ? salePrice * totalUnits : 0;
          return {
            id: presentation.id,
            name: presentation.name,
            totalUnits,
            unitCost,
            salePrice,
            revenue,
          };
        },
      );

      // Sin elección explícita se proyecta la presentación más rentable, igual
      // que el baseline.
      const chosen = selection.presentationId
        ? candidatePresentations.find(
            (candidate) => candidate.id === selection.presentationId,
          )
        : undefined;

      if (chosen) {
        selectedPresentationId = chosen.id;
        recipeRevenue = chosen.revenue;
      } else {
        const best = candidatePresentations.reduce((best, candidate) =>
          candidate.revenue > best.revenue ? candidate : best,
        );
        selectedPresentationId = best.id;
        recipeRevenue = best.revenue;
      }

      totalIngredientsCost += recipeIngredientCost;
      totalOperationalCost += recipeOperationalCost;
      totalRevenue += recipeRevenue;

      perRecipe.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        category: recipe.category,
        batches,
        ingredientsCost: recipeIngredientCost,
        operationalCost: recipeOperationalCost,
        totalCost: recipeTotalCost,
        selectedPresentationId,
        totalWeightGrams: recipeWeightGrams > 0 ? recipeWeightGrams : undefined,
        totalVolumeMl: recipeVolumeMl > 0 ? recipeVolumeMl : undefined,
        presentations: candidatePresentations,
      });
    } else {
      totalIngredientsCost += recipeIngredientCost;
      totalOperationalCost += recipeOperationalCost;

      perRecipe.push({
        recipeId: recipe.id,
        recipeName: recipe.name,
        category: recipe.category,
        batches,
        ingredientsCost: recipeIngredientCost,
        operationalCost: recipeOperationalCost,
        totalCost: recipeTotalCost,
        totalWeightGrams: recipeWeightGrams > 0 ? recipeWeightGrams : undefined,
        totalVolumeMl: recipeVolumeMl > 0 ? recipeVolumeMl : undefined,
        presentations: [],
      });
    }
  }

  const totalProductionCost = totalIngredientsCost + totalOperationalCost;
  const estimatedProfit = totalRevenue - totalProductionCost;
  const effectiveMargin =
    totalRevenue > 0 ? (estimatedProfit / totalRevenue) * 100 : 0;

  return {
    consolidatedIngredients: Array.from(ingredientMap.values()),
    summary: {
      totalIngredientsCost,
      totalOperationalCost,
      totalProductionCost,
      projectedRevenue: totalRevenue,
      estimatedProfit,
      effectiveMargin,
      perRecipe,
    },
  };
}
