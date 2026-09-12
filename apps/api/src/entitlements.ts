import { countUserIngredients, countUserRecipes } from "@recetario/db";
import {
  canCreateIngredient,
  canCreateRecipe,
  getDefaultSubscription,
  hasFeature,
} from "@recetario/stripe";
import { getSubscriptionInfo } from "@recetario/stripe/server";
import type { UserSubscriptionInfo } from "@recetario/types";
import { ApiError } from "./errors";

/**
 * Entitlement state for a user: the webhook-ingested row, or the free plan
 * (fail-closed) when there is none.
 */
export async function resolveSubscription(userId: string): Promise<UserSubscriptionInfo> {
  return (await getSubscriptionInfo(userId)) ?? getDefaultSubscription();
}

export async function requireRecipeCapacity(
  userId: string,
  subscription?: UserSubscriptionInfo,
): Promise<void> {
  const plan = subscription ?? (await resolveSubscription(userId));
  if (plan.recipesLimit === null) return;

  const currentCount = await countUserRecipes(userId);
  if (!canCreateRecipe(plan, currentCount)) {
    throw new ApiError(
      "PLAN_LIMIT",
      `Recipe limit reached for your plan (${plan.recipesLimit})`,
    );
  }
}

export async function requireIngredientCapacity(
  userId: string,
  subscription?: UserSubscriptionInfo,
): Promise<void> {
  const plan = subscription ?? (await resolveSubscription(userId));
  if (plan.ingredientsLimit === null) return;

  const currentCount = await countUserIngredients(userId);
  if (!canCreateIngredient(plan, currentCount)) {
    throw new ApiError(
      "PLAN_LIMIT",
      `Ingredient limit reached for your plan (${plan.ingredientsLimit})`,
    );
  }
}

export async function requireFeature(
  userId: string,
  feature: string,
  subscription?: UserSubscriptionInfo,
): Promise<void> {
  const plan = subscription ?? (await resolveSubscription(userId));
  if (!hasFeature(plan, feature)) {
    throw new ApiError("FEATURE_REQUIRED", `Feature not available in your plan: ${feature}`);
  }
}
