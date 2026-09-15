import type { ingredientSchema } from "@recetario/types";
import type { z } from "zod";

/**
 * Instantánea de la página de ingredientes y sus reducers.
 *
 * Módulo puro y sin aliases: cubierto en `test/unit`. Es la garantía testeable de
 * que crear/editar/eliminar actualizan lista y contadores en sitio, sin recargar.
 */
export type IngredientRecord = z.infer<typeof ingredientSchema>;

export type IngredientsCounts = {
  recipes: number;
  ingredients: number;
};

export type IngredientsSnapshot = {
  ingredients: IngredientRecord[];
  usage: Record<string, string[]>;
  counts: IngredientsCounts;
};

export function emptyIngredientsSnapshot(): IngredientsSnapshot {
  return {
    ingredients: [],
    usage: {},
    counts: { recipes: 0, ingredients: 0 },
  };
}

export function withCreated(
  snapshot: IngredientsSnapshot,
  created: IngredientRecord,
): IngredientsSnapshot {
  return {
    ...snapshot,
    ingredients: [...snapshot.ingredients, created],
    counts: {
      ...snapshot.counts,
      ingredients: snapshot.counts.ingredients + 1,
    },
  };
}

export function withUpdated(
  snapshot: IngredientsSnapshot,
  updated: IngredientRecord,
): IngredientsSnapshot {
  return {
    ...snapshot,
    ingredients: snapshot.ingredients.map((ingredient) =>
      ingredient.id === updated.id ? updated : ingredient,
    ),
  };
}

export function withRemoved(
  snapshot: IngredientsSnapshot,
  ingredientId: number,
): IngredientsSnapshot {
  const usage = { ...snapshot.usage };
  delete usage[String(ingredientId)];

  return {
    ...snapshot,
    ingredients: snapshot.ingredients.filter(
      (ingredient) => ingredient.id !== ingredientId,
    ),
    usage,
    counts: {
      ...snapshot.counts,
      ingredients: Math.max(0, snapshot.counts.ingredients - 1),
    },
  };
}
