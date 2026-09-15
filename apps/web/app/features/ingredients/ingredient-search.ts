/**
 * Búsqueda accent y case-insensitive de la lista de ingredientes.
 *
 * Módulo puro: cubierto en `test/unit`. La normalización NFD (quitar
 * diacríticos) vive en `shared/utils/search.ts`: "platano" encuentra "Plátano".
 */
import { normalizeSearchText } from "#shared/utils/search";

export { normalizeSearchText };

export type IngredientSearchSource = {
  name: string;
  supplier?: string | null;
  brand?: string | null;
};

export function matchesIngredientSearch(
  ingredient: IngredientSearchSource,
  query: string,
): boolean {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return true;

  const haystack = normalizeSearchText(
    [ingredient.name, ingredient.supplier ?? "", ingredient.brand ?? ""].join(
      " ",
    ),
  );

  return haystack.includes(normalizedQuery);
}

export function filterIngredients<T extends IngredientSearchSource>(
  ingredients: readonly T[],
  query: string,
): T[] {
  const normalizedQuery = normalizeSearchText(query);
  if (!normalizedQuery) return [...ingredients];

  return ingredients.filter((ingredient) =>
    matchesIngredientSearch(ingredient, normalizedQuery),
  );
}
