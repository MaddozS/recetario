import {
  getSubscriptionPlans,
  getSubscriptionPlanByStripePriceId,
  getSubscriptionByUserId,
  getSubscriptionByStripeId,
  upsertSubscription,
  updateSubscription,
  getStripeCustomerId as getStripeCustomerIdFromDb,
  seedSubscriptionPlans,
} from "@recetario/db";
import { TIER_CONFIG } from "./plans-config";
import { buildPricingPlans } from "./pricing-plans";
import type { PricingPlan } from "./pricing-plans";

const KNOWN_TIERS = Object.keys(TIER_CONFIG).filter((t) => t !== "free");

export type { PricingPlan };

export async function getPricingPlans(): Promise<PricingPlan[]> {
  let plans = await getSubscriptionPlans(true);
  plans = plans.filter((p) => KNOWN_TIERS.includes(p.tier));

  if (plans.length === 0) {
    await seedSubscriptionPlans();
    plans = await getSubscriptionPlans(true);
    plans = plans.filter((p) => KNOWN_TIERS.includes(p.tier));
  }

  return buildPricingPlans(plans);
}

export type UserSubscription = {
  id: string;
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  planId: string;
  status: string;
  tier: string;
  recipesLimit: number | null;
  ingredientsLimit: number | null;
  features: Record<string, boolean>;
  priceCents: number | null;
  currency: string | null;
  billingInterval: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
  createdAt: Date;
};

export type CreateSubscriptionInput = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  userId: string | null;
  planId: string | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd?: Date | null;
};

export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const data = await getSubscriptionByUserId(userId, ["active", "trialing"]);
  if (!data) return null;

  return {
    id: data.id,
    userId: data.userId,
    stripeCustomerId: data.stripeCustomerId,
    stripeSubscriptionId: data.stripeSubscriptionId,
    planId: data.planId,
    status: data.status,
    tier: data.plan?.tier ?? "free",
    recipesLimit: data.plan?.recipesLimit ?? null,
    ingredientsLimit: data.plan?.ingredientsLimit ?? null,
    features: parseFeaturesJson(data.plan?.featuresJson ?? "{}"),
    priceCents: data.plan?.priceCents ?? null,
    currency: data.plan?.currency ?? null,
    billingInterval: data.plan?.billingInterval ?? null,
    currentPeriodStart: data.currentPeriodStart,
    currentPeriodEnd: data.currentPeriodEnd,
    cancelAtPeriodEnd: data.cancelAtPeriodEnd,
    trialEnd: data.trialEnd,
    createdAt: data.createdAt,
  };
}

export async function createOrUpdateSubscription(
  input: CreateSubscriptionInput,
): Promise<void> {
  let resolvedPlanId = input.planId;
  let resolvedUserId = input.userId;

  if (!resolvedPlanId) {
    const plan = await getSubscriptionPlanByStripePriceId(input.stripeSubscriptionId);
    if (plan) resolvedPlanId = plan.id;
  }

  if (!resolvedUserId) {
    const sub = await getSubscriptionByStripeId(input.stripeSubscriptionId);
    if (sub) resolvedUserId = sub.userId;
  }

  if (!resolvedPlanId || !resolvedUserId) return;

  await upsertSubscription(input.stripeSubscriptionId, {
    id: input.stripeSubscriptionId,
    userId: resolvedUserId,
    stripeCustomerId: input.stripeCustomerId,
    planId: resolvedPlanId,
    status: input.status,
    currentPeriodStart: input.currentPeriodStart,
    currentPeriodEnd: input.currentPeriodEnd,
    cancelAtPeriodEnd: input.cancelAtPeriodEnd,
    trialEnd: input.trialEnd ?? null,
  });
}

export async function cancelSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  const sub = await getSubscriptionByStripeId(stripeSubscriptionId);
  if (!sub) return;
  await updateSubscription(stripeSubscriptionId, {
    status: "canceled",
    cancelAtPeriodEnd: true,
  });
}

export async function markSubscriptionPastDue(
  stripeSubscriptionId: string,
): Promise<void> {
  const sub = await getSubscriptionByStripeId(stripeSubscriptionId);
  if (!sub) return;
  await updateSubscription(stripeSubscriptionId, {
    status: "past_due",
  });
}

export async function getPlanByStripePriceId(
  stripePriceId: string,
): Promise<{
  id: string;
  tier: string;
  name: string;
  stripePriceId: string;
} | null> {
  const data = await getSubscriptionPlanByStripePriceId(stripePriceId);
  if (!data) return null;
  return {
    id: data.id,
    tier: data.tier,
    name: data.name,
    stripePriceId: data.stripePriceId,
  };
}

export async function getStripeCustomerId(
  userId: string,
): Promise<string | null> {
  return getStripeCustomerIdFromDb(userId);
}

function parseFeaturesJson(
  raw: string | Record<string, unknown>,
): Record<string, boolean> {
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (parsed && typeof parsed === "object") {
      const result: Record<string, boolean> = {};
      for (const [key, value] of Object.entries(parsed)) {
        result[key] = Boolean(value);
      }
      return result;
    }
    return {};
  } catch {
    return {};
  }
}
