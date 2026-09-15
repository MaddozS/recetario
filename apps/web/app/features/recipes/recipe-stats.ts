/**
 * Métricas y rail de recientes del listado de recetas.
 *
 * Módulo puro y sin aliases: cubierto en `test/unit`. Todo se deriva de la
 * instantánea, así que crear/eliminar actualizan las métricas sin recargar.
 */
export type RecipeStatsSource = {
  category?: string | null;
  ingredientCount: number;
  updatedAt?: string | null;
};

export type RecipeStats = {
  recipeCount: number;
  categoryCount: number;
  /** Ingredientes distintos usados en recetas (viene del mapa de uso). */
  ingredientCount: number;
  incompleteCount: number;
  withoutCategoryCount: number;
  lastUpdatedAt: string | null;
};

export function recipeStats<T extends RecipeStatsSource>(
  recipes: readonly T[],
  usedIngredientCount: number,
): RecipeStats {
  const categories = new Set<string>();

  for (const recipe of recipes) {
    if (recipe.category) categories.add(recipe.category);
  }

  return {
    recipeCount: recipes.length,
    categoryCount: categories.size,
    ingredientCount: usedIngredientCount,
    incompleteCount: recipes.filter((recipe) => recipe.ingredientCount === 0)
      .length,
    withoutCategoryCount: recipes.filter((recipe) => !recipe.category).length,
    lastUpdatedAt: lastUpdatedAt(recipes),
  };
}

/** ISO más reciente de la lista (comparación lexicográfica, como Astro). */
export function lastUpdatedAt(
  recipes: readonly RecipeStatsSource[],
): string | null {
  return recipes.reduce<string | null>((latest, recipe) => {
    const value = recipe.updatedAt;
    if (!value) return latest;
    return !latest || value > latest ? value : latest;
  }, null);
}

/** Las últimas `limit` recetas actualizadas; las que no tienen fecha no entran. */
export function recentRecipes<T extends RecipeStatsSource>(
  recipes: readonly T[],
  limit = 5,
): T[] {
  return recipes
    .filter(
      (recipe): recipe is T & { updatedAt: string } =>
        typeof recipe.updatedAt === "string" && recipe.updatedAt.length > 0,
    )
    .sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    )
    .slice(0, limit);
}
