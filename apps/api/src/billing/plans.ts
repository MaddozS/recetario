import type { Handler } from 'hono';
import { getPricingPlans } from '@recetario/stripe/server';
import { plansListResponseSchema } from '@recetario/types';

export function plansHandler(): Handler {
  return async (c) => {
    const plans = plansListResponseSchema.parse(await getPricingPlans());
    return c.json(plans);
  };
}
