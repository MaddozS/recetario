import type { Handler } from "hono";
import { getRecipesByIds } from "@recetario/db";
import * as cache from "../cache.js";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

const MAX_IDS = 100;
const CACHE_TTL_MS = 60_000;

function parseIds(raw: string | undefined): number[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isInteger(n) && n > 0);
}

function cacheKey(userId: string, ids: number[]): string {
  return `recipes-by-ids:${userId}:${[...ids].sort((a, b) => a - b).join(",")}`;
}

export function recipesByIdsHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
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

      const key = cacheKey(session.user.id, ids);
      const cached = cache.get<unknown>(key);
      if (cached !== undefined) {
        return c.json(cached);
      }

      const recipes = await getRecipesByIds(ids, session.user.id, prisma);
      cache.set(key, recipes, CACHE_TTL_MS);
      return c.json(recipes);
    });
}
