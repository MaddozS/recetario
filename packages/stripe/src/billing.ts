import { getSubscriptionPlans, getSubscriptionByUserId, getSubscriptionPlanByStripePriceId, getStripeCustomerId as getStripeCustomerIdFromDb } from "@recetario/db";
import { pricingPlanSchema, userSubscriptionSchema, type PricingPlan, type UserSubscription } from "@recetario/types";
import { TIER_CONFIG } from "./plans-config";

export type { PricingPlan, UserSubscription } from "@recetario/types";

export async function getPricingPlans(): Promise<PricingPlan[]> {
  const rows = await getSubscriptionPlans(true);
  return buildPricingPlans(rows.filter((row) => row.tier !== "free"));
}

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const data = await getSubscriptionByUserId(userId, ["active", "trialing", "canceled", "past_due"]);
  if (!data) return null;

  const now = new Date();
  if (data.status === "canceled" && data.currentPeriodEnd && data.currentPeriodEnd <= now) {
    return null;
  }

  const cancelAtPeriodEnd = data.cancelAtPeriodEnd || data.status === "canceled";

  return userSubscriptionSchema.parse({
    ...data,
    stripeSubscriptionId: data.stripeSubscriptionId,
    tier: data.plan?.tier ?? "free",
    recipesLimit: data.plan?.recipesLimit ?? null,
    ingredientsLimit: data.plan?.ingredientsLimit ?? null,
    features: parseFeaturesJson(data.plan?.featuresJson ?? "{}"),
    priceCents: data.plan?.priceCents ?? null,
    currency: data.plan?.currency ?? null,
    billingInterval: data.plan?.billingInterval ?? null,
    currentPeriodStart: data.currentPeriodStart?.toISOString() ?? null,
    currentPeriodEnd: data.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd,
    trialEnd: data.trialEnd?.toISOString() ?? null,
    createdAt: data.createdAt.toISOString(),
  });
}

export async function getPlanByStripePriceId(stripePriceId: string) {
  const data = await getSubscriptionPlanByStripePriceId(stripePriceId);
  if (!data) return null;
  return { id: data.id, tier: data.tier, name: data.name, stripePriceId: data.stripePriceId };
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
  return getStripeCustomerIdFromDb(userId);
}

export function buildPricingPlans(rawPlans: Array<{ id: string; stripePriceId: string; priceCents: number; currency: string }>): PricingPlan[] {
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
      currency: (monthly?.currency ?? yearly?.currency ?? "MXN").toUpperCase(),
      monthlyPriceId: monthly?.stripePriceId ?? null,
      monthlyDisplay: monthly ? `$${(monthly.priceCents / 100).toFixed(2)}` : null,
      yearlyPriceId: yearly?.stripePriceId ?? null,
      yearlyDisplay: yearly ? `$${(yearly.priceCents / 100).toFixed(2)}` : null,
      yearlyPerMonthDisplay: yearly ? `$${(yearly.priceCents / 12 / 100).toFixed(2)}` : null,
      features: config.features,
    });
  });
}

function parseFeaturesJson(raw: string | Record<string, unknown>): Record<string, boolean> {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return parsed && typeof parsed === "object"
      ? Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, Boolean(value)]))
      : {};
  } catch {
    return {};
  }
}
