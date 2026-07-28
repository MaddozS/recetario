import type { Handler } from "hono";
import { getRecipeById } from "@recetario/db";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

export function recipesDetailHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const idParam = c.req.param("id");
      const id = Number(idParam);
      if (!Number.isFinite(id)) {
        throw new ApiError("NOT_FOUND", "Recipe not found");
      }

      const recipe = await getRecipeById(id, session.user.id, prisma);
      if (!recipe) {
        throw new ApiError("NOT_FOUND", "Recipe not found");
      }

      return c.json(recipe);
    });
}
