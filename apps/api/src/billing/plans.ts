import type { Handler } from "hono";
import { getPricingPlans } from "@recetario/stripe/server";
import { plansListResponseSchema } from "@recetario/types";
import * as cache from "../cache";

const CACHE_TTL_MS = 60_000;
const CACHE_KEY = "plans:all";

export function plansHandler(): Handler {
  return async (c) => {
    const cached = cache.get<unknown>(CACHE_KEY);
    if (cached !== undefined) return c.json(cached);

    const plans = plansListResponseSchema.parse(await getPricingPlans());
    cache.set(CACHE_KEY, plans, CACHE_TTL_MS);
    return c.json(plans);
  };
}
