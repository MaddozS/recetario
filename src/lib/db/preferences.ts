import { prisma } from "../prisma";
import type { UserPreferences } from "./types";
import { cacheGet, cacheSet } from "../cache";

const validAccentColors = [
  "indigo",
  "violet",
  "blue",
  "emerald",
  "rose",
  "amber",
  "coral",
] as const;

function isValidAccentColor(
  value: string,
): value is UserPreferences["accentColor"] {
  return (validAccentColors as readonly string[]).includes(value);
}

export async function getUserPreferences(
  userId: string,
): Promise<UserPreferences | null> {
  const cacheKey = `prefs:${userId}`;
  const cached = cacheGet<UserPreferences | null>(cacheKey);
  if (cached !== undefined) return cached;

  const data = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  const result: UserPreferences | null = data
    ? {
        userId: data.userId,
        theme: (data.theme === "dark" ? "dark" : "light") as "light" | "dark",
        accentColor: isValidAccentColor(data.accentColor)
          ? data.accentColor
          : "indigo",
      }
    : null;

  cacheSet(cacheKey, result, 60);
  return result;
}

export async function upsertUserPreferences(
  userId: string,
  prefs: { theme?: "light" | "dark"; accentColor?: string },
): Promise<UserPreferences> {
  const existing = await getUserPreferences(userId);

  const theme = prefs.theme ?? existing?.theme ?? "light";
  const accentColor = isValidAccentColor(prefs.accentColor ?? "")
    ? (prefs.accentColor as UserPreferences["accentColor"])
    : (existing?.accentColor ?? "indigo");

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
  cacheSet(`prefs:${userId}`, result, 60);
  return result;
}
