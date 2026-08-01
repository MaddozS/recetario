import type { Handler } from "hono";
import { getIngredient, getIngredientUsageRecipes } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";
import { ingredientUsageResponseSchema } from "@recetario/types";

export function ingredientsUsageHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) {
      throw new ApiError("NOT_FOUND", "Ingredient not found");
    }

    const ownerId = session.user.id;

    const ingredient = await getIngredient(id, ownerId);
    if (!ingredient) {
      throw new ApiError("NOT_FOUND", "Ingredient not found");
    }

    const recipes = await getIngredientUsageRecipes(id, ownerId);

    const shaped = recipes.map((r) => ({
      id: r.id,
      name: r.name,
    }));

    return c.json(ingredientUsageResponseSchema.parse({ recipes: shaped }));
  };
}
