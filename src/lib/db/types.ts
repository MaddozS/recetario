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

export type RecipePresentation = {
  id: number;
  name: string;
  unitsPerBatch: number;
  salePrice?: number;
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
  theme: "light" | "dark";
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
};
