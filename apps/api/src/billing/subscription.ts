import type { Handler } from "hono";
import { getSubscriptionByUserId } from "@recetario/db";
import { subscriptionResponseSchema } from "@recetario/types";
import { ApiError } from "../errors";
import { getAuthUser } from "../middleware/auth";

function parseFeatures(raw: string | null | undefined): Record<string, boolean> {
  try {
    const value = JSON.parse(raw ?? "{}");
    return value && typeof value === "object"
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Boolean(item)]))
      : {};
  } catch {
    return {};
  }
}

export function subscriptionHandler(): Handler {
  return async (c) => {
    const user = await getAuthUser(c);

    const dbSub = await getSubscriptionByUserId(user.id, ["active", "trialing"]);
    if (!dbSub) throw new ApiError("NOT_FOUND", "No active subscription");

    const subscription = subscriptionResponseSchema.parse({
      tier: dbSub.plan?.tier ?? "free",
      status: dbSub.status,
      recipesLimit: dbSub.plan?.recipesLimit ?? null,
      ingredientsLimit: dbSub.plan?.ingredientsLimit ?? null,
      features: parseFeatures(dbSub.plan?.featuresJson),
      priceCents: dbSub.plan?.priceCents ?? null,
      currency: dbSub.plan?.currency ?? null,
      billingInterval: dbSub.plan?.billingInterval ?? null,
      currentPeriodEnd: dbSub.currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd: dbSub.cancelAtPeriodEnd,
      isTrial: dbSub.status === "trialing",
      trialEnd: dbSub.trialEnd?.toISOString() ?? null,
    });
    return c.json(subscription);
  };
}
