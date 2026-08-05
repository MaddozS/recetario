import type { Handler } from "hono";
import { getUserPreferences, createUserPreferences } from "@recetario/db";
import { preferencesResponseSchema } from "@recetario/types";
import { getAuthUser } from "../middleware/auth";

const DEFAULT_THEME = "system" as const;
const DEFAULT_ACCENT = "coral" as const;

export function preferencesGetHandler(): Handler {
  return async (c) => {
    const user = await getAuthUser(c);
    const userId = user.id;

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

    return c.json(validated);
  };
}
