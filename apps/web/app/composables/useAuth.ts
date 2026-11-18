import { hasFeature as hasSubscriptionFeature } from '@recetario/stripe/subscription';
import { sessionResponseSchema, type SessionResponse } from '@recetario/types';
import type { AuthPreferences, AuthState } from '#shared/types/auth';
import { buildAnonymousAuthState, buildAuthenticatedAuthState } from '#shared/types/auth';
import {
  ACCENT_COOKIE,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  THEME_COOKIE,
  resolveAccent,
  resolveTheme,
} from '#shared/utils/preferences';
import { apiFetch, type ApiFetchImpl } from '~/utils/api-client';
import { readDocumentCookie } from '~/utils/cookies';

const SESSION_PATH = '/api/auth/session';

/** Sube tras cada revalidación confirmada; los datos derivados la observan. */
const AUTH_REVISION_KEY = 'auth-revision';

/**
 * Estado de sesión del request actual.
 *
 * La sesión la resuelve **una sola vez** `server/middleware/10.auth.ts` (contra
 * `GET /api/auth/session`, con preferencias cookie-first) y la deja en
 * `event.context.auth`; aquí sólo se transporta al render y al payload. Es
 * deliberadamente síncrono: un `await` en la fase de creación de la app pierde
 * el contexto de Vue y rompe el primer render de cualquier página con íconos.
 *
 * `refresh()` es la revalidación explícita y nunca se `await`ea en setup: la
 * dispara el plugin `auth-revalidation` cuando el snapshot del documento puede
 * haber quedado rancio (restauración desde bfcache o regreso a la pestaña).
 * `revision` avisa a los datos derivados de la sesión (p. ej. la suscripción de
 * la pestaña de facturación).
 */
export function useAuth() {
  const state = useState<AuthState>('auth', () =>
    buildAnonymousAuthState({
      theme: DEFAULT_THEME,
      accentColor: DEFAULT_ACCENT,
    })
  );
  const revision = useState<number>(AUTH_REVISION_KEY, () => 0);

  // Se resuelve en setup, una sola vez: en SSR queda atado al request (hereda
  // cookies) y en cliente al `$fetch` global.
  const requestFetch = useRequestFetch();
  const fetchImpl: ApiFetchImpl = async (path, init) => await requestFetch(path, init);

  if (import.meta.server) {
    const requestAuth = useRequestEvent()?.context.auth;
    if (requestAuth) {
      state.value = requestAuth;
    }
  }

  const isAuthenticated = computed(() => state.value.status === 'authenticated');
  const user = computed(() => (state.value.status === 'authenticated' ? state.value.user : null));
  const subscription = computed(() =>
    state.value.status === 'authenticated' ? state.value.subscription : null
  );
  const preferences = computed<AuthPreferences>(() => state.value.preferences);

  /** Gate de features del plan; la autoridad sigue siendo Hono. */
  function hasFeature(feature: string): boolean {
    return subscription.value ? hasSubscriptionFeature(subscription.value, feature) : false;
  }

  /**
   * Revalida la sesión contra el API y reemplaza el snapshot del documento.
   *
   * Nunca lanza: un fallo de red se registra y conserva el estado actual
   * (best-effort), y una sesión cerrada en otra pestaña —respuesta `null`—
   * expira aquí.
   */
  async function refresh(): Promise<boolean> {
    try {
      const session = await apiFetch(fetchImpl, SESSION_PATH, {
        schema: sessionResponseSchema,
      });
      const current = state.value;

      if (!session?.user) {
        if (current.status === 'authenticated') expire();
        return false;
      }

      state.value = buildAuthenticatedAuthState(
        session,
        // Cookie-first como el bootstrap: la réplica de presentación local
        // manda y la sesión sólo siembra cuando el SSR resolvió anónimo.
        current.status === 'authenticated'
          ? current.preferences
          : resolveSessionPreferences(session)
      );
      revision.value += 1;
      return true;
    } catch (cause) {
      console.error('[auth] no se pudo revalidar la sesión', cause);
      return false;
    }
  }

  /** Preferencias cookie-first para la transición anónimo→autenticado. */
  function resolveSessionPreferences(session: NonNullable<SessionResponse>): AuthPreferences {
    return {
      theme: resolveTheme(readDocumentCookie(THEME_COOKIE), session.preferences?.theme),
      accentColor: resolveAccent(
        readDocumentCookie(ACCENT_COOKIE),
        session.preferences?.accentColor
      ),
    };
  }

  /** Preferencias confirmadas por `PUT /api/preferences`. */
  function applyPreferences(next: AuthPreferences): void {
    state.value.preferences = { ...next };
  }

  /** Perfil confirmado por `POST /api/account/update-name`. */
  function applyProfile(next: { firstName: string; lastName: string }): void {
    const current = state.value;
    if (current.status !== 'authenticated') return;

    current.user.firstName = next.firstName;
    current.user.lastName = next.lastName;
    current.user.name = `${next.firstName} ${next.lastName}`.trim();
  }

  /** Sesión expirada en cliente: el request ya no es válido. */
  function expire(): void {
    state.value = buildAnonymousAuthState(state.value.preferences);
  }

  return {
    state,
    revision,
    isAuthenticated,
    user,
    subscription,
    preferences,
    hasFeature,
    refresh,
    applyPreferences,
    applyProfile,
    expire,
  };
}
