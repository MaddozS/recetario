import type { Handler } from "hono";
import { getUserPreferences, upsertUserPreferences } from "@recetario/db";
import { preferencesResponseSchema, preferencesUpdateSchema } from "@recetario/types";
import * as cache from "../cache.js";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

const CACHE_TTL_MS = 60_000;

export function preferencesUpdateHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma, auth) => {
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

      const data = await upsertUserPreferences(
        userId,
        {
          theme: parsed.data.theme,
          accentColor: parsed.data.accentColor,
        },
        prisma,
      );

      const validated = preferencesResponseSchema.parse({
        userId: data.userId,
        theme: data.theme,
        accentColor: data.accentColor,
      });

      cache.set(`prefs:${userId}`, validated, CACHE_TTL_MS);
      return c.json(validated);
    });
}
