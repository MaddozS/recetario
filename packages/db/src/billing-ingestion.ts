import { prisma } from "./prisma";
import type {
  CheckoutIntentUncheckedCreateInput,
  SubscriptionUncheckedCreateInput,
} from "../prisma/generated/models";
import type { StripeEventAttemptOutcome } from "../prisma/generated/enums";

export type SubscriptionMutation = Omit<
  SubscriptionUncheckedCreateInput,
  "id" | "stripeSubscriptionId" | "createdAt"
>;

export type CheckoutIntentInput = Omit<
  CheckoutIntentUncheckedCreateInput,
  "id" | "createdAt" | "consumedAt" | "state"
> & {
  expiresAt: Date;
};

/** Find the Checkout intent for a Stripe Session, if any. */
export async function getCheckoutIntentBySession(checkoutSessionId: string) {
  return prisma.checkoutIntent.findUnique({
    where: { checkoutSessionId },
  });
}

export async function createCheckoutIntent(input: CheckoutIntentInput) {
  return prisma.checkoutIntent.create({
    data: { ...input, state: "pending" },
  });
}

export type EventAttemptInput = {
  stripeEventId: string;
  attemptNumber: number;
  eventType: string;
  stripeCreated: bigint;
  stripeSubscriptionId: string | null;
  outcome: StripeEventAttemptOutcome;
  ignoredReason?: string | null;
  failureMessage?: string | null;
};

/** Latest attempt sequence for an event, regardless of outcome. */
export async function getLatestEventAttempt(
  stripeEventId: string,
): Promise<{ attemptNumber: number } | null> {
  const row = await prisma.stripeEventAttempt.findFirst({
    where: { stripeEventId },
    orderBy: { attemptNumber: "desc" },
    select: { attemptNumber: true },
  });
  return row ?? null;
}

/** Persist a failed attempt independently of any Subscription mutation. */
export async function recordFailedEventAttempt(input: EventAttemptInput) {
  return prisma.stripeEventAttempt.create({ data: input });
}

/** Look up the persisted Subscription row owning a Stripe Subscription. */
export async function getSubscriptionByStripeIdForIngestion(
  stripeSubscriptionId: string,
) {
  return prisma.subscription.findUnique({
    where: { stripeSubscriptionId },
    include: { plan: true },
  });
}

/**
 * Outcome of one attempt to apply a Subscription mutation plus its terminal
 * Stripe event attempt atomically.
 */
export type ApplyResult =
  | { applied: true }
  | { applied: false; ignored: true; reason: string }
  | { applied: false; ignored: false; error: string };

/**
 * Atomically apply a Subscription mutation plus the terminal Stripe event
 * attempt that produced it, serialized by the Stripe event and Subscription
 * identities via transaction-scoped PostgreSQL advisory locks. When a Checkout
 * intent id is supplied, the intent is consumed to the resulting Subscription
 * inside the same transaction.
 *
 * Idempotency and ordering:
 * - A terminal (applied/ignored) attempt already recorded for this event makes
 *   this delivery an ignored duplicate.
 * - An attempt for an older or equal `(stripeCreated, stripeEventId)` cursor
 *   than the latest terminal attempt for the same Subscription is recorded as
 *   ignored/stale and cannot overwrite newer state.
 * - A failed attempt never advances the terminal cursor and never blocks a
 *   later retry.
 */
export async function applySubscriptionMutation(
  stripeSubscriptionId: string,
  mutation: SubscriptionMutation,
  attempt: EventAttemptInput,
  checkoutIntentId?: string | null,
): Promise<ApplyResult> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock($1)",
      BigInt(hashString(stripeSubscriptionId)),
    );
    await tx.$executeRawUnsafe(
      "SELECT pg_advisory_xact_lock($1)",
      BigInt(hashString(attempt.stripeEventId)),
    );

    const terminal = await tx.stripeEventAttempt.findFirst({
      where: {
        stripeEventId: attempt.stripeEventId,
        outcome: { in: ["applied", "ignored"] },
      },
      orderBy: { attemptNumber: "desc" },
      select: { attemptNumber: true },
    });
    if (terminal) {
      await tx.stripeEventAttempt.create({
        data: { ...attempt, outcome: "ignored", ignoredReason: "duplicate" },
      });
      return { applied: false, ignored: true, reason: "duplicate" };
    }

    const latest = await tx.stripeEventAttempt.findFirst({
      where: {
        stripeSubscriptionId: attempt.stripeSubscriptionId,
        outcome: { in: ["applied", "ignored"] },
      },
      orderBy: [{ stripeCreated: "desc" }, { stripeEventId: "desc" }],
      select: { stripeCreated: true, stripeEventId: true },
    });
    if (
      latest &&
      (attempt.stripeCreated < latest.stripeCreated ||
        (attempt.stripeCreated === latest.stripeCreated &&
          attempt.stripeEventId <= latest.stripeEventId))
    ) {
      await tx.stripeEventAttempt.create({
        data: { ...attempt, outcome: "ignored", ignoredReason: "stale" },
      });
      return { applied: false, ignored: true, reason: "stale" };
    }

    await tx.subscription.upsert({
      where: { stripeSubscriptionId },
      update: mutation,
      create: {
        ...mutation,
        id: stripeSubscriptionId,
        stripeSubscriptionId,
      },
    });
    await tx.stripeEventAttempt.create({
      data: { ...attempt, outcome: "applied" },
    });

    if (checkoutIntentId) {
      await tx.checkoutIntent.update({
        where: { id: checkoutIntentId },
        data: {
          state: "consumed",
          stripeSubscriptionId,
          consumedAt: new Date(),
        },
      });
    }

    return { applied: true };
  });
}

/**
 * Apply a snapshot mutation (sync / checkout / reconcile paths) and, when a
 * Checkout intent id is supplied, consume that intent to the resulting
 * Subscription — atomically.
 */
export async function upsertSubscriptionAndConsumeIntent(
  stripeSubscriptionId: string,
  mutation: SubscriptionMutation,
  checkoutIntentId?: string | null,
) {
  return prisma.$transaction(async (tx) => {
    const row = await tx.subscription.upsert({
      where: { stripeSubscriptionId },
      update: mutation,
      create: {
        ...mutation,
        id: stripeSubscriptionId,
        stripeSubscriptionId,
      },
    });
    if (checkoutIntentId) {
      await tx.checkoutIntent.update({
        where: { id: checkoutIntentId },
        data: {
          state: "consumed",
          stripeSubscriptionId,
          consumedAt: new Date(),
        },
      });
    }
    return row;
  });
}

/** Stable FNV-1a hash used to derive advisory-lock keys from Stripe IDs. */
function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}
