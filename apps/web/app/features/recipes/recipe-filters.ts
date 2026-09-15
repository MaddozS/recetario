/**
 * Búsqueda y filtro por categoría del listado de recetas.
 *
 * Módulo puro: cubierto en `test/unit`. La normalización NFD (quitar
 * diacríticos) vive en `shared/utils/search.ts` y es la misma que usan
 * ingredientes y el picker del detalle.
 */
import { normalizeSearchText } from "#shared/utils/search";

export { normalizeSearchText };

export type RecipeSearchSource = {
  name: string;
};

export type RecipeCategorySource = {
  category?: string | null;
};

export type RecipeFilter = {
  /** Texto libre; sólo se compara contra el nombre (paridad con Astro). */
  query: string;
  /** `null` = todas, `""` = sin categoría, otro valor = match exacto. */
  category: string | null;
};

export type RecipeCategoryOption = {
  value: string;
  label: string;
  count: number;
};

export const UNCATEGORIZED_LABEL = "Sin categoría";

export function matchesRecipeSearch(
  recipe: RecipeSearchSource,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  return normalizeSearchText(recipe.name).includes(normalizedQuery);
}

export function matchesCategory(
  recipe: RecipeCategorySource,
  category: string | null,
): boolean {
  if (category === null) return true;
  return (recipe.category ?? "") === category;
}

export function filterRecipes<
  T extends RecipeSearchSource & RecipeCategorySource,
>(recipes: readonly T[], filter: RecipeFilter): T[] {
  return recipes.filter(
    (recipe) =>
      matchesCategory(recipe, filter.category) &&
      matchesRecipeSearch(recipe, filter.query),
  );
}

/** Categorías presentes, en orden de aparición, con su conteo. */
export function recipeCategoryOptions<T extends RecipeCategorySource>(
  recipes: readonly T[],
): RecipeCategoryOption[] {
  const counts = new Map<string, number>();

  for (const recipe of recipes) {
    const category = recipe.category;
    if (!category) continue;
    counts.set(category, (counts.get(category) ?? 0) + 1);
  }

  return [...counts].map(([value, count]) => ({
    value,
    label: value,
    count,
  }));
}

export function uncategorizedCount<T extends RecipeCategorySource>(
  recipes: readonly T[],
): number {
  return recipes.filter((recipe) => !recipe.category).length;
}

/** Click sobre una pill: la activa se limpia, cualquier otra se selecciona. */
export function toggleCategory(
  current: string | null,
  clicked: string,
): string | null {
  return current === clicked ? null : clicked;
}
