// Subpath sin DOM ni `better-auth/client`: el barrel `@recetario/auth` arrastra
// módulos de navegador que no pertenecen al grafo del servidor.
import { generateToken, getCsrfCookie } from "@recetario/auth/csrf";
import { syncEnvBindings } from "@recetario/config/env";
import {
  ACCENT_COOKIE,
  THEME_COOKIE,
  resolveAccent,
  resolveTheme,
} from "#shared/utils/preferences";
import { buildAnonymousAuthState } from "#shared/types/auth";
import { isPrivatePath } from "#shared/utils/navigation";
import { getCloudflareEnv } from "../utils/api-transport";
import {
  buildAuthenticatedAuthState,
  fetchSession,
  shouldBootstrapSession,
} from "../utils/session-state";

/**
 * Bootstrap de sesión por documento: resuelve la sesión contra el API, deja el
 * estado en `event.context.auth` (lo serializa `app/plugins/auth.server.ts`) y
 * re-emite las cookies de presentación y CSRF.
 *
 * Sustituye al middleware de Astro sin conservar nada de su maquinaria: mismo
 * contrato, sin `locals`, sin `globalThis` y sin caché entre requests.
 */

const PRESENTATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const CSRF_COOKIE_MAX_AGE = 60 * 60;

// Sin caché compartida y fuera de índices. Se aplican aquí (y no con
// `routeRules`) para que el contrato sea el mismo en dev, e2e y producción:
// `setHeaders` es el mismo mecanismo que emite las cookies de sesión.
const PRIVATE_HEADERS = {
  "cache-control": "private, no-store",
  "x-robots-tag": "noindex, nofollow",
};

export default defineEventHandler(async (event) => {
  const { pathname } = getRequestURL(event);
  if (isPrivatePath(pathname)) {
    setHeaders(event, PRIVATE_HEADERS);
  }

  if (!shouldBootstrapSession(event)) {
    return;
  }

  syncEnvBindings(getCloudflareEnv(event));
  // `Secure` según el esquema real del request: en dev y en los e2e (http) las
  // cookies deben viajar; en producción (https) siempre.
  const secure = getRequestURL(event).protocol === "https:";

  const cookieTheme = getCookie(event, THEME_COOKIE);
  const cookieAccent = getCookie(event, ACCENT_COOKIE);
  const session = await fetchSession(event);

  if (!session?.user) {
    event.context.auth = buildAnonymousAuthState({
      theme: resolveTheme(cookieTheme),
      accentColor: resolveAccent(cookieAccent),
    });
    return;
  }

  // Preferencias cookie-first: la cookie es la réplica visual más reciente y la
  // sesión sólo siembra cuando todavía no existe.
  const preferences = {
    theme: resolveTheme(cookieTheme, session.preferences?.theme),
    accentColor: resolveAccent(cookieAccent, session.preferences?.accentColor),
  };

  setCookie(event, THEME_COOKIE, preferences.theme, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure,
    maxAge: PRESENTATION_COOKIE_MAX_AGE,
  });
  setCookie(event, ACCENT_COOKIE, preferences.accentColor, {
    path: "/",
    sameSite: "lax",
    httpOnly: false,
    secure,
    maxAge: PRESENTATION_COOKIE_MAX_AGE,
  });

  const csrfCookie = getCsrfCookie();
  setCookie(event, csrfCookie, getCookie(event, csrfCookie) ?? generateToken(), {
    path: "/",
    sameSite: "strict",
    httpOnly: false,
    secure,
    maxAge: CSRF_COOKIE_MAX_AGE,
  });

  event.context.auth = buildAuthenticatedAuthState(session, preferences);
});
