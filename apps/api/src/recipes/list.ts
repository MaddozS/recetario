import type { Handler } from "hono";
import { listRecipeSummaries } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";

export function recipesListHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const recipes = await listRecipeSummaries(session.user.id);
    return c.json(recipes);
  };
}
