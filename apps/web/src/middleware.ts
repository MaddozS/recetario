import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
// ── Orchestration imports (thin delegation to @recetario/* packages) ──────────
import { syncEnvBindings } from "@recetario/config/env";
import { clientIp, setSecurityHeaders } from "@recetario/config/request";
import { generateToken, getCsrfCookie } from "@recetario/auth";
import { resolveSubscription } from "@recetario/billing";
import {
  apiFetch,
  ApiError as ApiClientError,
  setApiBinding,
} from "@/lib/api-client";
import {
  credentialStatusResponseSchema,
  sessionResponseSchema,
  type SessionResponse,
  subscriptionResponseSchema,
} from "@recetario/types";

const SIGN_IN_PATHS = ["/sign-in/email", "/sign-in/social"];

type ApiServiceBinding = {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};

function detectSignInEvent(
  path: string,
  userId: string,
  context: { request: Request; locals?: { user?: { id?: string | null } | null } },
): void {
  if (!SIGN_IN_PATHS.some((p) => path.includes(p))) return;
  // ponytail: best-effort; never block the request
  apiFetch(
    "/api/audit/log",
    {
      method: "POST",
      body: {
        action: "sign_in",
        ipAddress: clientIp(context.request),
        userAgent: context.request.headers.get("user-agent") ?? null,
      },
    },
    context,
  ).catch(() => {});
}

export const onRequest = defineMiddleware(async (context, next) => {
  const bindings = env as Record<string, unknown>;
  syncEnvBindings(bindings);
  // ponytail: service binding is not wired to the API worker's wrangler dev
  // process in dev (separate miniflare instances). Skip it and let apiFetch
  // fall through to INTERNAL_API_URL (http://localhost:8787).
  if (!import.meta.env.DEV) {
    setApiBinding((bindings as { API?: ApiServiceBinding }).API);
  }

  // ── 0. Relay: /api/auth/* must reach the API worker (the web app does
  //       not own the Better Auth instance). In production we forward via
  //       the `API` service binding; in dev the Vite proxy in
  //       `astro.config.mjs` handles this before the request ever hits
  //       the middleware.
  if (context.url.pathname.startsWith("/api/auth/")) {
    const api = (env as { API?: ApiServiceBinding }).API;
    if (api) {
      return api.fetch(context.request);
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

  if (session) {
    const { user: sessionUser } = session;

    // ── 2. User: build AppUser from session data + check credential account ───
    const userName =
      sessionUser.name || sessionUser.email?.split("@")[0] || "Usuario";

    let hasPasswordAuth = false;
    try {
      const credentialStatus = await apiFetch(
        "/api/auth/credential-status",
        { schema: credentialStatusResponseSchema },
        context,
      );
      hasPasswordAuth = credentialStatus.hasPasswordAuth;
    } catch (err) {
      if (!(err instanceof ApiClientError) || err.status !== 401) {
        console.error("[/api/auth/credential-status] error:", err);
      }
    }

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

    // ── 3. Audit: log sign-in events ──────────────────────────────────────────
    detectSignInEvent(context.url.pathname, sessionUser.id, context);

    // ── 4. Billing: resolve subscription with cache ──────────────────────
    try {
      const sub = await apiFetch(
        "/api/billing/subscription",
        { schema: subscriptionResponseSchema },
        context,
      );
      context.locals.subscription = sub;
    } catch (err) {
      if (!(err instanceof ApiClientError) || err.code !== "NOT_FOUND")
        throw err;
      context.locals.subscription = resolveSubscription(null);
    }

    // ── 5. CSRF: get-or-create per-session token ─────────────────────────────
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
    context.locals.subscription = resolveSubscription(null);
    context.locals.csrfToken = null;
  }

  // ── 6. Response: apply security headers to every response ───────────────────
  const response = await next();
  setSecurityHeaders(response);
  return response;
});
