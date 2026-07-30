import { prisma } from "./prisma";
import type { UserPreferences } from "@recetario/types";

const validThemes = ["system", "light", "dark"] as const;
const validAccentColors = [
  "indigo",
  "violet",
  "blue",
  "emerald",
  "rose",
  "amber",
  "coral",
] as const;

function isValidTheme(value: string): value is (typeof validThemes)[number] {
  return (validThemes as readonly string[]).includes(value);
}

function isValidAccentColor(
  value: string,
): value is UserPreferences["accentColor"] {
  return (validAccentColors as readonly string[]).includes(value);
}

// ponytail: every helper takes an optional `db` so the API worker
// can pass a per-request client (see apps/api/src/fresh-db.ts and
// memory #63). Web keeps using the singleton.
export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  const data = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  return data
    ? {
        userId: data.userId,
        theme: (["system", "light", "dark"].includes(data.theme)
          ? data.theme
          : "system") as "system" | "light" | "dark",
        accentColor: isValidAccentColor(data.accentColor)
          ? data.accentColor
          : "coral",
      }
    : null;
}

export async function upsertUserPreferences(
  userId: string,
  prefs: { theme?: string; accentColor?: string },
): Promise<UserPreferences> {
  const existing = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  const theme = isValidTheme(prefs.theme ?? "")
    ? (prefs.theme as UserPreferences["theme"])
    : (existing?.theme ?? "system");
  const accentColor = isValidAccentColor(prefs.accentColor ?? "")
    ? (prefs.accentColor as UserPreferences["accentColor"])
    : (existing?.accentColor ?? "coral");

  const data = await prisma.userPreferences.upsert({
    where: { userId },
    update: {
      theme,
      accentColor,
      updatedAt: new Date(),
    },
    create: {
      userId,
      theme,
      accentColor,
      updatedAt: new Date(),
    },
  });

  return {
    userId: data.userId,
    theme: theme as UserPreferences["theme"],
    accentColor: accentColor as UserPreferences["accentColor"],
  };
}
