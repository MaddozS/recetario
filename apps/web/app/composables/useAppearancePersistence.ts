import { preferencesResponseSchema } from "@recetario/types";
import type { AuthPreferences } from "#shared/types/auth";
import { ACCENT_COOKIE, THEME_COOKIE } from "#shared/utils/preferences";
import { writeDocumentCookie } from "~/utils/cookies";
import { PREFERENCES_SAVE_ERROR_MESSAGE } from "~/features/settings/settings-messages";

export type AppearanceOutcome = { ok: true } | { ok: false; message: string };

const BUSY_MESSAGE = "Hay un guardado de preferencias en curso.";

/**
 * Persistencia de tema/acento (cross-cutting: Settings y el toggle público).
 *
 * Reglas de la Task 11:
 * - el cambio se previsualiza al instante (`useTheme` es el estado compartido);
 * - con sesión, la autoridad es `PUT /api/preferences` y las **cookies se
 *   escriben desde la respuesta confirmada**, nunca antes;
 * - si el PUT falla, la previsualización vuelve a la snapshot previa;
 * - sin sesión no hay autoridad remota: la cookie es el almacén y se escribe
 *   directamente.
 */
export function useAppearancePersistence() {
  const api = useApi();
  const { isAuthenticated, applyPreferences } = useAuth();
  const { appearance, setTheme, setAccent } = useTheme();
  const saving = ref(false);

  function writeCookies(next: AuthPreferences): void {
    if (!import.meta.client) return;
    writeDocumentCookie(THEME_COOKIE, next.theme);
    writeDocumentCookie(ACCENT_COOKIE, next.accentColor);
  }

  async function saveAppearance(
    next: AuthPreferences,
    options: { rollbackTo?: AuthPreferences } = {},
  ): Promise<AppearanceOutcome> {
    if (saving.value) {
      return { ok: false, message: BUSY_MESSAGE };
    }
    saving.value = true;

    const previous: AuthPreferences = { ...appearance.value };
    setTheme(next.theme);
    setAccent(next.accentColor);
    const applied: AuthPreferences = { ...appearance.value };

    try {
      if (!isAuthenticated.value) {
        writeCookies(applied);
        return { ok: true };
      }

      const persisted = await api("/api/preferences", {
        method: "PUT",
        body: { theme: applied.theme, accentColor: applied.accentColor },
        schema: preferencesResponseSchema,
      });

      const confirmed: AuthPreferences = {
        theme: persisted.theme,
        accentColor: persisted.accentColor,
      };
      writeCookies(confirmed);
      applyPreferences(confirmed);
      return { ok: true };
    } catch (cause) {
      console.error(
        "[appearance] no se pudieron guardar las preferencias",
        cause,
      );
      // El formulario revierte a lo persistido; el toggle, a la snapshot.
      const fallback = options.rollbackTo ?? previous;
      setTheme(fallback.theme);
      setAccent(fallback.accentColor);
      return { ok: false, message: PREFERENCES_SAVE_ERROR_MESSAGE };
    } finally {
      saving.value = false;
    }
  }

  return { saving, saveAppearance };
}
