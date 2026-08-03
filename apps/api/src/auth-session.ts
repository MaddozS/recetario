import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { getUserPreferences, createUserPreferences } from "@recetario/db";

const DEFAULT_THEME = "system" as const;
const DEFAULT_ACCENT = "coral" as const;

export function authSessionHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      return c.json(null);
    }

    const userId = session.user.id;
    const existing = await getUserPreferences(userId);
    const prefs =
      existing ??
      (await createUserPreferences(userId, {
        theme: DEFAULT_THEME,
        accentColor: DEFAULT_ACCENT,
      }));

    return c.json({
      ...session,
      preferences: {
        userId: prefs.userId,
        theme: prefs.theme,
        accentColor: prefs.accentColor,
      },
    });
  };
}
