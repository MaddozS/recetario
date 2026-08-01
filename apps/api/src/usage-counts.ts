import type { Handler } from "hono";
import { countUserRecipes, countUserIngredients } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { usageCountsResponseSchema } from "@recetario/types";
import { ApiError } from "./errors";

export function usageCountsHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }
    const ownerId = session.user.id;

    const [recipes, ingredients] = await Promise.all([
      countUserRecipes(ownerId),
      countUserIngredients(ownerId),
    ]);

    return c.json(usageCountsResponseSchema.parse({ recipes, ingredients }));
  };
}
