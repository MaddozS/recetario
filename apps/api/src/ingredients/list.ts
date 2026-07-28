import type { Handler } from "hono";
import { listIngredients } from "@recetario/db";
import { ingredientSchema } from "@recetario/types";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

export function ingredientsListHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const ingredients = await listIngredients(session.user.id, prisma);
      return c.json(ingredients.map((i) => ingredientSchema.parse(i)));
    });
}
