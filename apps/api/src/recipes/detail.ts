import type { Handler } from 'hono';
import { getRecipe } from '@recetario/db';
import { auth } from '@recetario/auth/server';
import { ApiError } from '../errors';
import { shapeRecipeDetail } from './shape';

export function recipesDetailHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError('UNAUTHENTICATED', 'Authentication required');
    }

    const idParam = c.req.param('id');
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    const recipe = await getRecipe(id, session.user.id);
    if (!recipe) {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    return c.json(shapeRecipeDetail(recipe));
  };
}
