import type Stripe from 'stripe';
import { getSubscriptionByUserId, getSubscriptionPlanByStripePriceId } from '@recetario/db';
import type { SubscriptionGetPayload } from '@recetario/db/prisma/generated/models';
import { userSubscriptionInfoSchema, type UserSubscriptionInfo } from '@recetario/types';
import { retrieveSubscription, stripe } from './stripe-api';
import { subscriptionIngestion } from './subscription-ingestion';
import type { StripeSubscriptionSnapshot, SnapshotIngestResult } from './subscription-ingestion';

/** Subscription statuses considered live and worth reconciling against Stripe. */
export enum ReconcileStatus {
  Active = 'active',
  Trialing = 'trialing',
  Canceled = 'canceled',
  PastDue = 'past_due',
}

const RECONCILE_STATUSES: string[] = [
  ReconcileStatus.Active,
  ReconcileStatus.Trialing,
  ReconcileStatus.Canceled,
  ReconcileStatus.PastDue,
];

/** Statuses with defined entitlement semantics. Unknown statuses fail closed. */
const RECOGNIZED_STATUSES = new Set<string>([
  'active',
  'trialing',
  'canceled',
  'past_due',
  'unpaid',
  'incomplete',
]);

type DbSubscription = SubscriptionGetPayload<{
  include: { plan: true };
}>;
type DbPlan = NonNullable<DbSubscription['plan']>;

export interface ReconcileDeps {
  db: {
    getSubscriptionByUserId(userId: string, statuses?: string[]): Promise<DbSubscription | null>;
    getSubscriptionPlanByStripePriceId(stripePriceId: string): Promise<DbPlan | null>;
  };
  stripe: {
    retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    getSubscriptionSchedules(scheduleId: string): Promise<Stripe.SubscriptionSchedule>;
  };
  /** Delegate drift writes through canonical snapshot ingestion. */
  ingestSnapshot: (
    snapshot: StripeSubscriptionSnapshot,
    metadata: Record<string, string> | null,
    context: { authority: 'authenticated-user'; userId: string }
  ) => Promise<SnapshotIngestResult>;
  log?: (message: string, error: unknown) => void;
}

