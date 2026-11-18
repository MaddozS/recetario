import { ingredientSchema, recipeWithIngredientsSchema } from '@recetario/types';
import { z } from 'zod';
import { ApiError } from '~/utils/api-error';
import type { IngredientRecord, RecipeDetailRecord } from './recipe-detail-form';

/**
 * Carga del detalle de receta, compartida por la página (a través de
 * `useRecipeDetail`) y por el middleware de migas (`recipe-breadcrumb`): misma
 * clave de `useAsyncData`, así que el SSR resuelve una sola petición.
 */
export type RecipeDetailPageData =
  | {
      status: 'ready';
      recipe: RecipeDetailRecord;
      ingredients: IngredientRecord[];
    }
  // Todavía sin dato: es el valor inicial de `useAsyncData` con `lazy`, así la
  // página distingue «cargando» de «falló».
  | { status: 'idle' }
  | { status: 'notFound' }
  | { status: 'failed' };

export function recipeDetailKey(recipeId: string): string {
  return `recipe:${recipeId}`;
}

export async function fetchRecipeDetailPage(
  api: ReturnType<typeof useApi>,
  recipeId: string
): Promise<RecipeDetailPageData> {
  try {
    const [recipe, ingredients] = await Promise.all([
      api<RecipeDetailRecord>(`/api/recipes/${recipeId}`, {
        schema: recipeWithIngredientsSchema,
      }),
      api<IngredientRecord[]>('/api/ingredients', {
        schema: z.array(ingredientSchema),
      }),
    ]);

    return { status: 'ready', recipe, ingredients };
  } catch (cause) {
    if (cause instanceof ApiError && cause.status === 404) {
      return { status: 'notFound' };
    }

    console.error('[recipe-detail] no se pudo cargar la receta', cause);
    return { status: 'failed' };
  }
}
