/**
 * Operaciones CRUD para las preferencias de usuario (tema y color de acento).
 */

import type { UserPreferences } from "./types";
import { getDriver, ensureInitialized } from "./connection";
import { requireOwnerId, type Driver } from "./index";

async function getUserPreferencesInternal(
  driver: Driver,
  userId: string,
): Promise<UserPreferences | null> {
  const scopeId = requireOwnerId(userId);

  if (driver.kind === "postgres") {
    const res = await driver.pool.query<{
      user_id: string;
      theme: string;
      accent_color: string;
    }>(
      "SELECT user_id, theme, accent_color FROM user_preferences WHERE user_id = $1",
      [scopeId],
    );

    const row = res.rows[0];
    if (!row) return null;

    return {
      userId: row.user_id,
      theme: row.theme === "dark" ? "dark" : "light",
      accentColor: isValidAccentColor(row.accent_color) ? row.accent_color : "indigo",
    };
  }

  const row = driver.db
    .prepare(
      "SELECT user_id, theme, accent_color FROM user_preferences WHERE user_id = ?",
    )
    .get(scopeId) as
    | { user_id: string; theme: string; accent_color: string }
    | undefined;

  if (!row) return null;

  return {
    userId: row.user_id,
    theme: row.theme === "dark" ? "dark" : "light",
    accentColor: isValidAccentColor(row.accent_color) ? row.accent_color : "indigo",
  };
}

const validAccentColors = ["indigo", "violet", "blue", "emerald", "rose", "amber"] as const;

function isValidAccentColor(
  value: string,
): value is UserPreferences["accentColor"] {
  return (validAccentColors as readonly string[]).includes(value);
}

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  await ensureInitialized();
  const driver = await getDriver();
  return getUserPreferencesInternal(driver, userId);
}

export async function upsertUserPreferences(
  userId: string,
  prefs: { theme?: "light" | "dark"; accentColor?: string },
): Promise<UserPreferences> {
  await ensureInitialized();
  const driver = await getDriver();
  const scopeId = requireOwnerId(userId);

  const existing = await getUserPreferencesInternal(driver, scopeId);

  const theme = prefs.theme ?? existing?.theme ?? "light";
  const accentColor = isValidAccentColor(prefs.accentColor ?? "")
    ? (prefs.accentColor as UserPreferences["accentColor"])
    : existing?.accentColor ?? "indigo";

  if (driver.kind === "postgres") {
    await driver.pool.query(
      `INSERT INTO user_preferences (user_id, theme, accent_color, updated_at)
       VALUES ($1, $2, $3, now())
       ON CONFLICT (user_id)
       DO UPDATE SET theme = EXCLUDED.theme, accent_color = EXCLUDED.accent_color, updated_at = now()`,
      [scopeId, theme, accentColor],
    );
  } else {
    driver.db
      .prepare(
        `INSERT INTO user_preferences (user_id, theme, accent_color, updated_at)
         VALUES (?, ?, ?, datetime('now'))
         ON CONFLICT (user_id)
         DO UPDATE SET theme = excluded.theme, accent_color = excluded.accent_color, updated_at = datetime('now')`,
      )
      .run(scopeId, theme, accentColor);
  }

  return { userId: scopeId, theme, accentColor };
}
