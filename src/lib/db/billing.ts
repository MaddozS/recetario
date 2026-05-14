import { prisma } from "@/lib/prisma";
import { cacheSet } from "@/lib/cache";

function invalidateSubCache(userId: string) {
  cacheSet(`sub:${userId}`, undefined, 0);
}

const BASIC_FEATURES: Record<string, boolean> = {
  recipe_duplicate: true,
  recipe_photos: true,
  stock_tracking: true,
  production_planner: false,
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
  pdf_export: true,
  advanced_costs: true,
  change_history: true,
  data_import_export: true,
  nutrition_info: true,
  cooking_mode: true,
};

const SEED_PLANS = [
  {
    id: "basic_monthly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_BASIC_MONTHLY ||
      process.env.STRIPE_PRICE_ID_BASIC_MONTHLY ||
      "",
    name: "KitchCalc Basic",
    tier: "basic",
    billingInterval: "monthly",
    priceCents: 500,
    recipesLimit: 75,
    ingredientsLimit: null as number | null,
    featuresJson: BASIC_FEATURES,
  },
  {
    id: "basic_yearly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_BASIC_YEARLY ||
      process.env.STRIPE_PRICE_ID_BASIC_YEARLY ||
      "",
    name: "KitchCalc Basic",
    tier: "basic",
    billingInterval: "yearly",
    priceCents: 4800,
    recipesLimit: 75,
    ingredientsLimit: null as number | null,
    featuresJson: BASIC_FEATURES,
  },
  {
    id: "pro_monthly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_PRO_MONTHLY ||
      process.env.STRIPE_PRICE_ID_PRO_MONTHLY ||
      "",
    name: "KitchCalc Pro",
    tier: "pro",
    billingInterval: "monthly",
    priceCents: 1000,
    recipesLimit: null as number | null,
    ingredientsLimit: null as number | null,
    featuresJson: PRO_FEATURES,
  },
  {
    id: "pro_yearly",
    stripePriceId:
      import.meta.env.STRIPE_PRICE_ID_PRO_YEARLY ||
      process.env.STRIPE_PRICE_ID_PRO_YEARLY ||
      "",
    name: "KitchCalc Pro",
    tier: "pro",
    billingInterval: "yearly",
    priceCents: 8400,
    recipesLimit: null as number | null,
    ingredientsLimit: null as number | null,
    featuresJson: PRO_FEATURES,
  },
];

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

export async function seedSubscriptionPlans(): Promise<void> {
  for (const plan of SEED_PLANS) {
    if (!plan.stripePriceId) continue;

    try {
      await prisma.subscriptionPlan.upsert({
        where: { id: plan.id },
        update: {
          stripePriceId: plan.stripePriceId,
          name: plan.name,
          tier: plan.tier,
          billingInterval: plan.billingInterval,
          priceCents: plan.priceCents,
          recipesLimit: plan.recipesLimit,
          ingredientsLimit: plan.ingredientsLimit,
          featuresJson: JSON.stringify(plan.featuresJson),
        },
        create: {
          id: plan.id,
          stripePriceId: plan.stripePriceId,
          name: plan.name,
          tier: plan.tier,
          billingInterval: plan.billingInterval,
          priceCents: plan.priceCents,
          recipesLimit: plan.recipesLimit,
          ingredientsLimit: plan.ingredientsLimit,
          featuresJson: JSON.stringify(plan.featuresJson),
        },
      });
    } catch (error) {
      console.error("Failed to seed plan:", plan.id, error);
    }
  }
}

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

  const id = `sub_${resolvedUserId}_${resolvedPlanId}`;

  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: input.stripeSubscriptionId },
    update: {
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
      id,
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

  invalidateSubCache(resolvedUserId);
}

export async function cancelSubscription(
  stripeSubscriptionId: string,
): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { userId: true },
  });
  await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: { status: "canceled", cancelAtPeriodEnd: true },
  });
  if (sub) invalidateSubCache(sub.userId);
}

export async function markSubscriptionPastDue(
  stripeSubscriptionId: string,
): Promise<void> {
  const sub = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    select: { userId: true },
  });
  await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: { status: "past_due" },
  });
  if (sub) invalidateSubCache(sub.userId);
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
