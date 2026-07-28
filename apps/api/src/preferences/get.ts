import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { prisma } from "@recetario/db";
import { preferencesResponseSchema } from "@recetario/types";
import * as cache from "../cache.js";
import { ApiError } from "../errors.js";

const CACHE_TTL_MS = 60_000;
const DEFAULT_THEME = "system" as const;
const DEFAULT_ACCENT = "coral" as const;

function cacheKey(userId: string): string {
  return `prefs:${userId}`;
}

export function preferencesGetHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }
    const userId = session.user.id;

    const cached = cache.get<unknown>(cacheKey(userId));
    if (cached !== undefined) {
      return c.json(cached);
    }

    let data = await prisma.userPreferences.findUnique({ where: { userId } });
    if (!data) {
      data = await prisma.userPreferences.create({
        data: {
          userId,
          theme: DEFAULT_THEME,
          accentColor: DEFAULT_ACCENT,
        },
      });
    }

    const validated = preferencesResponseSchema.parse({
      userId: data.userId,
      theme: data.theme,
      accentColor: data.accentColor,
    });

    cache.set(cacheKey(userId), validated, CACHE_TTL_MS);
    return c.json(validated);
  };
}
