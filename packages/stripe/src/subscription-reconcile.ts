import type Stripe from "stripe";
import {
  getSubscriptionByUserId,
  upsertSubscription,
  getSubscriptionPlanByStripePriceId,
} from "@recetario/db";
import type {
  SubscriptionGetPayload,
  SubscriptionUncheckedCreateInput,
} from "@recetario/db/prisma/generated/models";
import {
  userSubscriptionInfoSchema,
  type UserSubscriptionInfo,
} from "@recetario/types";
import { retrieveSubscription, stripe } from "./stripe-api";

/** Subscription statuses considered live and worth reconciling against Stripe. */
export enum ReconcileStatus {
  Active = "active",
  Trialing = "trialing",
  Canceled = "canceled",
  PastDue = "past_due",
}

const RECONCILE_STATUSES: string[] = [
  ReconcileStatus.Active,
  ReconcileStatus.Trialing,
  ReconcileStatus.Canceled,
  ReconcileStatus.PastDue,
];

type DbSubscription = SubscriptionGetPayload<{
  include: { plan: true };
}>;
type DbPlan = NonNullable<DbSubscription["plan"]>;
type UpsertSubscriptionInput = Omit<
  SubscriptionUncheckedCreateInput,
  "stripeSubscriptionId"
>;

export interface ReconcileDeps {
  db: {
    getSubscriptionByUserId(
      userId: string,
      statuses?: string[],
    ): Promise<DbSubscription | null>;
    upsertSubscription(
      stripeSubscriptionId: string,
      input: UpsertSubscriptionInput,
    ): Promise<unknown>;
    getSubscriptionPlanByStripePriceId(
      stripePriceId: string,
    ): Promise<DbPlan | null>;
  };
  stripe: {
    retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    getSubscriptionSchedules(
      scheduleId: string,
    ): Promise<Stripe.SubscriptionSchedule>;
  };
  log?: (message: string, error: unknown) => void;
}

export function reconcileSubscriptionWith(deps: ReconcileDeps) {
  const { db, stripe } = deps;
  const log = deps.log ?? ((message, error) => console.error(message, error));

  return async function reconcileSubscription(
    userId: string,
  ): Promise<UserSubscriptionInfo | null> {
    const dbSub = await db.getSubscriptionByUserId(userId, RECONCILE_STATUSES);
    if (!dbSub) return null;

    let status = dbSub.status;
    let cancelAtPeriodEnd =
      dbSub.cancelAtPeriodEnd || dbSub.status === "canceled";
    let currentPeriodEnd = dbSub.currentPeriodEnd;
    let scheduledChange: UserSubscriptionInfo["scheduledChange"] = null;

    let liveSub: Stripe.Subscription | null = null;
    const stripeSubscriptionId = dbSub.stripeSubscriptionId;
    if (stripeSubscriptionId) {
      try {
        liveSub = await stripe.retrieveSubscription(stripeSubscriptionId);
      } catch (error) {
        log("Subscription reconcile failed; falling back to DB state", error);
      }

      if (liveSub) {
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
          const subData = liveSub as unknown as {
            current_period_end?: number;
          };
          if (subData.current_period_end) {
            currentPeriodEnd = new Date(subData.current_period_end * 1000);
          }
          await db.upsertSubscription(stripeSubscriptionId, {
            id: stripeSubscriptionId,
            userId,
            stripeCustomerId: dbSub.stripeCustomerId,
            planId: dbSub.planId,
            status,
            currentPeriodStart: dbSub.currentPeriodStart,
            currentPeriodEnd: currentPeriodEnd ?? dbSub.currentPeriodEnd,
            cancelAtPeriodEnd: liveCancel,
            trialEnd: dbSub.trialEnd,
          });
        }

        scheduledChange = await extractScheduledChange(
          liveSub,
          stripe,
          db,
          log,
        );
      }
    }

    const now = new Date();
    if (
      status === "canceled" &&
      currentPeriodEnd &&
      currentPeriodEnd <= now
    ) {
      return null;
    }

    return shapeInfo(dbSub, {
      status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      scheduledChange,
    });
  };
}

async function extractScheduledChange(
  liveSub: Stripe.Subscription,
  stripe: ReconcileDeps["stripe"],
  db: ReconcileDeps["db"],
  log: (message: string, error: unknown) => void,
): Promise<UserSubscriptionInfo["scheduledChange"]> {
  if (!liveSub.schedule) return null;

  let scheduleObj: Stripe.SubscriptionSchedule;
  try {
    const scheduleId =
      typeof liveSub.schedule === "string"
        ? liveSub.schedule
        : liveSub.schedule.id;
    scheduleObj = await stripe.getSubscriptionSchedules(scheduleId);
  } catch (error) {
    log("Scheduled change extraction failed; returning none", error);
    return null;
  }

  if (scheduleObj.phases.length <= 1) return null;

  const nextPhase = scheduleObj.phases[1];
  const nextPriceId =
    typeof nextPhase.items[0]?.price === "string"
      ? nextPhase.items[0].price
      : nextPhase.items[0]?.price?.id;
  if (!nextPriceId) return null;

  const nextPlan = await db.getSubscriptionPlanByStripePriceId(nextPriceId);
  if (!nextPlan) return null;

  return userSubscriptionInfoSchema.shape.scheduledChange.unwrap().parse({
    targetTier: nextPlan.tier,
    targetPlanName: nextPlan.name,
    targetInterval: nextPlan.billingInterval,
    effectiveDate: new Date(nextPhase.start_date * 1000).toISOString(),
  });
}

function parseFeatures(raw: string | null | undefined): Record<string, boolean> {
  try {
    const value = JSON.parse(raw ?? "{}");
    return value && typeof value === "object"
      ? Object.fromEntries(
          Object.entries(value).map(([key, item]) => [key, Boolean(item)]),
        )
      : {};
  } catch {
    return {};
  }
}

function shapeInfo(
  dbSub: DbSubscription,
  reconciled: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: Date | null;
    scheduledChange: UserSubscriptionInfo["scheduledChange"];
  },
): UserSubscriptionInfo {
  return userSubscriptionInfoSchema.parse({
    tier: dbSub.plan?.tier ?? "free",
    status: reconciled.status,
    recipesLimit: dbSub.plan?.recipesLimit ?? null,
    ingredientsLimit: dbSub.plan?.ingredientsLimit ?? null,
    features: parseFeatures(dbSub.plan?.featuresJson),
    priceCents: dbSub.plan?.priceCents ?? null,
    currency: dbSub.plan?.currency ?? null,
    billingInterval: dbSub.plan?.billingInterval ?? null,
    currentPeriodEnd: reconciled.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: reconciled.cancelAtPeriodEnd,
    isTrial: reconciled.status === "trialing",
    trialEnd: dbSub.trialEnd?.toISOString() ?? null,
    scheduledChange: reconciled.scheduledChange,
  });
}

export const reconcileSubscription = reconcileSubscriptionWith({
  db: {
    getSubscriptionByUserId,
    upsertSubscription,
    getSubscriptionPlanByStripePriceId,
  },
  stripe: {
    retrieveSubscription,
    getSubscriptionSchedules: (scheduleId) =>
      stripe.subscriptionSchedules.retrieve(scheduleId),
  },
});
