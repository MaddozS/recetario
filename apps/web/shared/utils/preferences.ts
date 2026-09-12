import { PREFERENCE_ACCENT_COLORS, PREFERENCE_THEMES } from "@recetario/types";
import type { AccentPreference, ThemePreference } from "#shared/types/auth";

/**
 * Cookies de presentación. Son una réplica visual: la fuente autoritativa es
 * `session.preferences` / `GET /api/preferences` (Task 3). Se leen cookie-first
 * para que el primer paint no dependa del API.
 */
export const THEME_COOKIE = "kitchcalc-theme";
export const ACCENT_COOKIE = "kitchcalc-accent";
export const SIDEBAR_COOKIE = "kitchcalc-sidebar-collapsed";

export const DEFAULT_THEME: ThemePreference = "system";
export const DEFAULT_ACCENT: AccentPreference = "coral";

function isValidTheme(value: unknown): value is ThemePreference {
  return (
    typeof value === "string" &&
    (PREFERENCE_THEMES as readonly string[]).includes(value)
  );
}

function isValidAccent(value: unknown): value is AccentPreference {
  return (
    typeof value === "string" &&
    (PREFERENCE_ACCENT_COLORS as readonly string[]).includes(value)
  );
}

export function resolveTheme(
  raw: string | null | undefined,
  fallback: string | null | undefined = DEFAULT_THEME,
): ThemePreference {
  if (isValidTheme(raw)) return raw;
  return isValidTheme(fallback) ? fallback : DEFAULT_THEME;
}

export function resolveAccent(
  raw: string | null | undefined,
  fallback: string | null | undefined = DEFAULT_ACCENT,
): AccentPreference {
  if (isValidAccent(raw)) return raw;
  return isValidAccent(fallback) ? fallback : DEFAULT_ACCENT;
}

/** Resuelve `system` con la preferencia del sistema operativo. */
export function isDarkTheme(
  theme: ThemePreference,
  prefersDark: boolean,
): boolean {
  return theme === "dark" || (theme === "system" && prefersDark);
}

/**
 * Lee una cookie de una cabecera `Cookie`. Se usa en SSR en lugar de
 * `useCookie` (que depende del evento interno de la app): la cabecera del
 * request es la fuente fiable.
 */
export function readCookie(
  cookieHeader: string | null | undefined,
  name: string,
): string | null {
  if (!cookieHeader) return null;
  const prefix = `${name}=`;
  for (const part of cookieHeader.split(";")) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return decodeURIComponent(trimmed.slice(prefix.length));
    }
  }
  return null;
}
