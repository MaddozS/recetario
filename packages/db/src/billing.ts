import { prisma } from "./prisma";
import type {
  SubscriptionUncheckedCreateInput,
  SubscriptionUncheckedUpdateInput,
  SubscriptionPlanUncheckedCreateInput,
  SubscriptionGetPayload,
} from "../prisma/generated/models";
import type { SyncPlanInput } from "@recetario/types";

export async function getSubscriptionPlans(activeOnly = true) {
  return prisma.subscriptionPlan.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { priceCents: "asc" },
  });
}

export async function getSubscriptionPlanById(id: string) {
  return prisma.subscriptionPlan.findUnique({ where: { id } });
}

export async function getSubscriptionPlanByStripePriceId(stripePriceId: string) {
  return prisma.subscriptionPlan.findFirst({ where: { stripePriceId } });
}

export async function upsertSubscriptionPlan(
  id: string,
  input: Omit<SubscriptionPlanUncheckedCreateInput, "id">,
) {
  return prisma.subscriptionPlan.upsert({
    where: { id },
    update: input,
    create: { id, ...input },
  });
}

export async function deactivatePlansNotIn(ids: string[]) {
  if (ids.length === 0) return;
  await prisma.subscriptionPlan.updateMany({
    where: { id: { notIn: ids }, active: true },
    data: { active: false },
  });
}

export async function syncPlans(input: SyncPlanInput[]): Promise<void> {
  if (input.length === 0) return;
  for (const plan of input) {
    await upsertSubscriptionPlan(plan.id, plan);
  }
  await deactivatePlansNotIn(input.map((plan) => plan.id));
}

export async function getSubscriptionByUserId(
  userId: string,
  statuses?: string[],
): Promise<SubscriptionGetPayload<{ include: { plan: true } }> | null> {
  const row = await prisma.subscription.findFirst({
    where: { userId, ...(statuses ? { status: { in: statuses } } : {}) },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });
  return row as SubscriptionGetPayload<{ include: { plan: true } }> | null;
}

export async function getSubscriptionByStripeId(stripeSubscriptionId: string) {
  return prisma.subscription.findUnique({ where: { stripeSubscriptionId } });
}

export async function upsertSubscription(
  stripeSubscriptionId: string,
  input: Omit<SubscriptionUncheckedCreateInput, "stripeSubscriptionId">,
) {
  return prisma.subscription.upsert({
    where: { stripeSubscriptionId },
    update: input,
    create: { stripeSubscriptionId, ...input },
  });
}

export async function updateSubscription(
  stripeSubscriptionId: string,
  input: SubscriptionUncheckedUpdateInput,
) {
  return prisma.subscription.update({
    where: { stripeSubscriptionId },
    data: input,
  });
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
