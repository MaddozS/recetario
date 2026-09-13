import { hasFeature as hasSubscriptionFeature } from "@recetario/stripe/subscription";
import type { AuthPreferences, AuthState } from "#shared/types/auth";
import { buildAnonymousAuthState } from "#shared/types/auth";
import { DEFAULT_ACCENT, DEFAULT_THEME } from "#shared/utils/preferences";

/**
 * Estado de sesión del request actual.
 *
 * La sesión la resuelve **una sola vez** `server/middleware/10.auth.ts` (contra
 * `GET /api/auth/session`, con preferencias cookie-first) y la deja en
 * `event.context.auth`; aquí sólo se transporta al render y al payload. Es
 * deliberadamente síncrono: un `await` en la fase de creación de la app pierde
 * el contexto de Vue y rompe el primer render de cualquier página con íconos.
 */
export function useAuth() {
  const state = useState<AuthState>("auth", () =>
    buildAnonymousAuthState({
      theme: DEFAULT_THEME,
      accentColor: DEFAULT_ACCENT,
    }),
  );

  if (import.meta.server) {
    const requestAuth = useRequestEvent()?.context.auth;
    if (requestAuth) {
      state.value = requestAuth;
    }
  }

  const isAuthenticated = computed(() => state.value.status === "authenticated");
  const user = computed(() =>
    state.value.status === "authenticated" ? state.value.user : null,
  );
  const subscription = computed(() =>
    state.value.status === "authenticated" ? state.value.subscription : null,
  );
  const preferences = computed<AuthPreferences>(() => state.value.preferences);

  /** Gate de features del plan; la autoridad sigue siendo Hono. */
  function hasFeature(feature: string): boolean {
    return subscription.value
      ? hasSubscriptionFeature(subscription.value, feature)
      : false;
  }

  /** Sesión expirada en cliente: el request ya no es válido. */
  function expire(): void {
    state.value = buildAnonymousAuthState(state.value.preferences);
  }

  return {
    state,
    isAuthenticated,
    user,
    subscription,
    preferences,
    hasFeature,
    expire,
  };
}
