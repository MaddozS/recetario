import type { Handler } from 'hono';
import { getRecipeSummaries } from '@recetario/db';
import { recipeSummarySchema } from '@recetario/types';
import { getAuthUser } from '../middleware/auth';

export function recipesListHandler(): Handler {
  return async (c) => {
    const user = await getAuthUser(c);

    const recipes = await getRecipeSummaries(user.id);
    return c.json(
      recipes.map((r) =>
        recipeSummarySchema.parse({
          id: r.id,
          name: r.name,
          category: r.category ?? undefined,
          ingredientCount: r.recipeIngredients?.length ?? 0,
          updatedAt: r.updatedAt?.toISOString(),
        })
      )
    );
  };
}