export function reconcileSubscriptionWith(deps: ReconcileDeps) {
  const { db, stripe } = deps;
  const log = deps.log ?? ((message, error) => console.error(message, error));

  return async function reconcileSubscription(
    userId: string
  ): Promise<UserSubscriptionInfo | null> {
    const dbSub = await db.getSubscriptionByUserId(userId, RECONCILE_STATUSES);
    if (!dbSub) return null;

    let status = dbSub.status;
    let cancelAtPeriodEnd = dbSub.cancelAtPeriodEnd || dbSub.status === 'canceled';
    let currentPeriodEnd = dbSub.currentPeriodEnd;
    let scheduledChange: UserSubscriptionInfo['scheduledChange'] = null;

    let liveSub: Stripe.Subscription | null = null;
    const stripeSubscriptionId = dbSub.stripeSubscriptionId;
    if (stripeSubscriptionId) {
      try {
        liveSub = await stripe.retrieveSubscription(stripeSubscriptionId);
      } catch (error) {
        log('Subscription reconcile failed; falling back to DB state', error);
      }

      if (liveSub) {
        const liveCancel =
          Boolean(liveSub.cancel_at_period_end) ||
          Boolean(liveSub.cancel_at) ||
          liveSub.status === 'canceled';

        if (liveSub.status !== dbSub.status || liveCancel !== dbSub.cancelAtPeriodEnd) {
          status = liveSub.status;
          cancelAtPeriodEnd = liveCancel;
          const subData = liveSub as unknown as {
            current_period_end?: number;
          };
          if (subData.current_period_end) {
            currentPeriodEnd = new Date(subData.current_period_end * 1000);
          }
          const snapshot = snapshotFromSubscription(liveSub, dbSub.stripeCustomerId ?? '');
          const result = await deps.ingestSnapshot(snapshot, null, {
            authority: 'authenticated-user',
            userId,
          });
          if (!result.ok) {
            throw new Error(`Subscription drift ingestion failed: ${result.error}`);
          }
        }

        scheduledChange = await extractScheduledChange(liveSub, stripe, db, log);
      }
    }

    const now = new Date();
    if (status === 'canceled' && currentPeriodEnd && currentPeriodEnd <= now) {
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

export interface SubscriptionInfoDeps {
  db: {
    getSubscriptionByUserId(userId: string, statuses?: string[]): Promise<DbSubscription | null>;
  };
}

/**
 * Read-only subscription shaping for the request path: resolves entitlement
 * state from the webhook-ingested DB row without any live Stripe calls.
 * `scheduledChange` is only available via the live reconcile path.
 */
export function getSubscriptionInfoWith(deps: SubscriptionInfoDeps) {
  return async function getSubscriptionInfo(userId: string): Promise<UserSubscriptionInfo | null> {
    const dbSub = await deps.db.getSubscriptionByUserId(userId, RECONCILE_STATUSES);
    if (!dbSub) return null;

    const status = dbSub.status;
    const cancelAtPeriodEnd = dbSub.cancelAtPeriodEnd || dbSub.status === 'canceled';
    const currentPeriodEnd = dbSub.currentPeriodEnd;

    const now = new Date();
    if (status === 'canceled' && currentPeriodEnd && currentPeriodEnd <= now) {
      return null;
    }

    return shapeInfo(dbSub, {
      status,
      cancelAtPeriodEnd,
      currentPeriodEnd,
      scheduledChange: null,
    });
  };
}

async function extractScheduledChange(
  liveSub: Stripe.Subscription,
  stripe: ReconcileDeps['stripe'],
  db: ReconcileDeps['db'],
  log: (message: string, error: unknown) => void
): Promise<UserSubscriptionInfo['scheduledChange']> {
  if (!liveSub.schedule) return null;

  let scheduleObj: Stripe.SubscriptionSchedule;
  try {
    const scheduleId =
      typeof liveSub.schedule === 'string' ? liveSub.schedule : liveSub.schedule.id;
    scheduleObj = await stripe.getSubscriptionSchedules(scheduleId);
  } catch (error) {
    log('Scheduled change extraction failed; returning none', error);
    return null;
  }

  if (scheduleObj.phases.length <= 1) return null;

  const nextPhase = scheduleObj.phases[1];
  const nextPriceId =
    typeof nextPhase.items[0]?.price === 'string'
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
    const value = JSON.parse(raw ?? '{}');
    return value && typeof value === 'object'
      ? Object.fromEntries(Object.entries(value).map(([key, item]) => [key, Boolean(item)]))
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
    scheduledChange: UserSubscriptionInfo['scheduledChange'];
  }
): UserSubscriptionInfo {
  // Unknown statuses fail closed: the raw status is observable but no paid
  // entitlement is derived from the plan row until the status is supported.
  const recognized = RECOGNIZED_STATUSES.has(reconciled.status);
  const tier = recognized ? (dbSub.plan?.tier ?? 'free') : 'free';
  const features = recognized ? parseFeatures(dbSub.plan?.featuresJson) : {};
  return userSubscriptionInfoSchema.parse({
    tier,
    status: reconciled.status,
    recipesLimit: recognized ? (dbSub.plan?.recipesLimit ?? null) : null,
    ingredientsLimit: recognized ? (dbSub.plan?.ingredientsLimit ?? null) : null,
    features,
    priceCents: recognized ? (dbSub.plan?.priceCents ?? null) : null,
    currency: recognized ? (dbSub.plan?.currency ?? null) : null,
    billingInterval: recognized ? (dbSub.plan?.billingInterval ?? null) : null,
    currentPeriodEnd: reconciled.currentPeriodEnd?.toISOString() ?? null,
    cancelAtPeriodEnd: reconciled.cancelAtPeriodEnd,
    isTrial: reconciled.status === 'trialing',
    trialEnd: dbSub.trialEnd?.toISOString() ?? null,
    scheduledChange: recognized ? reconciled.scheduledChange : null,
  });
}

function snapshotFromSubscription(
  sub: Stripe.Subscription,
  stripeCustomerId: string
): StripeSubscriptionSnapshot {
  const raw = sub as unknown as {
    current_period_start?: number;
    current_period_end?: number;
    cancel_at?: number | null;
  };
  return {
    stripeSubscriptionId: sub.id,
    stripeCustomerId,
    status: sub.status,
    priceId:
      typeof sub.items?.data?.[0]?.price === 'string'
        ? sub.items.data[0].price
        : (sub.items?.data?.[0]?.price?.id ?? null),
    currentPeriodStart: raw.current_period_start ?? null,
    currentPeriodEnd: raw.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
    cancelAt: raw.cancel_at ?? null,
    trialEnd: sub.trial_end ?? null,
    raw: sub,
  };
}

export const reconcileSubscription = reconcileSubscriptionWith({
  db: {
    getSubscriptionByUserId,
    getSubscriptionPlanByStripePriceId,
  },
  stripe: {
    retrieveSubscription,
    getSubscriptionSchedules: (scheduleId) => stripe.subscriptionSchedules.retrieve(scheduleId),
  },
  ingestSnapshot: (snapshot, metadata, context) =>
    subscriptionIngestion.ingestSubscriptionSnapshot({
      snapshot,
      metadata,
      context,
    }),
});

export const getSubscriptionInfo = getSubscriptionInfoWith({
  db: { getSubscriptionByUserId },
});
