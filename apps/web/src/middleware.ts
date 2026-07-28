import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
// ── Orchestration imports (thin delegation to @recetario/* packages) ──────────
import { syncEnvBindings } from "@recetario/config/env";
import { clientIp, setSecurityHeaders } from "@recetario/config/request";
import { generateToken, getCsrfCookie } from "@recetario/auth";
import { resolveSubscription, seedSubscriptionPlans } from "@recetario/billing";
import { logAuditEvent, prisma } from "@recetario/db";
import {
  apiFetch,
  ApiError as ApiClientError,
  setApiBinding,
} from "@/lib/api-client";
import {
  sessionResponseSchema,
  type SessionResponse,
  subscriptionResponseSchema,
} from "@recetario/types";

const globals = globalThis as typeof globalThis & {
  __plansSeeded?: boolean;
};

const SIGN_IN_PATHS = ["/sign-in/email", "/sign-in/social"];

type ApiServiceBinding = {
  fetch: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
};

async function detectSignInEvent(
  path: string,
  userId: string,
  request: Request,
) {
  if (SIGN_IN_PATHS.some((p) => path.includes(p))) {
    await logAuditEvent({
      userId,
      action: "sign_in",
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? null,
    });
  }
}

export const onRequest = defineMiddleware(async (context, next) => {
  syncEnvBindings(env as Record<string, unknown>);
  setApiBinding(context.locals.runtime?.env?.API);

  // ── 0. Relay: /api/auth/* must reach the API worker (the web app does
  //       not own the Better Auth instance). In production we forward via
  //       the `API` service binding; in dev the Vite proxy in
  //       `astro.config.mjs` handles this before the request ever hits
  //       the middleware.
  if (context.url.pathname.startsWith("/api/auth/")) {
    const api = context.locals.runtime?.env?.API as
      | ApiServiceBinding
      | undefined;
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
      context.request,
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

    const credentialAccount = await prisma.account.findFirst({
      where: { userId: sessionUser.id, providerId: "credential" },
      select: { id: true },
    });

    const appUser: AppUser = {
      id: sessionUser.id,
      email: sessionUser.email ?? null,
      name: userName,
      firstName: sessionUser.firstName ?? null,
      lastName: sessionUser.lastName ?? null,
      image: sessionUser.image ?? null,
      role: sessionUser.role ?? "USER",
      hasPasswordAuth: credentialAccount !== null,
    };

    context.locals.user = appUser;
    context.locals.session = { user: appUser };

    // ── 3. Audit: log sign-in events ──────────────────────────────────────────
    detectSignInEvent(context.url.pathname, sessionUser.id, context.request);

    // ── 4. Billing: seed plans (once) + resolve subscription with cache ───────
    if (!globals.__plansSeeded) {
      globals.__plansSeeded = true;
      seedSubscriptionPlans().catch(() => {});
    }

    try {
      const sub = await apiFetch(
        "/api/billing/subscription",
        { schema: subscriptionResponseSchema },
        context.request,
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
