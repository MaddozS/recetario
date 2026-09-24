import { prisma } from "./prisma";
import type {
  UserPreferencesUncheckedCreateInput,
  UserPreferencesUncheckedUpdateInput
} from "../prisma/generated/models";
import { Theme, AccentColor } from "../prisma/generated/enums";

export async function getUserPreferences(userId: string) {
  const data = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  return data
}

export async function createUserPreferences(userId: string, prefs: Omit<UserPreferencesUncheckedCreateInput, "userId">) {
  const data = await prisma.userPreferences.create({
    data: {
      userId,
      theme: prefs.theme ?? Theme.system,
      accentColor: prefs.accentColor ?? AccentColor.coral,
      updatedAt: new Date(),
    },
  });

  return data
}

export async function upsertUserPreferences(userId: string, prefs: Omit<UserPreferencesUncheckedCreateInput, "userId"> | Omit<UserPreferencesUncheckedUpdateInput, "userId">) {
  const existing = await prisma.userPreferences.findUnique({
    where: { userId },
  });

  const data = await prisma.userPreferences.upsert({
    where: { userId },
    update: {
      theme: prefs.theme ?? existing?.theme,
      accentColor: prefs.accentColor ?? existing?.accentColor,
      updatedAt: new Date(),
    },
    create: {
      userId,
      theme: prefs.theme as Theme ?? Theme.system,
      accentColor: prefs.accentColor as AccentColor ?? AccentColor.coral,
      updatedAt: new Date(),
    },
  });

  return data
}
