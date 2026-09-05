import type Stripe from "stripe";
import {
  createCheckoutIntent,
  getCheckoutIntentBySession,
  getSubscriptionByStripeIdForIngestion,
  getSubscriptionPlanByStripePriceId,
  getLatestEventAttempt,
  recordFailedEventAttempt,
  applySubscriptionMutation,
  upsertSubscriptionAndConsumeIntent,
  type SubscriptionMutation,
} from "@recetario/db";
import {
  createCheckoutSession as createStripeCheckoutSession,
  retrieveCheckoutSession,
  retrieveSubscription,
  updateStripeSubscription,
  stripe,
} from "./stripe-api";

export const CHECKOUT_INTENT_TTL_MS = 24 * 60 * 60 * 1000;

const SUPPORTED_NON_TERMINAL_EVENTS = new Set([
  "checkout.session.completed",
  "customer.subscription.updated",
  "invoice.payment_failed",
]);

const TERMINAL_EVENTS = new Set(["customer.subscription.deleted"]);

export type TrustedCheckoutResult =
  | { ok: true; url: string }
  | { ok: false; error: string };

export type SnapshotIngestResult =
  | { ok: true }
  | { ok: false; error: string };

export type EventProcessResult =
  | { ok: true; outcome: "applied" | "ignored" }
  | { ok: false; error: string };

export type StripeSubscriptionSnapshot = {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  status: string;
  priceId: string | null;
  currentPeriodStart: number | null;
  currentPeriodEnd: number | null;
  cancelAtPeriodEnd: boolean;
  cancelAt: number | null;
  trialEnd: number | null;
  raw: Stripe.Subscription;
};

export type CheckoutIntentRow = {
  id: string;
  userId: string;
  checkoutSessionId: string;
  stripeCustomerId: string;
  priceId: string;
  state: "pending" | "consumed";
  stripeSubscriptionId: string | null;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
};

export type SnapshotContext =
  | { authority: "authenticated-user"; userId: string }
  | { authority: "checkout-intent"; intent: CheckoutIntentRow }
  | { authority: "persisted-subscription"; userId: string };

export type IngestionDeps = {
  db: {
    getCheckoutIntentBySession(
      checkoutSessionId: string,
    ): Promise<CheckoutIntentRow | null>;
    getSubscriptionByStripeIdForIngestion(
      stripeSubscriptionId: string,
    ): Promise<{
      planId: string;
      userId: string;
      currentPeriodStart: Date | null;
      currentPeriodEnd: Date | null;
    } | null>;
    getSubscriptionPlanByStripePriceId(
      stripePriceId: string,
    ): Promise<{ id: string; tier: string; billingInterval: string } | null>;
    createCheckoutIntent(input: {
      userId: string;
      checkoutSessionId: string;
      stripeCustomerId: string;
      priceId: string;
      expiresAt: Date;
    }): Promise<unknown>;
    getLatestEventAttempt(
      stripeEventId: string,
    ): Promise<{ attemptNumber: number } | null>;
    recordFailedEventAttempt(input: {
      stripeEventId: string;
      attemptNumber: number;
      eventType: string;
      stripeCreated: bigint;
      stripeSubscriptionId: string | null;
      outcome: "failed";
      failureMessage?: string | null;
    }): Promise<unknown>;
    applySubscriptionMutation(
      stripeSubscriptionId: string,
      mutation: SubscriptionMutation,
      attempt: {
        stripeEventId: string;
        attemptNumber: number;
        eventType: string;
        stripeCreated: bigint;
        stripeSubscriptionId: string | null;
        outcome: "applied";
      },
      checkoutIntentId?: string | null,
    ): Promise<
      | { applied: true }
      | { applied: false; ignored: true; reason: string }
      | { applied: false; ignored: false; error: string }
    >;
    upsertSubscriptionAndConsumeIntent(
      stripeSubscriptionId: string,
      mutation: SubscriptionMutation,
      checkoutIntentId?: string | null,
    ): Promise<unknown>;
  };
  stripe: {
    createCheckoutSession(input: {
      customerId: string;
      priceId: string;
      successUrl: string;
      cancelUrl: string;
      userId: string;
      planId: string;
      trialPeriodDays?: number;
    }): Promise<Stripe.Checkout.Session>;
    retrieveCheckoutSession(
      sessionId: string,
    ): Promise<Stripe.Checkout.Session>;
    retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription>;
    expireCheckoutSession(sessionId: string): Promise<unknown>;
    updateStripeSubscription(input: {
      subscriptionId: string;
      priceId: string;
      isUpgrade: boolean;
      isTrialing: boolean;
    }): Promise<Stripe.Subscription>;
    getSubscriptionSchedules(
      scheduleId: string,
    ): Promise<Stripe.SubscriptionSchedule>;
  };
  log?: (message: string, error: unknown) => void;
  now?: () => Date;
};

