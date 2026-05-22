import type {
  ProductionRecipeSelection,
  ConsolidatedIngredient,
  ProductionSummary,
  ProductionRecipeResult,
} from "@/lib/production-types";
import type { RecipeWithIngredients } from "@/lib/db/types";

function roundHalfUp(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

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

  if (
    (unidadInsumo === "kg" || unidadInsumo === "lt") &&
    (unidadReceta === "g" || unidadReceta === "ml")
  ) {
    cantidad = cantidad / 1000;
  }

  return cantidad;
}

export function calculateProduction(
  selections: ProductionRecipeSelection[],
  recipes: RecipeWithIngredients[],
): {
  consolidatedIngredients: ConsolidatedIngredient[];
  summary: ProductionSummary;
} {
  const ingredientMap = new Map<number, ConsolidatedIngredient>();
  const perRecipe: ProductionRecipeResult[] = [];

  let totalIngredientsCost = 0;
  let totalOperationalCost = 0;
  let totalRevenue = 0;

  for (let i = 0; i < selections.length; i++) {
    const selection = selections[i];
    const recipe = recipes[i];
    if (!recipe) continue;

    const batches = selection.batches;
    if (!Number.isFinite(batches) || batches <= 0) continue;

    let recipeIngredientCost = 0;
    let recipeWeightGrams = 0;
    let recipeVolumeMl = 0;

    for (const ri of recipe.ingredients) {
      if (!ri.quantity || ri.quantity <= 0) continue;

      const unitCost = ingredientUnitCost(
        ri.ingredient.price,
        ri.ingredient.purchaseQuantity,
      );

      const adjustedQuantity = calcularCantidadAjustada(
        ri.quantity,
        ri.unit,
        ri.ingredient.unit,
        batches,
      );
      const cost = unitCost * adjustedQuantity;
      recipeIngredientCost += cost;

      const u = ri.unit.toLowerCase();
      const rawQty = ri.quantity * batches;
      if (u === "g") recipeWeightGrams += rawQty;
      else if (u === "kg") recipeWeightGrams += rawQty * 1000;
      else if (u === "ml") recipeVolumeMl += rawQty;
      else if (u === "lt") recipeVolumeMl += rawQty * 1000;

      const existing = ingredientMap.get(ri.ingredientId);
      if (existing) {
        existing.totalQuantity += adjustedQuantity;
        existing.totalCost += cost;
        existing.sourceRecipes.push({
          recipeId: recipe.id,
          recipeName: recipe.name,
          quantity: adjustedQuantity,
        });
      } else {
        ingredientMap.set(ri.ingredientId, {
          ingredientId: ri.ingredientId,
          name: ri.ingredient.name,
          brand: ri.ingredient.brand,
          supplier: ri.ingredient.supplier,
          totalQuantity: adjustedQuantity,
          unit: ri.ingredient.unit,
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

    let recipeRevenue = 0;
    let selectedPresentationId: number | undefined;

    if (recipe.presentations.length > 0) {
      const suggestedBatchPrice =
        recipeTotalCost > 0 && recipe.desiredMargin > 0
          ? recipeTotalCost / (1 - recipe.desiredMargin / 100)
          : 0;
      const candidatePresentations = recipe.presentations.map((p) => {
        const totalUnits = p.unitsPerBatch * batches;
        const unitCost =
          recipeTotalCost > 0
            ? recipeTotalCost / (p.unitsPerBatch * batches)
            : 0;
        const salePrice =
          p.salePrice ??
          (suggestedBatchPrice > 0
            ? suggestedBatchPrice / (p.unitsPerBatch * batches)
            : undefined);
        const revenue = salePrice ? salePrice * totalUnits : 0;
        return {
          id: p.id,
          name: p.name,
          totalUnits,
          unitCost,
          salePrice,
          revenue,
        };
      });

      const chosenPresentationId = selection.presentationId;
      if (chosenPresentationId) {
        const found = candidatePresentations.find(
          (cp) => cp.id === chosenPresentationId,
        );
        if (found) {
          selectedPresentationId = found.id;
          recipeRevenue = found.revenue;
        }
      }

      if (selectedPresentationId === undefined) {
        const best = candidatePresentations.reduce(
          (best, p) => (p.revenue > best.revenue ? p : best),
          candidatePresentations[0],
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
