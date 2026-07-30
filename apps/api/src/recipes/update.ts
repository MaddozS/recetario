import type { Handler } from "hono";
import { getRecipeById, updateRecipe } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { recipeUpdateSchema } from "@recetario/types";
import { ApiError } from "../errors.js";

export function recipesUpdateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const idParam = c.req.param("id");
    const id = Number(idParam);
    if (!Number.isFinite(id)) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    let body: unknown;
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
    }

    const parsed = recipeUpdateSchema.safeParse(body);
    if (!parsed.success) {
      throw new ApiError("VALIDATION_ERROR", "Invalid recipe input");
    }

    const existing = await getRecipeById(id, session.user.id);
    if (!existing) {
      throw new ApiError("NOT_FOUND", "Recipe not found");
    }

    const updateInput = {
      ...parsed.data,
      ingredients: parsed.data.ingredients.map((ing) => ({
        ingredientId: ing.ingredientId,
        quantity: ing.quantity,
        unit: ing.unit,
        comment: ing.comment ?? null,
      })),
    };

    await updateRecipe(id, updateInput, session.user.id);

    const updated = await getRecipeById(id, session.user.id);
    return c.json(updated);
  };
}
