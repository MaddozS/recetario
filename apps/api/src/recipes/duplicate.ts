import type { Handler } from "hono";
import { duplicateRecipe } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";
import { requireFeature, requireRecipeCapacity, resolveSubscription } from "../entitlements";
import { shapeRecipeDetail } from "./shape";

export function recipesDuplicateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const id = Number(c.req.param("id"));
    if (!Number.isFinite(id)) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    const subscription = await resolveSubscription(session.user.id);
    await requireFeature(session.user.id, "recipe_duplicate", subscription);
    await requireRecipeCapacity(session.user.id, subscription);

    const duplicated = await duplicateRecipe(id, session.user.id);
    if (!duplicated) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }
    return c.json(shapeRecipeDetail(duplicated), 201);
  };
}
