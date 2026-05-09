export type ProductionRecipeSelection = {
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

export type ProductionSummary = {
  totalIngredientsCost: number;
  totalOperationalCost: number;
  totalProductionCost: number;
  projectedRevenue: number;
  estimatedProfit: number;
  effectiveMargin: number;
  perRecipe: ProductionRecipeResult[];
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
  presentations: {
    id: number;
    name: string;
    totalUnits: number;
    unitCost: number;
    salePrice?: number;
    revenue: number;
  }[];
};
