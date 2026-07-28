import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { getRecipesByIds } from "@recetario/db";
import { ApiError } from "../errors.js";

const MAX_IDS = 100;

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

export function recipesByIdsHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const ids = parseIds(c.req.query("ids"));
    if (ids.length === 0) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "ids query parameter must contain at least one positive integer",
      );
    }
    if (ids.length > MAX_IDS) {
      throw new ApiError(
        "VALIDATION_ERROR",
        `ids query parameter cannot contain more than ${MAX_IDS} ids`,
      );
    }

    const recipes = await getRecipesByIds(ids, session.user.id);
    return c.json(recipes);
  };
}
