import { z } from "zod";

export const PREFERENCE_THEMES = ["system", "light", "dark"] as const;
export const PREFERENCE_ACCENT_COLORS = [
  "indigo",
  "violet",
  "blue",
  "emerald",
  "rose",
  "amber",
  "coral",
] as const;

export const preferencesResponseSchema = z.object({
  userId: z.string(),
  theme: z.enum(PREFERENCE_THEMES),
  accentColor: z.enum(PREFERENCE_ACCENT_COLORS),
});

export const preferencesUpdateSchema = z
  .object({
    theme: z.enum(PREFERENCE_THEMES).optional(),
    accentColor: z.enum(PREFERENCE_ACCENT_COLORS).optional(),
  })
  .strict();

export type PreferencesResponse = z.infer<typeof preferencesResponseSchema>;
export type PreferencesUpdate = z.infer<typeof preferencesUpdateSchema>;
