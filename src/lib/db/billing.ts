import { prisma } from "@/lib/prisma";
import { cacheDelete } from "@/lib/cache";
import { stripe } from "@/lib/stripe";
import { TIER_CONFIG } from "@/lib/plans-config";
import { formatCurrency } from "@/lib/formatters";
import type Stripe from "stripe";

async function invalidateSubCache(userId: string) {
  await cacheDelete(`sub:${userId}`);
}

const BASIC_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
  production_save: false,
  production_advanced: false,
  pdf_export: false,
  advanced_costs: false,
  change_history: false,
  data_import_export: false,
  nutrition_info: false,
  cooking_mode: false,
};

const PRO_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
  production_save: true,
  production_advanced: true,
  pdf_export: true,
  advanced_costs: true,
  change_history: true,
  data_import_export: true,
  nutrition_info: true,
  cooking_mode: true,
};

const FEATURE_FLAGS: Record<string, Record<string, boolean>> = {
  basic: BASIC_FEATURES,
  pro: PRO_FEATURES,
};

const KNOWN_TIERS = Object.keys(TIER_CONFIG).filter((t) => t !== "free");

async function syncPlansFromStripe(): Promise<void> {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
    limit: 100,
  });

  const syncedIds: string[] = [];

  for (const price of prices.data) {
    const product = price.product as Stripe.Product;
    const tier = product.metadata?.tier;
    if (!tier || !KNOWN_TIERS.includes(tier)) continue;

    const interval = price.recurring?.interval ?? "";
    if (!["month", "year"].includes(interval)) continue;

    const id = `${tier}_${interval}ly`;
    syncedIds.push(id);
    const featuresJson = JSON.stringify(FEATURE_FLAGS[tier] ?? {});

    await prisma.subscriptionPlan.upsert({
      where: { id },
      update: {
        stripePriceId: price.id,
        name: product.name,
        tier,
        billingInterval: interval === "month" ? "monthly" : "yearly",
        priceCents: price.unit_amount ?? 0,
        currency: price.currency ?? "usd",
        recipesLimit: product.metadata?.recipes_limit
          ? parseInt(product.metadata.recipes_limit)
          : null,
        ingredientsLimit: product.metadata?.ingredients_limit
          ? parseInt(product.metadata.ingredients_limit)
          : null,
        featuresJson,
        active: true,
      },
      create: {
        id,
        stripePriceId: price.id,
        name: product.name,
        tier,
        billingInterval: interval === "month" ? "monthly" : "yearly",
        priceCents: price.unit_amount ?? 0,
        currency: price.currency ?? "usd",
        recipesLimit: product.metadata?.recipes_limit
          ? parseInt(product.metadata.recipes_limit)
          : null,
        ingredientsLimit: product.metadata?.ingredients_limit
          ? parseInt(product.metadata.ingredients_limit)
          : null,
        featuresJson,
        active: true,
      },
    });
  }

  if (syncedIds.length > 0) {
    await prisma.subscriptionPlan.updateMany({
      where: {
        id: { notIn: syncedIds },
        tier: { in: KNOWN_TIERS },
        active: true,
      },
      data: { active: false },
    });
  }
}

export async function seedSubscriptionPlans(): Promise<void> {
  try {
    await syncPlansFromStripe();
  } catch (error) {
    console.error("Failed to sync plans from Stripe:", error);
  }
}

export interface PricingPlan {
  id: string;
  tier: string;
  name: string;
  description: string;
  badge: { text: string; class: string } | null;
  currency: string;
  monthlyPriceId: string | null;
  monthlyDisplay: string | null;
  yearlyPriceId: string | null;
  yearlyDisplay: string | null;
  yearlyPerMonthDisplay: string | null;
  features: { text: string; included: boolean; status?: "coming_soon" }[];
}

