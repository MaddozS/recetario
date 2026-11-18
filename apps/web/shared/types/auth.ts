import type {
  PREFERENCE_ACCENT_COLORS,
  PREFERENCE_THEMES,
  SessionResponse,
  UserSubscriptionInfo,
} from '@recetario/types';

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
      status: 'authenticated';
      session: { id: string };
      user: AuthUser;
      subscription: UserSubscriptionInfo;
      preferences: AuthPreferences;
    }
  | {
      status: 'anonymous';
      session: null;
      user: null;
      subscription: null;
      preferences: AuthPreferences;
    };

/** Motivos con los que el shell manda a `/sign-in` (los renderiza Task 6). */
export const AUTH_REASONS = ['auth_required', 'session_expired'] as const;
export type AuthReason = (typeof AUTH_REASONS)[number];

export function buildAnonymousAuthState(preferences: AuthPreferences): AuthState {
  return {
    status: 'anonymous',
    session: null,
    user: null,
    subscription: null,
    preferences,
  };
}

/**
 * Estado autenticado a partir de la respuesta de `GET /api/auth/session`.
 *
 * Lo comparten el bootstrap del SSR (`server/middleware/10.auth.ts`) y la
 * revalidación de cliente (`useAuth().refresh()`): las dos vías construyen el
 * mismo estado con la misma función.
 */
export function buildAuthenticatedAuthState(
  session: NonNullable<SessionResponse>,
  preferences: AuthPreferences
): Extract<AuthState, { status: 'authenticated' }> {
  const { user, subscription, hasPasswordAuth } = session;
  const authUser: AuthUser = {
    id: user.id,
    email: user.email ?? null,
    name: user.name || user.email?.split('@')[0] || 'Usuario',
    firstName: user.firstName ?? null,
    lastName: user.lastName ?? null,
    image: user.image ?? null,
    role: user.role ?? 'USER',
    hasPasswordAuth: hasPasswordAuth ?? false,
  };

  return {
    status: 'authenticated',
    session: { id: session.session.id },
    user: authUser,
    subscription,
    preferences,
  };
}
