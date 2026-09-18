import { countUserIngredients, countUserRecipes } from "@recetario/db";
import {
  PRODUCTION_BASIC_RECIPE_LIMIT,
  canCreateIngredient,
  canCreateRecipe,
  getDefaultSubscription,
  hasFeature,
  isPro,
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

/**
 * Acceso al planificador de producción: exige la feature `production_planner` y,
 * fuera de Pro, el tope de recetas por plan. La UI sólo anticipa el error.
 */
export async function requireProductionAccess(
  userId: string,
  recipeCount: number,
  subscription?: UserSubscriptionInfo,
): Promise<void> {
  const plan = subscription ?? (await resolveSubscription(userId));
  if (!hasFeature(plan, "production_planner")) {
    throw new ApiError(
      "FEATURE_REQUIRED",
      "Feature not available in your plan: production_planner",
    );
  }
  if (!isPro(plan) && recipeCount > PRODUCTION_BASIC_RECIPE_LIMIT) {
    throw new ApiError(
      "PLAN_LIMIT",
      `Production planner supports up to ${PRODUCTION_BASIC_RECIPE_LIMIT} recipes on your plan`,
    );
  }
}
