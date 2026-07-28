import type { Handler } from "hono";
import { ApiError } from "../errors.js";
import { ingredientUsageMapSchema } from "@recetario/types";
import { withFreshDb } from "../fresh-db.js";

export function ingredientsUsageBulkHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const rows = await prisma.recipeIngredient.findMany({
        where: { recipe: { ownerId: session.user.id } },
        select: {
          ingredientId: true,
          recipe: { select: { name: true } },
        },
      });

      const usage: Record<string, string[]> = {};
      for (const row of rows) {
        const list = usage[String(row.ingredientId)] ?? (usage[String(row.ingredientId)] = []);
        list.push(row.recipe.name);
      }

      return c.json(ingredientUsageMapSchema.parse(usage));
    });
}
