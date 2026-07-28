import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { prisma } from "@recetario/db";
import { preferencesResponseSchema, preferencesUpdateSchema } from "@recetario/types";
import * as cache from "../cache.js";
import { ApiError } from "../errors.js";

const CACHE_TTL_MS = 60_000;

export function preferencesUpdateHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }
    const userId = session.user.id;

    let raw: unknown;
    try {
      raw = await c.req.json();
    } catch {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Request body must be valid JSON",
          },
        },
        400,
      );
    }

    const parsed = preferencesUpdateSchema.safeParse(raw);
    if (!parsed.success) {
      return c.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid preferences payload",
            issues: parsed.error.issues,
          },
        },
        400,
      );
    }

    const existing = await prisma.userPreferences.findUnique({ where: { userId } });
    const theme = parsed.data.theme ?? existing?.theme ?? "system";
    const accentColor =
      parsed.data.accentColor ?? existing?.accentColor ?? "coral";

    const data = await prisma.userPreferences.upsert({
      where: { userId },
      update: { theme, accentColor, updatedAt: new Date() },
      create: { userId, theme, accentColor, updatedAt: new Date() },
    });

    const validated = preferencesResponseSchema.parse({
      userId: data.userId,
      theme: data.theme,
      accentColor: data.accentColor,
    });

    cache.set(`prefs:${userId}`, validated, CACHE_TTL_MS);
    return c.json(validated);
  };
}
