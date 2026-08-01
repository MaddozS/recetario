import type { UserSubscriptionInfo } from "@recetario/types";

export type { SubscriptionTier, UserSubscriptionInfo } from "@recetario/types";

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

export function hasFeature(subscription: UserSubscriptionInfo, feature: string): boolean {
  return subscription.features[feature] === true;
}

export function canCreateRecipe(subscription: UserSubscriptionInfo, currentCount: number): boolean {
  return subscription.recipesLimit === null || currentCount < subscription.recipesLimit;
}

export function canCreateIngredient(subscription: UserSubscriptionInfo, currentCount: number): boolean {
  return subscription.ingredientsLimit === null || currentCount < subscription.ingredientsLimit;
}

export function getRemainingRecipes(subscription: UserSubscriptionInfo, currentCount: number): number | null {
  return subscription.recipesLimit === null ? null : Math.max(0, subscription.recipesLimit - currentCount);
}

export function getRemainingIngredients(subscription: UserSubscriptionInfo, currentCount: number): number | null {
  return subscription.ingredientsLimit === null ? null : Math.max(0, subscription.ingredientsLimit - currentCount);
}

export function isPaid(subscription: UserSubscriptionInfo): boolean {
  return subscription.tier === "basic" || subscription.tier === "pro";
}

export function isPro(subscription: UserSubscriptionInfo): boolean {
  return subscription.tier === "pro";
}
