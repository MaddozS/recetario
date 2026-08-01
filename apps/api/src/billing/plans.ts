import type { Handler } from "hono";
import { getSubscriptionPlans, seedSubscriptionPlans } from "@recetario/db";
import { plansListResponseSchema } from "@recetario/types";
import * as cache from "../cache";

const CACHE_TTL_MS = 60_000;
const CACHE_KEY = "plans:all";

export function plansHandler(): Handler {
  return async (c) => {
    const cached = cache.get<unknown>(CACHE_KEY);
    if (cached !== undefined) {
      return c.json(cached);
    }

    await seedSubscriptionPlans();

    const rows = await getSubscriptionPlans(true);

    const plans = rows.map(({ featuresJson, ...rest }) => ({
      ...rest,
      features: JSON.parse(featuresJson),
    }));

    const validated = plansListResponseSchema.parse(plans);

    cache.set(CACHE_KEY, validated, CACHE_TTL_MS);
    return c.json(validated);
  };
}
