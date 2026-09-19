import type {
  PREFERENCE_ACCENT_COLORS,
  PREFERENCE_THEMES,
  UserSubscriptionInfo,
} from "@recetario/types";

/** Preferencia de tema tal como la valida el API (`@recetario/types`). */
export type ThemePreference = (typeof PREFERENCE_THEMES)[number];

/** Preferencia de acento tal como la valida el API (`@recetario/types`). */
export type AccentPreference = (typeof PREFERENCE_ACCENT_COLORS)[number];

export type AuthPreferences = {
  theme: ThemePreference;
  accentColor: AccentPreference;
};

export type AuthUser = {
  id: string;
  email: string | null;
  name: string;
  firstName: string | null;
  lastName: string | null;
  image: string | null;
  role: string;
  hasPasswordAuth: boolean;
};

/**
 * Estado de sesión de un request. Vive en `event.context.auth` durante el SSR y
 * viaja al cliente por el payload (`useState('auth')`); nunca se guarda en un
 * módulo compartido entre requests.
 */
export type AuthState =
  | {
      status: "authenticated";
      session: { id: string };
      user: AuthUser;
      subscription: UserSubscriptionInfo;
      preferences: AuthPreferences;
    }
  | {
      status: "anonymous";
      session: null;
      user: null;
      subscription: null;
      preferences: AuthPreferences;
    };

/** Motivos con los que el shell manda a `/sign-in` (los renderiza Task 6). */
export const AUTH_REASONS = ["auth_required", "session_expired"] as const;
export type AuthReason = (typeof AUTH_REASONS)[number];

export function buildAnonymousAuthState(
  preferences: AuthPreferences,
): AuthState {
  return {
    status: "anonymous",
    session: null,
    user: null,
    subscription: null,
    preferences,
  };
}
