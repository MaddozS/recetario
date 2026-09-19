import type { AuthPreferences } from "#shared/types/auth";
import {
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  isDarkTheme,
  resolveAccent,
  resolveTheme,
} from "#shared/utils/preferences";
import { getAccentCssVars } from "~/utils/accent-colors";

/**
 * Apariencia (tema + acento) como estado declarativo.
 *
 * El SSR resuelve los tokens con la preferencia guardada y el acento aplica el
 * mapa light/dark en runtime: `system` se resuelve con la media query del
 * sistema (`prefers-dark`, que mantiene `plugins/theme.client.ts`). No hay
 * escritura imperativa al DOM: `<html>` lo gobierna `app.vue` con `useHead`.
 */
export function useTheme() {
  const appearance = useState<AuthPreferences>("appearance", () => ({
    theme: DEFAULT_THEME,
    accentColor: DEFAULT_ACCENT,
  }));

  // Mismo criterio que `useAuth`: en SSR la fuente es el request, no el orden
  // de plugins/middlewares.
  if (import.meta.server) {
    const { preferences } = useAuth();
    appearance.value = { ...preferences.value };
  }

  /** `system` durante el SSR: el script anti-FOUC ya resolvió la clase `dark`. */
  const prefersDark = useState<boolean>("prefers-dark", () => false);

  const theme = computed(() => appearance.value.theme);
  const accent = computed(() => appearance.value.accentColor);
  const isDark = computed(() => isDarkTheme(theme.value, prefersDark.value));
  const accentCssVars = computed(() =>
    getAccentCssVars(accent.value, isDark.value ? "dark" : "light"),
  );

  function setTheme(next: string): void {
    appearance.value = {
      ...appearance.value,
      theme: resolveTheme(next, appearance.value.theme),
    };
  }

  function setAccent(next: string): void {
    appearance.value = {
      ...appearance.value,
      accentColor: resolveAccent(next, appearance.value.accentColor),
    };
  }

  function setPrefersDark(next: boolean): void {
    prefersDark.value = next;
  }

  return {
    appearance,
    theme,
    accent,
    isDark,
    accentCssVars,
    setTheme,
    setAccent,
    setPrefersDark,
  };
}
