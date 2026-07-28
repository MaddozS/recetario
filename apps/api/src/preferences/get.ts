import type { Handler } from "hono";
import { getUserPreferences } from "@recetario/db";
import { preferencesResponseSchema } from "@recetario/types";
import * as cache from "../cache.js";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

const CACHE_TTL_MS = 60_000;
const DEFAULT_THEME = "system" as const;
const DEFAULT_ACCENT = "coral" as const;

function cacheKey(userId: string): string {
  return `prefs:${userId}`;
}

export function preferencesGetHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session?.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }
      const userId = session.user.id;

      const cached = cache.get<unknown>(cacheKey(userId));
      if (cached !== undefined) {
        return c.json(cached);
      }

      const existing = await getUserPreferences(userId, prisma);
      const data =
        existing ??
        (await prisma.userPreferences.create({
          data: {
            userId,
            theme: DEFAULT_THEME,
            accentColor: DEFAULT_ACCENT,
          },
        }));

      const validated = preferencesResponseSchema.parse({
        userId: data.userId,
        theme: data.theme,
        accentColor: data.accentColor,
      });

      cache.set(cacheKey(userId), validated, CACHE_TTL_MS);
      return c.json(validated);
    });
}
