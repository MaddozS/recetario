import { defineMiddleware } from "astro:middleware";
import { auth } from "@/lib/auth";
import { getUserSubscription, seedSubscriptionPlans } from "@/lib/db/billing";
import { resolveSubscription } from "@/lib/subscription";
import { cacheGet, cacheSet } from "@/lib/cache";
import { generateToken, getCsrfCookie } from "@/lib/csrf";
import { logAuditEvent } from "@/lib/db/audit";

const globals = globalThis as typeof globalThis & {
  __plansSeeded?: boolean;
};

function setSecurityHeaders(response: Response): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://accounts.google.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self' https://api.stripe.com; frame-src https://js.stripe.com https://hooks.stripe.com https://accounts.google.com",
  );
}

const SIGN_IN_PATHS = ["/sign-in/email", "/sign-in/social"];

function clientIp(request: Request): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

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
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (session?.user) {
    const userName =
      session.user.name || session.user.email?.split("@")[0] || "Usuario";

    const appUser: AppUser = {
      id: session.user.id,
      email: session.user.email ?? null,
      name: userName,
      image: session.user.image ?? null,
      role:
        ((session.user as Record<string, unknown>).role as string) ?? "USER",
    };

    context.locals.user = appUser;
    context.locals.session = { user: appUser };

    const url = new URL(context.request.url);
    detectSignInEvent(url.pathname, session.user.id, context.request);

    if (!globals.__plansSeeded) {
      globals.__plansSeeded = true;
      seedSubscriptionPlans().catch(() => {});
    }

    const subCacheKey = `sub:${session.user.id}`;
    let sub =
      await cacheGet<ReturnType<typeof resolveSubscription>>(subCacheKey);
    if (!sub) {
      try {
        const dbSub = await getUserSubscription(session.user.id);
        sub = resolveSubscription(dbSub);
      } catch {
        sub = resolveSubscription(null);
      }
      await cacheSet(subCacheKey, sub, 300);
    } else {
      if (sub.currentPeriodEnd) {
        sub.currentPeriodEnd = new Date(sub.currentPeriodEnd);
      }
      if (sub.trialEnd) {
        sub.trialEnd = new Date(sub.trialEnd);
      }
    }
    context.locals.subscription = sub;

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
    context.locals.user = null;
    context.locals.session = null;
    context.locals.subscription = resolveSubscription(null);
    context.locals.csrfToken = null;
  }

  const response = await next();
  setSecurityHeaders(response);
  return response;
});
