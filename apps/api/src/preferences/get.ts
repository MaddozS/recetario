import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { getUserPreferences, createUserPreferences } from "@recetario/db";
import { preferencesResponseSchema } from "@recetario/types";
import * as cache from "../cache";
import { ApiError } from "../errors";

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

    const existing = await getUserPreferences(userId);
    const data =
      existing ??
      (await createUserPreferences(userId, {
        theme: DEFAULT_THEME,
        accentColor: DEFAULT_ACCENT,
      }));

    const validated = preferencesResponseSchema.parse({
      userId: data.userId,
      theme: data.theme,
      accentColor: data.accentColor,
    });

    cache.set(cacheKey(userId), validated, CACHE_TTL_MS);
    return c.json(validated);
  };
}
