import type { Handler } from "hono";
import { usageCountsResponseSchema } from "@recetario/types";
import { ApiError } from "./errors.js";
import { withFreshDb } from "./fresh-db.js";

export function usageCountsHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }
      const ownerId = session.user.id;

      const [recipes, ingredients] = await Promise.all([
        prisma.recipe.count({ where: { ownerId } }),
        prisma.ingredient.count({ where: { ownerId } }),
      ]);

      return c.json(usageCountsResponseSchema.parse({ recipes, ingredients }));
    });
}
