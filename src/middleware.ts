import { auth } from "./lib/auth";
import { defineMiddleware } from "astro:middleware";
import { getUserSubscription, seedSubscriptionPlans } from "./lib/recipe-data";
import { resolveSubscription } from "./lib/subscription";

const globals = globalThis as typeof globalThis & {
  __plansSeeded?: boolean;
};

export const onRequest = defineMiddleware(async (context, next) => {
  try {
    const session = await auth.api.getSession({
      headers: context.request.headers,
    });
    if (session?.session && session?.user) {
      context.locals.user = session.user;
      context.locals.session = session.session;

      if (!globals.__plansSeeded) {
        globals.__plansSeeded = true;
        try {
          await seedSubscriptionPlans();
        } catch {
          /* ignore */
        }
      }

      try {
        const dbSub = await getUserSubscription(session.user.id);
        context.locals.subscription = resolveSubscription(dbSub);
      } catch {
        context.locals.subscription = resolveSubscription(null);
      }
    } else {
      context.locals.user = null;
      context.locals.session = null;
      context.locals.subscription = resolveSubscription(null);
    }
  } catch {
    context.locals.user = null;
    context.locals.session = null;
    context.locals.subscription = resolveSubscription(null);
  }

  return next();
});
