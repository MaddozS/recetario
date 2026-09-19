import { normalizeSearchText } from "#shared/utils/search";
import type { ProductionCatalogRecipe } from "./production-types";

/**
 * Agrupado y filtrado del selector de recetas.
 *
 * Puerto del `<ProductionRecipeSelector>` del baseline: grupos por categoría en
 * orden de aparición (alfabético `es` dentro de cada grupo), leyenda sólo si
 * alguna receta tiene categoría, y búsqueda accent-insensitive que **siempre
 * deja visibles las seleccionadas** aunque no coincidan. Módulo puro: cubierto
 * en `test/unit`.
 */
export type ProductionRecipeGroup = {
  /** `null` cuando ninguna receta tiene categoría: lista única sin leyenda. */
  label: string | null;
  recipes: ProductionCatalogRecipe[];
};

export function groupRecipes(recipes: ReadonlyArray<ProductionCatalogRecipe>): {
  groups: ProductionRecipeGroup[];
  hasCategories: boolean;
} {
  const hasCategories = recipes.some((recipe) => Boolean(recipe.category));

  const byCategory = new Map<string, ProductionCatalogRecipe[]>();
  for (const recipe of recipes) {
    const key = recipe.category || "Sin categoría";
    const group = byCategory.get(key);
    if (group) group.push(recipe);
    else byCategory.set(key, [recipe]);
  }

  for (const group of byCategory.values()) {
    group.sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  const groups = [...byCategory.entries()].map(([key, group]) => ({
    label: hasCategories ? key : null,
    recipes: group,
  }));

  return { groups, hasCategories };
}

export function filterRecipeGroups(
  groups: ReadonlyArray<ProductionRecipeGroup>,
  query: string,
  selectedIds: ReadonlySet<number>,
): { groups: ProductionRecipeGroup[]; visibleCount: number } {
  const normalized = normalizeSearchText(query);
  let visibleCount = 0;

  const filtered = groups
    .map((group) => {
      const recipes = group.recipes.filter((recipe) => {
        if (!normalized) {
          visibleCount++;
          return true;
        }

        const matches =
          normalizeSearchText(recipe.name).includes(normalized) ||
          selectedIds.has(recipe.id);
        if (matches) visibleCount++;
        return matches;
      });

      return { ...group, recipes };
    })
    .filter((group) => group.recipes.length > 0);

  return { groups: filtered, visibleCount };
}
