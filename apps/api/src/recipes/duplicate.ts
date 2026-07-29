import type { Handler } from "hono";
import { duplicateRecipe } from "@recetario/db";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

export function recipesDuplicateHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const id = Number(c.req.param("id"));
      if (!Number.isFinite(id)) {
        throw new ApiError("NOT_FOUND", "Recipe not found");
      }

      const duplicated = await duplicateRecipe(id, session.user.id, prisma);
      if (!duplicated) {
        throw new ApiError("NOT_FOUND", "Recipe not found");
      }
      return c.json(duplicated, 201);
    });
}
