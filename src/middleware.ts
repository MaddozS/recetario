import { defineMiddleware } from "astro:middleware";
import { auth } from "@/lib/auth";
import { getUserSubscription, seedSubscriptionPlans } from "@/lib/db/billing";
import { resolveSubscription } from "@/lib/subscription";
import { cacheGet, cacheSet } from "@/lib/cache";
import {
  generateToken,
  getCsrfCookie,
} from "@/lib/csrf";

const globals = globalThis as typeof globalThis & {
  __plansSeeded?: boolean;
};

function setSecurityHeaders(response: Response): void {
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
}

export const onRequest = defineMiddleware(async (context, next) => {
  const session = await auth.api.getSession({
    headers: context.request.headers,
  });

  if (session?.user) {
    const userName =
      session.user.name || session.user.email?.split("@")[0] || "Usuario";

    context.locals.user = {
      id: session.user.id,
      email: session.user.email ?? null,
      name: userName,
      image: session.user.image ?? null,
    };

    context.locals.session = { user: context.locals.user };

    if (!globals.__plansSeeded) {
      globals.__plansSeeded = true;
      seedSubscriptionPlans().catch(() => {});
    }

    const subCacheKey = `sub:${session.user.id}`;
    let sub = cacheGet<ReturnType<typeof resolveSubscription>>(subCacheKey);
    if (!sub) {
      try {
        const dbSub = await getUserSubscription(session.user.id);
        sub = resolveSubscription(dbSub);
      } catch {
        sub = resolveSubscription(null);
      }
      cacheSet(subCacheKey, sub, 60);
    }
    context.locals.subscription = sub;

    const csrfToken = generateToken();
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
