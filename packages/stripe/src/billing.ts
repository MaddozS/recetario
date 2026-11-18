import {
  getSubscriptionPlans,
  getSubscriptionPlanByStripePriceId,
  getStripeCustomerId as getStripeCustomerIdFromDb,
} from '@recetario/db';
import { pricingPlanSchema, type PricingPlan } from '@recetario/types';
import { TIER_CONFIG } from './plans-config';

export type { PricingPlan } from '@recetario/types';

export async function getPricingPlans(): Promise<PricingPlan[]> {
  const rows = await getSubscriptionPlans(true);
  return buildPricingPlans(rows.filter((row) => row.tier !== 'free'));
}

export async function getPlanByStripePriceId(stripePriceId: string) {
  const data = await getSubscriptionPlanByStripePriceId(stripePriceId);
  if (!data) return null;
  return { id: data.id, tier: data.tier, name: data.name, stripePriceId: data.stripePriceId };
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  return getStripeCustomerIdFromDb(userId);
}

export function buildPricingPlans(
  rawPlans: Array<{ id: string; stripePriceId: string; priceCents: number; currency: string }>
): PricingPlan[] {
  const priceMap = new Map(rawPlans.map((plan) => [plan.id, plan]));
  return Object.entries(TIER_CONFIG).map(([tier, config]) => {
    const monthly = priceMap.get(`${tier}_monthly`);
    const yearly = priceMap.get(`${tier}_yearly`);
    return pricingPlanSchema.parse({
      id: tier,
      tier,
      name: config.name,
      description: config.description,
      badge: config.badge,
      currency: (monthly?.currency ?? yearly?.currency ?? 'MXN').toUpperCase(),
      monthlyPriceId: monthly?.stripePriceId ?? null,
      monthlyDisplay: monthly ? `$${(monthly.priceCents / 100).toFixed(2)}` : null,
      yearlyPriceId: yearly?.stripePriceId ?? null,
      yearlyDisplay: yearly ? `$${(yearly.priceCents / 100).toFixed(2)}` : null,
      yearlyPerMonthDisplay: yearly ? `$${(yearly.priceCents / 12 / 100).toFixed(2)}` : null,
      features: config.features,
    });
  });
}
