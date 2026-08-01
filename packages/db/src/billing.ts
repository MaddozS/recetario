import Stripe from "stripe";
import { lazyInit } from "@recetario/config/lazy";
import { prisma } from "./prisma";
import type {
  SubscriptionUncheckedCreateInput,
  SubscriptionUncheckedUpdateInput,
  SubscriptionPlanUncheckedCreateInput,
  SubscriptionPlanUncheckedUpdateInput,
  SubscriptionGetPayload,
} from "../prisma/generated/models";

// ponytail: lazy init — avoids reading STRIPE_SECRET_KEY at import time
// in Vite SSR where .env isn't loaded into process.env.
function initStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secret, {
    apiVersion: "2026-04-22.dahlia",
  });
}

export const stripe = lazyInit("stripe", initStripe);

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

export const FEATURE_FLAGS: Record<string, Record<string, boolean>> = {
  basic: BASIC_FEATURES,
  pro: PRO_FEATURES,
};

export async function getSubscriptionPlans(activeOnly = true) {
  const rows = await prisma.subscriptionPlan.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { priceCents: "asc" },
  });
  return rows;
}

export async function getSubscriptionPlanById(id: string) {
  const row = await prisma.subscriptionPlan.findUnique({ where: { id } });
  return row;
}

export async function getSubscriptionPlanByStripePriceId(stripePriceId: string) {
  const row = await prisma.subscriptionPlan.findFirst({
    where: { stripePriceId },
  });
  return row;
}

export async function upsertSubscriptionPlan(
  id: string,
  input: Omit<SubscriptionPlanUncheckedCreateInput, "id">,
) {
  const row = await prisma.subscriptionPlan.upsert({
    where: { id },
    update: input,
    create: { id, ...input },
  });
  return row;
}

export async function deactivatePlansNotIn(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.subscriptionPlan.updateMany({
    where: { id: { notIn: ids }, active: true },
    data: { active: false },
  });
}

export async function syncPlansFromStripe(): Promise<void> {
  const prices = await stripe.prices.list({
    active: true,
    expand: ["data.product"],
    limit: 100,
  });

  const syncedIds: string[] = [];

  for (const price of prices.data) {
    const product = price.product as Stripe.Product;
    const tier = product.metadata?.tier;
    if (!tier || !FEATURE_FLAGS[tier]) continue;

    const interval = price.recurring?.interval ?? "";
    if (!["month", "year"].includes(interval)) continue;

    const id = `${tier}_${interval}ly`;
    syncedIds.push(id);
    const featuresJson = JSON.stringify(FEATURE_FLAGS[tier] ?? {});

    await upsertSubscriptionPlan(id, {
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
    });
  }

  if (syncedIds.length > 0) {
    await deactivatePlansNotIn(syncedIds);
  }
}

export async function seedSubscriptionPlans(): Promise<void> {
  try {
    await syncPlansFromStripe();
  } catch (error) {
    console.error("Failed to sync plans from Stripe:", error);
  }
}

export async function getSubscriptionByUserId(
  userId: string,
  statuses?: string[],
): Promise<SubscriptionGetPayload<{ include: { plan: true } }> | null> {
  const row = await prisma.subscription.findFirst({
    where: {
      userId,
      ...(statuses ? { status: { in: statuses } } : {}),
    },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return row as SubscriptionGetPayload<{ include: { plan: true } }> | null;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  const row = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
  });
  return row;
}

export async function upsertSubscription(
  stripeSubscriptionId: string,
  input: Omit<SubscriptionUncheckedCreateInput, "stripeSubscriptionId">,
) {
  const row = await prisma.subscription.upsert({
    where: { stripeSubscriptionId },
    update: input,
    create: { stripeSubscriptionId, ...input },
  });
  return row;
}

export async function updateSubscription(
  stripeSubscriptionId: string,
  input: SubscriptionUncheckedUpdateInput,
) {
  const row = await prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: input,
  });
  return row;
}

export async function getStripeCustomerId(userId: string): Promise<string | null> {
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
