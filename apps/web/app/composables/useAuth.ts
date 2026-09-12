import { hasFeature as hasSubscriptionFeature } from "@recetario/stripe/subscription";
import { sessionResponseSchema } from "@recetario/types";
import type { AuthPreferences, AuthState } from "#shared/types/auth";
import {
  buildAnonymousAuthState,
  type AuthUser,
} from "#shared/types/auth";
import {
  ACCENT_COOKIE,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  THEME_COOKIE,
  readCookie,
  resolveAccent,
  resolveTheme,
} from "#shared/utils/preferences";
import { readDocumentCookie } from "~/utils/cookies";

/**
 * Estado de sesión del request actual.
 *
 * Se resuelve en una sola pasada (`resolveSession`) desde `event.context.auth`
 * —lo que dejó el middleware de Nitro— y, si ahí no está, preguntando al API
 * con `useRequestFetch()` (SSR) o `$fetch` (cliente). Así el guard de ruta no
 * depende del orden entre middlewares y plugins ni de que el contexto del
 * evento se comparta entre capas, y nunca hay un store de módulo.
 */

/** Sólo cliente: evita repetir la verificación en cada navegación. */
let clientResolved = false;

export function useAuth() {
  const state = useState<AuthState>("auth", () =>
    buildAnonymousAuthState({
      theme: DEFAULT_THEME,
      accentColor: DEFAULT_ACCENT,
    }),
  );
  /** Serializado en el payload: si es `true`, el SSR ya resolvió la sesión. */
  const resolved = useState<boolean>("auth-resolved", () => false);

  function cookiePreferences(): AuthPreferences {
    // Cabecera del request en SSR (fiable) y `document.cookie` en cliente.
    const cookieHeader = import.meta.server
      ? useRequestHeaders(["cookie"]).cookie
      : undefined;
    const themeRaw = import.meta.server
      ? readCookie(cookieHeader, THEME_COOKIE)
      : readDocumentCookie(THEME_COOKIE);
    const accentRaw = import.meta.server
      ? readCookie(cookieHeader, ACCENT_COOKIE)
      : readDocumentCookie(ACCENT_COOKIE);

    return {
      theme: resolveTheme(themeRaw, state.value.preferences.theme),
      accentColor: resolveAccent(accentRaw, state.value.preferences.accentColor),
    };
  }

  function applySession(
    payload: NonNullable<ReturnType<typeof sessionResponseSchema.parse>>,
    preferences: AuthPreferences,
  ): void {
    const { user, subscription, hasPasswordAuth } = payload;
    const authUser: AuthUser = {
      id: user.id,
      email: user.email ?? null,
      name: user.name || user.email?.split("@")[0] || "Usuario",
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      image: user.image ?? null,
      role: user.role ?? "USER",
      hasPasswordAuth: hasPasswordAuth ?? false,
    };

    state.value = {
      status: "authenticated",
      session: { id: payload.session.id },
      user: authUser,
      subscription,
      preferences: {
        theme: resolveTheme(
          preferences.theme,
          payload.preferences?.theme ?? preferences.theme,
        ),
        accentColor: resolveAccent(
          preferences.accentColor,
          payload.preferences?.accentColor ?? preferences.accentColor,
        ),
      },
    };
  }

  /**
   * Garantiza que el estado refleja la sesión real del request. Idempotente:
   * sólo la primera llamada de cada request (o de cada carga en el cliente)
   * habla con el API.
   */
  async function resolveSession(): Promise<AuthState> {
    if (resolved.value) {
      return state.value;
    }
    if (import.meta.client && clientResolved) {
      return state.value;
    }
    resolved.value = true;

    if (import.meta.server) {
      const requestAuth = useRequestEvent()?.context.auth;
      if (requestAuth) {
        state.value = requestAuth;
        return state.value;
      }
    }

    const preferences = cookiePreferences();
    try {
      // Envoltorio explícito: resolver la unión de tipos de `$fetch` con las
      // rutas tipadas de Nitro dispara "Excessive stack depth" en `vue-tsc`.
      const fetchSession = async (path: string): Promise<unknown> =>
        import.meta.server
          ? await useRequestFetch()(path)
          : await $fetch(path);
      const payload = await fetchSession("/api/auth/session");
      const parsed = sessionResponseSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(`payload inesperado: ${parsed.error.message}`);
      }
      if (parsed.data?.user) {
        applySession(parsed.data, preferences);
      } else {
        state.value = buildAnonymousAuthState(preferences);
      }
    } catch (error) {
      console.error("[auth] no se pudo resolver la sesión:", error);
      state.value = buildAnonymousAuthState(preferences);
    }

    if (import.meta.client) {
      clientResolved = true;
    }
    return state.value;
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

  /** Sesión expirada: el request ya no es válido, así que se descarta el estado. */
  function expire(): void {
    state.value = buildAnonymousAuthState(state.value.preferences);
  }

  return {
    state,
    resolved,
    isAuthenticated,
    user,
    subscription,
    preferences,
    hasFeature,
    expire,
    resolveSession,
  };
}
