import { prisma } from "@/lib/prisma";
import type { UserPreferences } from "@/lib/db/types";
import { cacheGet, cacheSet } from "@/lib/cache";

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

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  const cacheKey = `prefs:${userId}`;
  const cached = await cacheGet<UserPreferences | null>(cacheKey);
  if (cached !== undefined) return cached;

  const data = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  const result: UserPreferences | null = data
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

  await cacheSet(cacheKey, result, 60);
  return result;
}

export async function upsertUserPreferences(
  userId: string,
  prefs: { theme?: string; accentColor?: string },
): Promise<UserPreferences> {
  const existing = await getUserPreferences(userId);

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

  const result = { userId: data.userId, theme, accentColor };
  await cacheSet(`prefs:${userId}`, result, 60);
  return result;
}
