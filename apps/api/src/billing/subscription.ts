import type { Handler } from "hono";
import { prisma } from "@recetario/db";
import { auth } from "@recetario/auth/server";
import { getUserSubscription, seedSubscriptionPlans } from "@recetario/billing/server";
import { resolveSubscription } from "@recetario/billing";
import { ApiError } from "../errors.js";
import * as cache from "../cache.js";

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

    await seedSubscriptionPlans(prisma);

    const dbSub = await getUserSubscription(session.user.id, prisma);
    if (!dbSub) {
      throw new ApiError("NOT_FOUND", "No active subscription");
    }

    const resolved = resolveSubscription(dbSub);
    cache.set(cacheKey, resolved, CACHE_TTL_MS);
    return c.json(resolved);
  };
}
