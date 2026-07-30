import { prisma, cacheDelete } from "@recetario/db";
import type { PrismaClient } from "@recetario/db";
import { stripe } from "./stripe";
import { TIER_CONFIG } from "./plans-config";
import { buildPricingPlans } from "./pricing-plans";
import type { PricingPlan } from "./pricing-plans";
import type Stripe from "stripe";

// ponytail: every function takes an optional `db` so the API worker
// can pass a per-request client (see apps/api/src/fresh-db.ts and
// memory #63). Web keeps using the singleton.

async function invalidateSubCache(userId: string, db: PrismaClient) {
  await cacheDelete(`sub:${userId}`, db);
}

const BASIC_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: true,
  production_save: false,
  production_advanced: false,
  pdf_export: false,
  advanced_costs: true,
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

export async function syncPlansFromStripe(
  db: PrismaClient = prisma,
): Promise<void> {
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

    await db.subscriptionPlan.upsert({
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
    await db.subscriptionPlan.updateMany({
      where: {
        id: { notIn: syncedIds },
        tier: { in: KNOWN_TIERS },
        active: true,
      },
      data: { active: false },
    });
  }
}

export async function seedSubscriptionPlans(
  db: PrismaClient = prisma,
): Promise<void> {
  try {
    await syncPlansFromStripe(db);
  } catch (error) {
    console.error("Failed to sync plans from Stripe:", error);
  }
}

export type { PricingPlan };

export async function getPricingPlans(
  db: PrismaClient = prisma,
): Promise<PricingPlan[]> {
  let plans = await db.subscriptionPlan.findMany({
    where: { active: true, tier: { in: KNOWN_TIERS } },
    orderBy: { id: "asc" },
  });

  if (plans.length === 0) {
    await seedSubscriptionPlans(db);
    plans = await db.subscriptionPlan.findMany({
      where: { active: true, tier: { in: KNOWN_TIERS } },
      orderBy: { id: "asc" },
    });
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

export async function getUserSubscription(
  userId: string,
  db: PrismaClient = prisma,
): Promise<UserSubscription | null> {
  const data = await db.subscription.findFirst({
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
  db: PrismaClient = prisma,
): Promise<void> {
  let resolvedPlanId = input.planId;
  let resolvedUserId = input.userId;

  if (!resolvedPlanId) {
    const plan = await db.subscriptionPlan.findFirst({
      where: { stripePriceId: input.stripeSubscriptionId },
    });
    if (plan) resolvedPlanId = plan.id;
  }

  if (!resolvedUserId) {
    const sub = await db.subscription.findUnique({
      where: { stripeSubscriptionId: input.stripeSubscriptionId },
    });
    if (sub) resolvedUserId = sub.userId;
  }

  if (!resolvedPlanId || !resolvedUserId) return;

  await db.subscription.upsert({
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

  await invalidateSubCache(resolvedUserId, db);
}

export async function cancelSubscription(
  stripeSubscriptionId: string,
  db: PrismaClient = prisma,
): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { userId: true },
  });
  if (!sub) return;
  await db.subscription.update({
    where: { stripeSubscriptionId },
    data: { status: "canceled", cancelAtPeriodEnd: true },
  });
  await invalidateSubCache(sub.userId, db);
}

export async function markSubscriptionPastDue(
  stripeSubscriptionId: string,
  db: PrismaClient = prisma,
): Promise<void> {
  const sub = await db.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { userId: true },
  });
  if (!sub) return;
  await db.subscription.update({
    where: { stripeSubscriptionId },
    data: { status: "past_due" },
  });
  await invalidateSubCache(sub.userId, db);
}

export async function getPlanByStripePriceId(
  stripePriceId: string,
  db: PrismaClient = prisma,
): Promise<{
  id: string;
  tier: string;
  name: string;
  stripePriceId: string;
} | null> {
  const data = await db.subscriptionPlan.findFirst({
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
  db: PrismaClient = prisma,
): Promise<string | null> {
  const data = await db.subscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
    select: { stripeCustomerId: true },
    orderBy: { createdAt: "desc" },
  });
  return data?.stripeCustomerId ?? null;
}

export async function countUserRecipes(
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<number> {
  return db.recipe.count({ where: { ownerId } });
}

export async function countUserIngredients(
  ownerId: string,
  db: PrismaClient = prisma,
): Promise<number> {
  return db.ingredient.count({ where: { ownerId } });
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