export function createSubscriptionIngestionWith(deps: IngestionDeps) {
  const { db, stripe } = deps;
  const log = deps.log ?? ((message, error) => console.error(message, error));
  const now = deps.now ?? (() => new Date());

  // ── Shared normalization ────────────────────────────────────────────────

  function authorityUserId(context: SnapshotContext): string {
    return context.authority === "checkout-intent"
      ? context.intent.userId
      : context.userId;
  }

  function assertMetadataMatches(
    metadata: Record<string, string> | null | undefined,
    userId: string,
  ): string | null {
    if (!metadata) return null;
    if (metadata.userId && metadata.userId !== userId) {
      return "Metadata userId mismatch";
    }
    return null;
  }

  function resolveOwnedPriceId(
    snapshot: StripeSubscriptionSnapshot,
    context: SnapshotContext,
  ): string | null {
    return context.authority === "checkout-intent"
      ? context.intent.priceId
      : snapshot.priceId;
  }

  function normalizePeriods(
    snapshot: StripeSubscriptionSnapshot,
    priceId: string,
  ):
    | {
        ok: true;
        currentPeriodStart: number | null;
        currentPeriodEnd: number | null;
      }
    | { ok: false; error: string } {
    const subLevelStart = snapshot.currentPeriodStart;
    const subLevelEnd = snapshot.currentPeriodEnd;

    const item = snapshot.raw.items?.data?.find(
      (i) => i.price?.id === priceId,
    );
    const itemLevelStart = item?.current_period_start ?? null;
    const itemLevelEnd = item?.current_period_end ?? null;

    if (
      subLevelStart != null &&
      itemLevelStart != null &&
      subLevelStart !== itemLevelStart
    ) {
      return { ok: false, error: "Contradictory period start values" };
    }
    if (
      subLevelEnd != null &&
      itemLevelEnd != null &&
      subLevelEnd !== itemLevelEnd
    ) {
      return { ok: false, error: "Contradictory period end values" };
    }

    return {
      ok: true,
      currentPeriodStart: subLevelStart ?? itemLevelStart,
      currentPeriodEnd: subLevelEnd ?? itemLevelEnd,
    };
  }

  async function resolvePlanAndPeriods(
    snapshot: StripeSubscriptionSnapshot,
    context: SnapshotContext,
  ): Promise<
    | {
        ok: true;
        plan: { id: string; tier: string; billingInterval: string };
        periodStart: Date;
        periodEnd: Date;
        existing: {
          planId: string;
          userId: string;
          currentPeriodStart: Date | null;
          currentPeriodEnd: Date | null;
        } | null;
      }
    | { ok: false; error: string }
  > {
    const priceId = resolveOwnedPriceId(snapshot, context);
    if (!priceId) {
      return { ok: false, error: "Unrecognized Stripe Price" };
    }

    // Exactly one recognized active Price must control the subscription.
    const recognizedItems = (snapshot.raw.items?.data ?? []).filter((item) => {
      const itemPrice =
        typeof item.price === "string" ? item.price : item.price?.id;
      return itemPrice === priceId;
    });
    if (recognizedItems.length > 1) {
      return { ok: false, error: "Multiple recognized Stripe Prices" };
    }

    const plan = await db.getSubscriptionPlanByStripePriceId(priceId);
    if (!plan) {
      return { ok: false, error: "Unrecognized Stripe Price" };
    }

    const existing = await db.getSubscriptionByStripeIdForIngestion(
      snapshot.stripeSubscriptionId,
    );
    const userId = authorityUserId(context);
    if (existing && existing.userId !== userId) {
      return { ok: false, error: "Subscription already owned by another user" };
    }

    const periods = normalizePeriods(snapshot, priceId);
    if (!periods.ok) return periods;

    const periodStart = periods.currentPeriodStart
      ? new Date(periods.currentPeriodStart * 1000)
      : (existing?.currentPeriodStart ?? null);
    const periodEnd = periods.currentPeriodEnd
      ? new Date(periods.currentPeriodEnd * 1000)
      : (existing?.currentPeriodEnd ?? null);
    if (!periodStart || !periodEnd) {
      return {
        ok: false,
        error: "Missing required period dates for first-time ingestion",
      };
    }

    return { ok: true, plan, periodStart, periodEnd, existing };
  }

  function buildMutation(
    snapshot: StripeSubscriptionSnapshot,
    userId: string,
    planId: string,
    periodStart: Date,
    periodEnd: Date,
  ): SubscriptionMutation {
    return {
      userId,
      stripeCustomerId: snapshot.stripeCustomerId,
      planId,
      status: snapshot.status,
      currentPeriodStart: periodStart,
      currentPeriodEnd: periodEnd,
      cancelAtPeriodEnd: Boolean(snapshot.cancelAtPeriodEnd),
      trialEnd: snapshot.trialEnd ? new Date(snapshot.trialEnd * 1000) : null,
    };
  }

  function snapshotFromSubscription(
    sub: Stripe.Subscription,
    customerId: string,
  ): StripeSubscriptionSnapshot {
    const raw = sub as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      cancel_at?: number | null;
    };
    return {
      stripeSubscriptionId: sub.id,
      stripeCustomerId: customerId,
      status: sub.status,
      priceId:
        typeof sub.items?.data?.[0]?.price === "string"
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

  // ── Snapshot ingestion (sync / checkout / reconcile) ────────────────────

  async function ingestSnapshot(
    snapshot: StripeSubscriptionSnapshot,
    metadata: Record<string, string> | null | undefined,
    context: SnapshotContext,
  ): Promise<SnapshotIngestResult> {
    const mismatch = assertMetadataMatches(metadata, authorityUserId(context));
    if (mismatch) return { ok: false, error: mismatch };

    const resolved = await resolvePlanAndPeriods(snapshot, context);
    if (!resolved.ok) return resolved;

    const mutation = buildMutation(
      snapshot,
      authorityUserId(context),
      resolved.plan.id,
      resolved.periodStart,
      resolved.periodEnd,
    );

    const intentId =
      context.authority === "checkout-intent" ? context.intent.id : null;
    await db.upsertSubscriptionAndConsumeIntent(
      snapshot.stripeSubscriptionId,
      mutation,
      intentId,
    );

    return { ok: true };
  }

  // ── Trusted Checkout creation ───────────────────────────────────────────

  async function createTrustedCheckoutSession(input: {
    customerId: string;
    priceId: string;
    successUrl: string;
    cancelUrl: string;
    userId: string;
    planId: string;
    trialPeriodDays?: number;
  }): Promise<TrustedCheckoutResult> {
    let session: Stripe.Checkout.Session;
    try {
      session = await stripe.createCheckoutSession(input);
    } catch (error) {
      log("Failed to create Stripe Checkout session", error);
      return { ok: false, error: "Stripe Checkout session creation failed" };
    }
    if (!session.id || !session.url) {
      return { ok: false, error: "Stripe Checkout session missing id or url" };
    }

    try {
      await db.createCheckoutIntent({
        userId: input.userId,
        checkoutSessionId: session.id,
        stripeCustomerId: input.customerId,
        priceId: input.priceId,
        expiresAt: new Date(now().getTime() + CHECKOUT_INTENT_TTL_MS),
      });
    } catch (error) {
      log("Checkout intent persistence failed; expiring Stripe session", error);
      try {
        await stripe.expireCheckoutSession(session.id);
      } catch (compensationError) {
        log(
          "Failed to expire Stripe Checkout session after intent failure",
          compensationError,
        );
      }
      return { ok: false, error: "Checkout intent persistence failed" };
    }

    return { ok: true, url: session.url };
  }

  // ── Public snapshot ingestion ───────────────────────────────────────────

  async function ingestSubscriptionSnapshot(input: {
    snapshot: StripeSubscriptionSnapshot;
    metadata?: Record<string, string> | null;
    context: SnapshotContext;
  }): Promise<SnapshotIngestResult> {
    return ingestSnapshot(input.snapshot, input.metadata ?? null, input.context);
  }

  // ── Stripe event processing ─────────────────────────────────────────────

  async function processStripeEvent(input: {
    event: Stripe.Event;
  }): Promise<EventProcessResult> {
    if (SUPPORTED_NON_TERMINAL_EVENTS.has(input.event.type)) {
      return processNonTerminalEvent(input.event);
    }
    if (TERMINAL_EVENTS.has(input.event.type)) {
      return processTerminalEvent(input.event);
    }
    return { ok: true, outcome: "ignored" };
  }

  function extractSubscriptionIdentity(event: Stripe.Event):
    | {
        checkoutSessionId: string | null;
        subscriptionId: string;
        customerId: string;
      }
    | { error: string } {
    const object = event.data.object as
      | Stripe.Checkout.Session
      | Stripe.Subscription
      | Stripe.Invoice;
    if (event.type === "checkout.session.completed") {
      const session = object as Stripe.Checkout.Session;
      if (!session.subscription || !session.customer) {
        return { error: "Event missing subscription or customer" };
      }
      return {
        checkoutSessionId: session.id ?? null,
        subscriptionId:
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription.id,
        customerId:
          typeof session.customer === "string" ? session.customer : session.customer.id,
      };
    }
    if (event.type === "invoice.payment_failed") {
      const invoice = object as unknown as {
        subscription?: string | { id: string } | null;
        customer?: string | { id: string } | null;
      };
      if (!invoice.subscription) {
        return { error: "Event missing subscription" };
      }
      return {
        checkoutSessionId: null,
        subscriptionId:
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription.id,
        customerId:
          typeof invoice.customer === "string"
            ? invoice.customer
            : invoice.customer?.id ?? "",
      };
    }
    const subscription = object as Stripe.Subscription;
    if (!subscription.id) {
      return { error: "Event missing subscription id" };
    }
    const customerId = subscription.customer;
    return {
      checkoutSessionId: null,
      subscriptionId: subscription.id,
      customerId:
        typeof customerId === "string" ? customerId : customerId?.id ?? "",
    };
  }

  /** Apply one event attempt through the shared apply/ignore/fail cascade. */
  async function applyEventAttempt(input: {
    event: Stripe.Event;
    subscriptionId: string;
    customerId: string;
    snapshot: StripeSubscriptionSnapshot;
    metadata: Record<string, string> | null;
    context: SnapshotContext;
  }): Promise<EventProcessResult> {
    const { event, subscriptionId, customerId, snapshot, metadata, context } =
      input;
    const eventCreated = BigInt(event.created ?? 0);
    const attemptNumber = await nextAttemptNumber(event.id);

    const mismatch = assertMetadataMatches(metadata, authorityUserId(context));
    if (mismatch) {
      return recordFailure(event, eventCreated, attemptNumber, subscriptionId, mismatch);
    }

    const resolved = await resolvePlanAndPeriods(snapshot, context);
    if (!resolved.ok) {
      return recordFailure(event, eventCreated, attemptNumber, subscriptionId, resolved.error);
    }

    const mutation = buildMutation(
      snapshot,
      authorityUserId(context),
      resolved.plan.id,
      resolved.periodStart,
      resolved.periodEnd,
    );

    const intentId =
      context.authority === "checkout-intent" ? context.intent.id : null;
    const applied = await db.applySubscriptionMutation(
      subscriptionId,
      mutation,
      {
        stripeEventId: event.id,
        attemptNumber,
        eventType: event.type,
        stripeCreated: eventCreated,
        stripeSubscriptionId: subscriptionId,
        outcome: "applied",
      },
      intentId,
    );

    if (!applied.applied) {
      if (applied.ignored) {
        return { ok: true, outcome: "ignored" };
      }
      return recordFailure(
        event,
        eventCreated,
        attemptNumber,
        subscriptionId,
        applied.error ?? "Persistence failed",
      );
    }

    return { ok: true, outcome: "applied" };
  }

  async function processNonTerminalEvent(
    event: Stripe.Event,
  ): Promise<EventProcessResult> {
    const identity = extractSubscriptionIdentity(event);
    if ("error" in identity) {
      return { ok: false, error: identity.error };
    }
    const { checkoutSessionId, subscriptionId, customerId } = identity;

    let metadata: Record<string, string> | null = null;
    let snapshot: StripeSubscriptionSnapshot;
    let context: SnapshotContext;

    if (event.type === "checkout.session.completed" && checkoutSessionId) {
      const intent = await db.getCheckoutIntentBySession(checkoutSessionId);
      if (!intent) {
        return recordFailure(
          event,
          BigInt(event.created ?? 0),
          await nextAttemptNumber(event.id),
          subscriptionId,
          "No Checkout intent for session",
        );
      }
      if (intent.state === "pending" && intent.expiresAt < now()) {
        return recordFailure(
          event,
          BigInt(event.created ?? 0),
          await nextAttemptNumber(event.id),
          subscriptionId,
          "Checkout intent expired",
        );
      }

      const session = await stripe.retrieveCheckoutSession(checkoutSessionId);
      metadata = (session.metadata as Record<string, string> | null) ?? null;
      const liveSub = await stripe.retrieveSubscription(subscriptionId);
      snapshot = snapshotFromSubscription(liveSub, customerId);
      context = { authority: "checkout-intent", intent };
    } else {
      const existing = await db.getSubscriptionByStripeIdForIngestion(
        subscriptionId,
      );
      if (!existing) {
        return recordFailure(
          event,
          BigInt(event.created ?? 0),
          await nextAttemptNumber(event.id),
          subscriptionId,
          "No persisted Subscription for event",
        );
      }
      const liveSub = await stripe.retrieveSubscription(subscriptionId);
      snapshot = snapshotFromSubscription(liveSub, customerId);
      context = { authority: "persisted-subscription", userId: existing.userId };
    }

    return applyEventAttempt({
      event,
      subscriptionId,
      customerId,
      snapshot,
      metadata,
      context,
    });
  }

  async function processTerminalEvent(
    event: Stripe.Event,
  ): Promise<EventProcessResult> {
    const identity = extractSubscriptionIdentity(event);
    if ("error" in identity) {
      return { ok: false, error: identity.error };
    }
    const { subscriptionId, customerId } = identity;

    const existing = await db.getSubscriptionByStripeIdForIngestion(
      subscriptionId,
    );
    if (!existing) {
      return recordFailure(
        event,
        BigInt(event.created ?? 0),
        await nextAttemptNumber(event.id),
        subscriptionId,
        "No persisted Subscription for terminal event",
      );
    }

    let liveSub: Stripe.Subscription;
    try {
      liveSub = await stripe.retrieveSubscription(subscriptionId);
    } catch {
      liveSub = event.data.object as Stripe.Subscription;
    }

    const snapshot = snapshotFromSubscription(liveSub, customerId);
    return applyEventAttempt({
      event,
      subscriptionId,
      customerId,
      snapshot,
      metadata: null,
      context: { authority: "persisted-subscription", userId: existing.userId },
    });
  }

  async function recordFailure(
    event: Stripe.Event,
    eventCreated: bigint,
    attemptNumber: number,
    subscriptionId: string,
    message: string,
  ): Promise<EventProcessResult> {
    try {
      await db.recordFailedEventAttempt({
        stripeEventId: event.id,
        attemptNumber,
        eventType: event.type,
        stripeCreated: eventCreated,
        stripeSubscriptionId: subscriptionId,
        outcome: "failed",
        failureMessage: message,
      });
    } catch (error) {
      log("Failed to record Stripe event attempt", error);
    }
    return { ok: false, error: message };
  }

  async function nextAttemptNumber(stripeEventId: string): Promise<number> {
    const latest = await db.getLatestEventAttempt(stripeEventId);
    return latest ? latest.attemptNumber + 1 : 1;
  }

  // ── Plan changes (checkout handler) ─────────────────────────────────────

  /**
   * Change an existing Stripe Subscription to a target Price. Retry-safe: the
   * current Stripe state is retrieved first; if the target is already the
   * active Price or already scheduled for activation, no Stripe mutation is
   * issued — the current state is returned so the caller can ingest it.
   */
  async function changePlanIfNeeded(input: {
    subscriptionId: string;
    priceId: string;
    isUpgrade: boolean;
    isTrialing: boolean;
  }): Promise<{
    ok: true;
    subscription: Stripe.Subscription;
  } | { ok: false; error: string }> {
    let current: Stripe.Subscription;
    try {
      current = await stripe.retrieveSubscription(input.subscriptionId);
    } catch (error) {
      log("Failed to retrieve subscription before plan change", error);
      return { ok: false, error: "Stripe subscription retrieval failed" };
    }

    const activePriceId =
      typeof current.items?.data?.[0]?.price === "string"
        ? current.items.data[0].price
        : current.items?.data?.[0]?.price?.id;
    if (activePriceId === input.priceId) {
      return { ok: true, subscription: current };
    }

    if (current.schedule) {
      const scheduleId =
        typeof current.schedule === "string"
          ? current.schedule
          : current.schedule.id;
      try {
        const schedule = await stripe.getSubscriptionSchedules(scheduleId);
        // Only an active/not_started schedule is a live plan change. A stale
        // (canceled/released/completed) schedule no longer applies its phases,
        // so its contents must not suppress a fresh mutation.
        const isLive =
          schedule.status === "not_started" || schedule.status === "active";
        const alreadyScheduled =
          isLive &&
          schedule.phases.some((phase) =>
            phase.items.some((item) => {
              const price =
                typeof item.price === "string" ? item.price : item.price?.id;
              return price === input.priceId;
            }),
          );
        if (alreadyScheduled) {
          return { ok: true, subscription: current };
        }
      } catch (error) {
        log("Scheduled-change check failed; proceeding with mutation", error);
      }
    }

    try {
      const updated = await stripe.updateStripeSubscription(input);
      return { ok: true, subscription: updated };
    } catch (error) {
      log("Stripe plan change failed", error);
      return { ok: false, error: "Stripe plan change failed" };
    }
  }

  return {
    createTrustedCheckoutSession,
    ingestSubscriptionSnapshot,
    processStripeEvent,
    changePlanIfNeeded,
    snapshotFromSubscription,
  };
}

export const subscriptionIngestion = createSubscriptionIngestionWith({
  db: {
    getCheckoutIntentBySession,
    getSubscriptionByStripeIdForIngestion,
    getSubscriptionPlanByStripePriceId,
    createCheckoutIntent,
    getLatestEventAttempt,
    recordFailedEventAttempt,
    applySubscriptionMutation,
    upsertSubscriptionAndConsumeIntent,
  },
  stripe: {
    createCheckoutSession: createStripeCheckoutSession,
    retrieveCheckoutSession,
    retrieveSubscription,
    expireCheckoutSession: (sessionId) =>
      stripe.checkout.sessions.expire(sessionId),
    updateStripeSubscription,
    getSubscriptionSchedules: (scheduleId) =>
      stripe.subscriptionSchedules.retrieve(scheduleId),
  },
});
