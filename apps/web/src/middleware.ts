import { defineMiddleware } from "astro:middleware";
import { env } from "cloudflare:workers";
// ── Orchestration imports (thin delegation to @recetario/* packages) ──────────
import { syncEnvBindings } from "@recetario/config/env";
import { clientIp, setSecurityHeaders } from "@recetario/config/request";
import { auth, generateToken, getCsrfCookie } from "@recetario/auth";
import { resolveSubscription, seedSubscriptionPlans } from "@recetario/billing";
import { logAuditEvent, prisma } from "@recetario/db";
import { apiFetch, ApiError as ApiClientError } from "@/lib/api-client";
import { subscriptionResponseSchema } from "@recetario/types";

const globals = globalThis as typeof globalThis & {
  __plansSeeded?: boolean;
};

const SIGN_IN_PATHS = ["/sign-in/email", "/sign-in/social"];

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

  // ── 1. Auth: resolve session from request headers ──────────────────────────
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (session?.user) {
    // ── 2. User: build AppUser from session data + check credential account ───
    const userName =
      session.user.name || session.user.email?.split("@")[0] || "Usuario";

    const credentialAccount = await prisma.account.findFirst({
      where: { userId: session.user.id, providerId: "credential" },
      select: { id: true },
    });

    const sessionExtra = session.user as Record<string, unknown>;

    const appUser: AppUser = {
      id: session.user.id,
      email: session.user.email ?? null,
      name: userName,
      firstName: (sessionExtra.firstName as string) ?? null,
      lastName: (sessionExtra.lastName as string) ?? null,
      image: session.user.image ?? null,
      role: (sessionExtra.role as string) ?? "USER",
      hasPasswordAuth: credentialAccount !== null,
    };

    context.locals.user = appUser;
    context.locals.session = { user: appUser };

    // ── 3. Audit: log sign-in events ──────────────────────────────────────────
    const url = new URL(context.request.url);
    detectSignInEvent(url.pathname, session.user.id, context.request);

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
      if (!(err instanceof ApiClientError) || err.code !== "NOT_FOUND") throw err;
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
