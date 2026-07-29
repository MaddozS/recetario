import type { Handler } from "hono";
import * as cache from "../cache.js";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";
import { seedSubscriptionPlans } from "@recetario/billing/server";

const CACHE_TTL_MS = 60_000;
const CACHE_KEY = "plans:all";

export function plansHandler(): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma) => {
      const cached = cache.get<unknown>(CACHE_KEY);
      if (cached !== undefined) {
        return c.json(cached);
      }

      // ponytail: lazy-seed plans on first request; idempotent
      await seedSubscriptionPlans(prisma);

      const rows = await prisma.subscriptionPlan.findMany({
        where: { active: true },
        orderBy: { priceCents: "asc" },
      });

      const plans = rows.map(({ featuresJson, ...rest }) => ({
        ...rest,
        features: JSON.parse(featuresJson),
      }));

      cache.set(CACHE_KEY, plans, CACHE_TTL_MS);
      return c.json(plans);
    });
}
