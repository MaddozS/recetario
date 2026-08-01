export type Ingredient = {
  id: number;
  name: string;
  unit: string;
  price: number;
  purchaseQuantity: number;
  brand?: string;
  supplier?: string;
};

export type RecipeIngredient = {
  ingredientId: number;
  quantity: number;
  unit: string;
  comment?: string;
};

export type RecipeIngredientWithData = RecipeIngredient & {
  ingredient: Ingredient;
};

export type FixedCostType = 'PERCENTAGE' | 'AMOUNT';

export type FixedCostBase = 'PER_BATCH' | 'PER_UNIT' | 'PER_HOUR';

export type FixedCostLine = {
  id: number;
  name: string;
  type: FixedCostType;
  base: FixedCostBase;
  value: number;
  hours?: number;
};

export type RecipeFixedCost = FixedCostLine & {
  recipeId: number;
};

export type PresentationFixedCost = Omit<FixedCostLine, "hours"> & {
  presentationId: number;
};

export type FixedCostInput = {
  name: string;
  type: FixedCostType;
  base: FixedCostBase;
  value: number;
  hours?: number | null;
};

export type RecipePresentation = {
  id: number;
  name: string;
  unitsPerBatch: number;
  salePrice: number | null;
  fixedCosts: PresentationFixedCost[] | null;
};

export type RecipeWithIngredients = {
  id: number;
  name: string;
  category?: string;
  instructions?: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  updatedAt?: string;
  ingredients: RecipeIngredientWithData[];
  presentations: RecipePresentation[];
  recipeFixedCosts: RecipeFixedCost[];
};

export type RecipeSummary = {
  id: number;
  name: string;
  category?: string;
  ingredientCount: number;
  updatedAt?: string;
};

export type CreateIngredientInput = {
  name: string;
  unit: string;
  price: number;
  purchaseQuantity?: number;
  brand?: string;
  supplier?: string;
};

export type UpdateIngredientInput = {
  name?: string;
  unit?: string;
  price?: number;
  purchaseQuantity?: number;
  brand?: string | null;
  supplier?: string | null;
};

export type CreatePresentationInput = {
  name: string;
  unitsPerBatch: number;
  salePrice?: number;
  fixedCosts?: FixedCostInput[];
};

export type DeleteIngredientResult =
  | { status: "deleted" }
  | { status: "not-found" }
  | {
      status: "blocked";
      recipes: Array<{ id: number; name: string }>;
    };

export type DeletePresentationResult =
  | { status: "deleted" }
  | { status: "not-found" };

export type DeleteRecipeResult =
  | { status: "deleted" }
  | { status: "not-found" };

export type UserPreferences = {
  userId: string;
  theme: "system" | "light" | "dark";
  accentColor:
    | "indigo"
    | "violet"
    | "blue"
    | "emerald"
    | "rose"
    | "amber"
    | "coral";
};

export type CreateRecipeInput = {
  name?: string;
  category?: string | null;
  desiredMargin?: number;
  fixedCostsPercentage?: number;
  recipeFixedCosts?: FixedCostInput[];
};

export type UpdateRecipeInput = {
  name: string;
  category?: string | null;
  instructions?: string;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: {
    ingredientId: number;
    quantity: number;
    unit: string;
    comment: string | null;
  }[];
  recipeFixedCosts?: FixedCostInput[];
};
