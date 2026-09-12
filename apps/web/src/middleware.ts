import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
// ── Orchestration imports (thin delegation to @recetario/* packages) ──────────
import { syncEnvBindings } from "@recetario/config/env";
import { setSecurityHeaders } from "@recetario/config/request";
import { generateToken, getCsrfCookie } from "@recetario/auth";
import { getDefaultSubscription } from "@recetario/stripe";
import {
  apiFetch,
  ApiError as ApiClientError,
  setApiBinding,
} from "@/lib/api-client";
import {
  sessionResponseSchema,
  type SessionResponse,
} from "@recetario/types";
import { ACCENT_FAMILIES, type AccentFamily } from "@/lib/accent-colors";

const VALID_THEMES = ["system", "light", "dark"] as const;
type ThemePref = (typeof VALID_THEMES)[number];

function resolveTheme(raw: string | undefined, fallback: string): ThemePref {
  if (raw && (VALID_THEMES as readonly string[]).includes(raw)) return raw as ThemePref;
  return (VALID_THEMES as readonly string[]).includes(fallback)
    ? (fallback as ThemePref)
    : "system";
}

function resolveAccent(raw: string | undefined, fallback: string): AccentFamily {
  if (raw && (ACCENT_FAMILIES as readonly string[]).includes(raw)) return raw as AccentFamily;
  return (ACCENT_FAMILIES as readonly string[]).includes(fallback)
    ? (fallback as AccentFamily)
    : "coral";
}

type ApiServiceBinding = {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};

function getRuntimeEnv(): Record<string, unknown> {
  try {
    const cfEnv = env as Record<string, unknown>;
    if (cfEnv && typeof cfEnv === "object") {
      return cfEnv;
    }
  } catch {
    // ignore
  }
  return {};
}

export const onRequest = defineMiddleware(async (context, next) => {
  const bindings = getRuntimeEnv();
  syncEnvBindings(bindings);
  // ponytail: service binding is not wired to the API worker's wrangler dev
  // process in dev (separate miniflare instances). Skip it and let apiFetch
  // fall through to INTERNAL_API_URL (http://localhost:8787).
  if (!import.meta.env.DEV) {
    setApiBinding((bindings as { API?: ApiServiceBinding }).API);
  }

  // ── 0. Relay: /api/* must reach the API worker (the web app does
  //       not own the API worker instance). In production we forward via
  //       the `API` service binding; in dev the Vite proxy in
  //       `astro.config.mjs` handles this before the request ever hits
  //       the middleware.
  if (context.url.pathname.startsWith("/api/")) {
    const api = (bindings as { API?: ApiServiceBinding }).API;
    if (api) {
      try {
        return await api.fetch(context.request.clone());
      } catch (err) {
        console.error("[/api relay] Service binding fetch failed:", err);
        return new Response(
          JSON.stringify({ error: "API service request failed" }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    }
    return new Response("API service binding not configured", { status: 500 });
  }

  // ── 1. Auth: resolve session from the API worker ─────────────────────────
  let session: SessionResponse | null;
  try {
    session = await apiFetch(
      "/api/auth/session",
      { schema: sessionResponseSchema },
      context,
    );
  } catch (err) {
    if (
      !(err instanceof ApiClientError) ||
      (err.status !== 401 && err.code !== "UNAUTHENTICATED")
    ) {
      console.error("[/api/auth/session] unexpected error:", err);
    }
    session = null;
  }

  if (session && session.subscription) {
    const { user: sessionUser, subscription } = session;
    const hasPasswordAuth = session.hasPasswordAuth ?? false;

    const userName =
      sessionUser.name || sessionUser.email?.split("@")[0] || "Usuario";

    const appUser: AppUser = {
      id: sessionUser.id,
      email: sessionUser.email ?? null,
      name: userName,
      firstName: sessionUser.firstName ?? null,
      lastName: sessionUser.lastName ?? null,
      image: sessionUser.image ?? null,
      role: sessionUser.role ?? "USER",
      hasPasswordAuth,
    };

    context.locals.user = appUser;
    context.locals.session = { user: appUser };
    context.locals.subscription = subscription;

    // ── 3. Preferences: cookie-first (client source of truth), session as seed ──
    const cookieTheme = context.cookies.get("kitchcalc-theme")?.value;
    const cookieAccent = context.cookies.get("kitchcalc-accent")?.value;
    const prefsTheme = resolveTheme(cookieTheme, session.preferences?.theme ?? "system");
    const prefsAccent = resolveAccent(
      cookieAccent,
      session.preferences?.accentColor ?? "coral",
    );

    const userPrefs = {
      userId: sessionUser.id,
      theme: prefsTheme,
      accentColor: prefsAccent,
    };
    context.locals.preferences = userPrefs;

    context.cookies.set("kitchcalc-theme", userPrefs.theme, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 31536000,
    });
    context.cookies.set("kitchcalc-accent", userPrefs.accentColor, {
      path: "/",
      sameSite: "lax",
      httpOnly: false,
      maxAge: 31536000,
    });

    // ── 4. CSRF: get-or-create per-session token ─────────────────────────────
    const existingToken = context.cookies.get(getCsrfCookie())?.value;
    const csrfToken = existingToken ?? generateToken();
    context.locals.csrfToken = csrfToken;
    context.cookies.set(getCsrfCookie(), csrfToken, {
      path: "/",
      sameSite: "strict",
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      maxAge: 3600,
    });
  } else {
    // ── Unauthenticated: set all locals to null / defaults ──────────────────
    context.locals.user = null;
    context.locals.session = null;
    context.locals.preferences = {
      userId: "",
      theme: resolveTheme(context.cookies.get("kitchcalc-theme")?.value, "system"),
      accentColor: resolveAccent(context.cookies.get("kitchcalc-accent")?.value, "coral"),
    };
    context.locals.subscription = getDefaultSubscription();
    context.locals.csrfToken = null;
  }

  // ── 7. Response: apply security headers to every response ───────────────────
  const response = await next();
  setSecurityHeaders(response);
  return response;
});
