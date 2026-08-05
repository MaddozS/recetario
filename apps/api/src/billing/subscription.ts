import type { Handler } from "hono";
import {
  getSubscriptionByUserId,
  upsertSubscription,
  getSubscriptionPlanByStripePriceId,
} from "@recetario/db";
import { retrieveSubscription, stripe } from "@recetario/stripe/server";
import {
  subscriptionResponseSchema,
  type UserSubscriptionInfo,
} from "@recetario/types";
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

    const dbSub = await getSubscriptionByUserId(user.id, [
      "active",
      "trialing",
      "canceled",
      "past_due",
    ]);
    if (!dbSub) throw new ApiError("NOT_FOUND", "No active subscription");

    let status = dbSub.status;
    let cancelAtPeriodEnd = dbSub.cancelAtPeriodEnd || dbSub.status === "canceled";
    let currentPeriodEnd = dbSub.currentPeriodEnd;
    let scheduledChange: UserSubscriptionInfo["scheduledChange"] = null;

    if (dbSub.stripeSubscriptionId) {
      try {
        const liveSub = await retrieveSubscription(dbSub.stripeSubscriptionId);
        const liveCancel =
          Boolean(liveSub.cancel_at_period_end) ||
          Boolean(liveSub.cancel_at) ||
          liveSub.status === "canceled";

        if (
          liveSub.status !== dbSub.status ||
          liveCancel !== dbSub.cancelAtPeriodEnd
        ) {
          status = liveSub.status;
          cancelAtPeriodEnd = liveCancel;
          if (liveSub.current_period_end) {
            currentPeriodEnd = new Date(liveSub.current_period_end * 1000);
          }
          await upsertSubscription(dbSub.stripeSubscriptionId, {
            id: dbSub.stripeSubscriptionId,
            userId: user.id,
            stripeCustomerId: dbSub.stripeCustomerId,
            planId: dbSub.planId,
            status,
            currentPeriodStart: dbSub.currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd ?? dbSub.currentPeriodEnd,
            cancelAtPeriodEnd: liveCancel,
            trialEnd: dbSub.trialEnd,
          });
        }

        if (liveSub.schedule) {
          const scheduleId =
            typeof liveSub.schedule === "string"
              ? liveSub.schedule
              : liveSub.schedule.id;
          const scheduleObj =
            await stripe.subscriptionSchedules.retrieve(scheduleId);
          if (scheduleObj.phases.length > 1) {
            const nextPhase = scheduleObj.phases[1];
            const nextPriceId =
              typeof nextPhase.items[0]?.price === "string"
                ? nextPhase.items[0].price
                : nextPhase.items[0]?.price?.id;
            if (nextPriceId) {
              const nextPlan =
                await getSubscriptionPlanByStripePriceId(nextPriceId);
              if (nextPlan) {
                scheduledChange = {
                  targetTier: nextPlan.tier as any,
                  targetPlanName: nextPlan.name,
                  targetInterval: nextPlan.billingInterval as any,
                  effectiveDate: new Date(
                    nextPhase.start_date * 1000,
                  ).toISOString(),
                };
              }
            }
          }
        }
      } catch {
        // Fallback
      }
    }

    const now = new Date();
    if (
      status === "canceled" &&
      currentPeriodEnd &&
      currentPeriodEnd <= now
    ) {
      throw new ApiError("NOT_FOUND", "No active subscription");
    }

    const subscription = subscriptionResponseSchema.parse({
      tier: dbSub.plan?.tier ?? "free",
      status,
      recipesLimit: dbSub.plan?.recipesLimit ?? null,
      ingredientsLimit: dbSub.plan?.ingredientsLimit ?? null,
      features: parseFeatures(dbSub.plan?.featuresJson),
      priceCents: dbSub.plan?.priceCents ?? null,
      currency: dbSub.plan?.currency ?? null,
      billingInterval: dbSub.plan?.billingInterval ?? null,
      currentPeriodEnd: currentPeriodEnd?.toISOString() ?? null,
      cancelAtPeriodEnd,
      isTrial: status === "trialing",
      trialEnd: dbSub.trialEnd?.toISOString() ?? null,
      scheduledChange,
    });
    return c.json(subscription);
  };
}
