import type { Handler } from 'hono';
import { deleteRecipe } from '@recetario/db';
import { auth } from '@recetario/auth/server';
import { ApiError } from '../errors';

export function recipesDeleteHandler(): Handler {
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

    const result = await deleteRecipe(id, session.user.id);
    if (result.status === 'not-found') {
      throw new ApiError('NOT_FOUND', 'Recipe not found');
    }

    return c.body(null, 204);
  };
}
