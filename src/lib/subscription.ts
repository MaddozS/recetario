/**
 * Utilidades de feature gating y lógica de suscripciones.
 *
 * Define tipos, funciones de verificación y valores por defecto
 * para el modelo Freemium de KitchCalc.
 */

import type { UserSubscription } from "@/lib/db/billing";

export type SubscriptionTier = "free" | "basic" | "pro";

export type UserSubscriptionInfo = {
  tier: SubscriptionTier;
  status:
    | "active"
    | "trialing"
    | "canceled"
    | "past_due"
    | "unpaid"
    | "incomplete"
    | null;
  recipesLimit: number | null;
  ingredientsLimit: number | null;
  features: Record<string, boolean>;
  priceCents: number | null;
  currency: string | null;
  billingInterval: "monthly" | "yearly" | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  isTrial: boolean;
  trialEnd: Date | null;
};

const FREE_FEATURES: Record<string, boolean> = {
  recipe_duplicate: false,
  recipe_photos: false,
  stock_tracking: false,
  production_planner: false,
  production_save: false,
  production_advanced: false,
  pdf_export: false,
  advanced_costs: false,
  change_history: false,
  data_import_export: false,
  nutrition_info: false,
  cooking_mode: false,
};

export function getDefaultSubscription(): UserSubscriptionInfo {
  return {
    tier: "free",
    status: null,
    recipesLimit: 10,
    ingredientsLimit: 30,
    features: { ...FREE_FEATURES },
    priceCents: null,
    currency: null,
    billingInterval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
  };
}

export function resolveSubscription(
  sub: UserSubscription | null | undefined,
): UserSubscriptionInfo {
  if (!sub) return getDefaultSubscription();

  const tier = (
    ["basic", "pro"].includes(sub.tier) ? sub.tier : "free"
  ) as SubscriptionTier;

  return {
    tier,
    status: sub.status as UserSubscriptionInfo["status"],
    recipesLimit: sub.recipesLimit,
    ingredientsLimit: sub.ingredientsLimit,
    features: sub.features ?? { ...FREE_FEATURES },
    priceCents: sub.priceCents ?? null,
    currency: sub.currency ?? null,
    billingInterval:
      (sub.billingInterval as "monthly" | "yearly" | null) ?? null,
    currentPeriodEnd: sub.currentPeriodEnd
      ? new Date(sub.currentPeriodEnd)
      : null,
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
    isTrial: sub.status === "trialing",
    trialEnd: sub.trialEnd ? new Date(sub.trialEnd) : null,
  };
}

export function hasFeature(
  subscription: UserSubscriptionInfo,
  feature: string,
): boolean {
  return subscription.features[feature] === true;
}

export function canCreateRecipe(
  subscription: UserSubscriptionInfo,
  currentCount: number,
): boolean {
  if (subscription.recipesLimit === null) return true;
  return currentCount < subscription.recipesLimit;
}

export function canCreateIngredient(
  subscription: UserSubscriptionInfo,
  currentCount: number,
): boolean {
  if (subscription.ingredientsLimit === null) return true;
  return currentCount < subscription.ingredientsLimit;
}

export function getRemainingRecipes(
  subscription: UserSubscriptionInfo,
  currentCount: number,
): number | null {
  if (subscription.recipesLimit === null) return null;
  return Math.max(0, subscription.recipesLimit - currentCount);
}

export function getRemainingIngredients(
  subscription: UserSubscriptionInfo,
  currentCount: number,
): number | null {
  if (subscription.ingredientsLimit === null) return null;
  return Math.max(0, subscription.ingredientsLimit - currentCount);
}

export function isPaid(subscription: UserSubscriptionInfo): boolean {
  return subscription.tier === "basic" || subscription.tier === "pro";
}

export function isPro(subscription: UserSubscriptionInfo): boolean {
  return subscription.tier === "pro";
}
