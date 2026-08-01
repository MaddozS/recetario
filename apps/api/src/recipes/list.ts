import type { Handler } from "hono";
import { getRecipeSummaries } from "@recetario/db";
import { recipeSummarySchema } from "@recetario/types";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";

export function recipesListHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const recipes = await getRecipeSummaries(session.user.id);
    return c.json(
      recipes.map((r) =>
        recipeSummarySchema.parse({
          id: r.id,
          name: r.name,
          category: r.category ?? undefined,
          ingredientCount: r.recipeIngredients?.length ?? 0,
          updatedAt: r.updatedAt?.toISOString(),
        }),
      ),
    );
  };
}
