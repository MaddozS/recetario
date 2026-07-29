import type { Handler } from "hono";
import { listRecipeSummaries } from "@recetario/db";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

export function recipesListHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }

      const recipes = await listRecipeSummaries(session.user.id, prisma);
      return c.json(recipes);
    });
}
