import type {
  recipeSummarySchema,
  recipeWithIngredientsSchema,
} from "@recetario/types";
import type { z } from "zod";

/**
 * Tipos del planificador de producción.
 *
 * Puerto del `production-types.ts` del baseline. Los registros del
 * API se derivan de los schemas (`@recetario/types`) para no duplicar el
 * contrato.
 */
export type ProductionCatalogRecipe = z.infer<typeof recipeSummarySchema>;
export type ProductionRecipeRecord = z.infer<
  typeof recipeWithIngredientsSchema
>;

/** Elección de una receta dentro del plan: mezclas y presentación opcional. */
export type ProductionSelection = {
  recipeId: number;
  batches: number;
  presentationId?: number;
};

export type ConsolidatedIngredient = {
  ingredientId: number;
  name: string;
  brand?: string;
  supplier?: string;
  totalQuantity: number;
  unit: string;
  unitCost: number;
  totalCost: number;
  sourceRecipes: { recipeId: number; recipeName: string; quantity: number }[];
};

export type ProductionRecipeResult = {
  recipeId: number;
  recipeName: string;
  category?: string;
  batches: number;
  ingredientsCost: number;
  operationalCost: number;
  totalCost: number;
  selectedPresentationId?: number;
  totalWeightGrams?: number;
  totalVolumeMl?: number;
  presentations: {
    id: number;
    name: string;
    totalUnits: number;
    unitCost: number;
    salePrice?: number;
    revenue: number;
  }[];
};

export type ProductionSummary = {
  totalIngredientsCost: number;
  totalOperationalCost: number;
  totalProductionCost: number;
  projectedRevenue: number;
  estimatedProfit: number;
  effectiveMargin: number;
  perRecipe: ProductionRecipeResult[];
};
