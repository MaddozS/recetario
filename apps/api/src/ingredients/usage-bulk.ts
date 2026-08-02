import type { Handler } from "hono";
import { getIngredientUsage } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { ApiError } from "../errors";
import { ingredientUsageMapSchema } from "@recetario/types";

export function ingredientsUsageBulkHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const usage = await getIngredientUsage(session.user.id);

    const stringMap: Record<string, string[]> = {};
    for (const [key, value] of Object.entries(usage)) {
      stringMap[String(key)] = value;
    }

    return c.json(ingredientUsageMapSchema.parse(stringMap));
  };
}