export async function getPricingPlans(): Promise<PricingPlan[]> {
  let plans = await prisma.subscriptionPlan.findMany({
    where: { active: true, tier: { in: KNOWN_TIERS } },
    orderBy: { id: "asc" },
  });

  if (plans.length === 0) {
    await seedSubscriptionPlans();
    plans = await prisma.subscriptionPlan.findMany({
      where: { active: true, tier: { in: KNOWN_TIERS } },
      orderBy: { id: "asc" },
    });
  }

  const priceMap: Record<
    string,
    { priceId: string; priceCents: number; currency: string }
  > = {};
  for (const plan of plans) {
    priceMap[plan.id] = {
      priceId: plan.stripePriceId,
      priceCents: plan.priceCents,
      currency: plan.currency,
    };
  }

  const result: PricingPlan[] = [];

  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    if (tier === "free") {
      result.push({
        id: "free",
        tier: "free",
        name: config.name,
        description: config.description,
        badge: config.badge,
        currency: "USD",
        monthlyPriceId: null,
        monthlyDisplay: null,
        yearlyPriceId: null,
        yearlyDisplay: null,
        yearlyPerMonthDisplay: null,
        features: config.features,
      });
      continue;
    }

    const monthlyKey = `${tier}_monthly`;
    const yearlyKey = `${tier}_yearly`;

    const monthly = priceMap[monthlyKey] ?? null;
    const yearly = priceMap[yearlyKey] ?? null;

    const monthlyDisplay = monthly
      ? formatCurrency(monthly.priceCents / 100)
      : "—";
    const yearlyDisplay = yearly
      ? formatCurrency(yearly.priceCents / 100)
      : "—";
    const yearlyPerMonthDisplay = yearly
      ? formatCurrency(yearly.priceCents / 12 / 100)
      : "—";

    result.push({
      id: tier,
      tier,
      name: config.name,
      description: config.description,
      badge: config.badge,
      currency: (monthly?.currency ?? yearly?.currency ?? "MXN").toUpperCase(),
      monthlyPriceId: monthly?.priceId ?? null,
      monthlyDisplay,
      yearlyPriceId: yearly?.priceId ?? null,
      yearlyDisplay,
      yearlyPerMonthDisplay,
      features: config.features,
    });
  }

  return result;
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

export async function getUserSubscription(
  userId: string,
): Promise<UserSubscription | null> {
  const data = await prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ["active", "trialing"] },
    },
    include: {
      plan: true,
    },
    orderBy: { createdAt: "desc" },
  });

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
    const plan = await prisma.subscriptionPlan.findFirst({
      where: { stripePriceId: input.stripeSubscriptionId },
    });
    if (plan) resolvedPlanId = plan.id;
  }

  if (!resolvedUserId) {
    const sub = await prisma.subscription.findUnique({
      where: { stripeSubscriptionId: input.stripeSubscriptionId },
    });
    if (sub) resolvedUserId = sub.userId;
  }

  if (!resolvedPlanId || !resolvedUserId) return;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: input.stripeSubscriptionId },
    update: {
      id: input.stripeSubscriptionId,
      userId: resolvedUserId,
      stripeCustomerId: input.stripeCustomerId,
      planId: resolvedPlanId,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      trialEnd: input.trialEnd ?? null,
    },
    create: {
      id: input.stripeSubscriptionId,
      userId: resolvedUserId,
      stripeCustomerId: input.stripeCustomerId,
      stripeSubscriptionId: input.stripeSubscriptionId,
      planId: resolvedPlanId,
      status: input.status,
      currentPeriodStart: input.currentPeriodStart,
      currentPeriodEnd: input.currentPeriodEnd,
      cancelAtPeriodEnd: input.cancelAtPeriodEnd,
      trialEnd: input.trialEnd ?? null,
    },
  });

  await invalidateSubCache(resolvedUserId);
}

export async function cancelSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { userId: true },
  });
  if (!sub) return;
  await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: { status: "canceled", cancelAtPeriodEnd: true },
  });
  await invalidateSubCache(sub.userId);
}

export async function markSubscriptionPastDue(
  stripeSubscriptionId: string,
): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { userId: true },
  });
  if (!sub) return;
  await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: { status: "past_due" },
  });
  await invalidateSubCache(sub.userId);
}

export async function getPlanByStripePriceId(stripePriceId: string): Promise<{
  id: string;
  tier: string;
  name: string;
  stripePriceId: string;
} | null> {
  const data = await prisma.subscriptionPlan.findFirst({
    where: { stripePriceId },
  });
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
  const data = await prisma.subscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
    select: { stripeCustomerId: true },
    orderBy: { createdAt: "desc" },
  });
  return data?.stripeCustomerId ?? null;
}

export async function countUserRecipes(ownerId: string): Promise<number> {
  return prisma.recipe.count({ where: { ownerId } });
}

export async function countUserIngredients(ownerId: string): Promise<number> {
  return prisma.ingredient.count({ where: { ownerId } });
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
