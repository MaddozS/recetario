import type { Handler } from "hono";
import { auth } from "@recetario/auth/server";
import { getSubscriptionByUserId, seedSubscriptionPlans } from "@recetario/db";
import { resolveSubscription } from "@recetario/billing";
import { ApiError } from "../errors";
import * as cache from "../cache";

const CACHE_TTL_MS = 60_000;

export function subscriptionHandler(): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session?.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }

    const cacheKey = `sub:${session.user.id}`;
    const cached = cache.get<unknown>(cacheKey);
    if (cached !== undefined) {
      return c.json(cached);
    }

    await seedSubscriptionPlans();

    const dbSub = await getSubscriptionByUserId(session.user.id, [
      "active",
      "trialing",
    ]);
    if (!dbSub) {
      throw new ApiError("NOT_FOUND", "No active subscription");
    }

    const resolved = resolveSubscription({
      id: dbSub.id,
      userId: dbSub.userId,
      stripeCustomerId: dbSub.stripeCustomerId,
      stripeSubscriptionId: dbSub.stripeSubscriptionId,
      planId: dbSub.planId,
      status: dbSub.status,
      tier: dbSub.plan?.tier ?? "free",
      recipesLimit: dbSub.plan?.recipesLimit ?? null,
      ingredientsLimit: dbSub.plan?.ingredientsLimit ?? null,
      features: JSON.parse(dbSub.plan?.featuresJson ?? "{}"),
      priceCents: dbSub.plan?.priceCents ?? null,
      currency: dbSub.plan?.currency ?? null,
      billingInterval: dbSub.plan?.billingInterval ?? null,
      currentPeriodStart: dbSub.currentPeriodStart,
      currentPeriodEnd: dbSub.currentPeriodEnd,
      cancelAtPeriodEnd: dbSub.cancelAtPeriodEnd,
      trialEnd: dbSub.trialEnd,
      createdAt: dbSub.createdAt,
    });
    cache.set(cacheKey, resolved, CACHE_TTL_MS);
    return c.json(resolved);
  };
}
