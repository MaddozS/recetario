import type { recipeSummarySchema } from "@recetario/types";
import type { z } from "zod";

/**
 * Instantánea del listado de recetas y sus reducers.
 *
 * Módulo puro y sin aliases: cubierto en `test/unit`. Es la garantía testeable de
 * que crear, duplicar y eliminar actualizan la lista y las métricas en sitio,
 * sin recargar la página.
 *
 * El tipo se deriva del schema del API (`recipeSummarySchema`) para no duplicar
 * el contrato, igual que `IngredientRecord` en la Task 7.
 */
export type RecipeRecord = z.infer<typeof recipeSummarySchema>;

export type RecipesSnapshot = {
  recipes: RecipeRecord[];
  /** Ingredientes distintos usados en recetas (`/api/ingredients/usage`). */
  usedIngredientCount: number;
};

export function emptyRecipesSnapshot(): RecipesSnapshot {
  return { recipes: [], usedIngredientCount: 0 };
}

export function withCreated(
  snapshot: RecipesSnapshot,
  created: RecipeRecord,
): RecipesSnapshot {
  return { ...snapshot, recipes: [...snapshot.recipes, created] };
}

export function withRemoved(
  snapshot: RecipesSnapshot,
  recipeId: number,
): RecipesSnapshot {
  return {
    ...snapshot,
    recipes: snapshot.recipes.filter((recipe) => recipe.id !== recipeId),
  };
}

/** Detalle devuelto por crear/duplicar: basta para derivar la card del listado. */
export type RecipeSummarySource = {
  id: number;
  name: string;
  category?: string;
  updatedAt?: string;
  ingredients: readonly unknown[];
};

export function toRecipeSummary(recipe: RecipeSummarySource): RecipeRecord {
  return {
    id: recipe.id,
    name: recipe.name,
    ...(recipe.category ? { category: recipe.category } : {}),
    ingredientCount: recipe.ingredients.length,
    ...(recipe.updatedAt ? { updatedAt: recipe.updatedAt } : {}),
  };
}
