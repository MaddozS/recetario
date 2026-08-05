import type { Handler } from "hono";
import { deleteIngredient } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";

export function ingredientsDeleteHandler(): Handler {
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
    const result = await deleteIngredient(id, ownerId);
    if (result.status === "not-found") {
      throw new ApiError("NOT_FOUND", "Ingredient not found");
    }
    if (result.status === "blocked") {
      return c.json(
        {
          error: {
            code: "DOMAIN_ERROR",
            message: "Ingredient is in use by existing recipes",
            reason: "ingredient_in_use",
          },
          recipes: result.recipes,
        },
        409 as never,
      );
    }

    return c.body(null, 204 as never);
  };
}
