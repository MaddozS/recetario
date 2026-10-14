import { describe, expect, it, vi, beforeEach } from 'vitest';
import type Stripe from 'stripe';
import { CHECKOUT_INTENT_TTL_MS, createSubscriptionIngestionWith } from './subscription-ingestion';
import type { IngestionDeps, CheckoutIntentRow } from './subscription-ingestion';

type Deps = {
  db: Record<string, ReturnType<typeof vi.fn>>;
  stripe: Record<string, ReturnType<typeof vi.fn>>;
  log: ReturnType<typeof vi.fn>;
  now: () => Date;
};

function makeIntent(overrides: Partial<CheckoutIntentRow> = {}): CheckoutIntentRow {
  return {
    id: 'intent-1',
    userId: 'user-1',
    checkoutSessionId: 'cs_123',
    stripeCustomerId: 'cus_123',
    priceId: 'price_pro_monthly',
    state: 'pending',
    stripeSubscriptionId: null,
    createdAt: new Date('2026-08-01T00:00:00Z'),
    expiresAt: new Date('2026-09-02T00:00:00Z'),
    consumedAt: null,
    ...overrides,
  };
}

function makeSub(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 'sub_123',
    status: 'active',
    customer: 'cus_123',
    cancel_at_period_end: false,
    cancel_at: null,
    trial_end: null,
    current_period_start: 1767225600,
    current_period_end: 1769817600,
    items: { data: [{ price: { id: 'price_pro_monthly' } }] },
    ...overrides,
  } as unknown as Stripe.Subscription;
}

function makeDeps() {
  const db: Record<string, ReturnType<typeof vi.fn>> = {
    getCheckoutIntentBySession: vi.fn().mockResolvedValue(null),
    getSubscriptionByStripeIdForIngestion: vi.fn().mockResolvedValue(null),
    getSubscriptionPlanByStripePriceId: vi.fn().mockResolvedValue({
      id: 'pro_monthly',
      tier: 'pro',
      billingInterval: 'monthly',
    }),
    createCheckoutIntent: vi.fn().mockResolvedValue({}),
    getLatestEventAttempt: vi.fn().mockResolvedValue(null),
    recordFailedEventAttempt: vi.fn().mockResolvedValue({}),
    applySubscriptionMutation: vi.fn().mockResolvedValue({ applied: true }),
    upsertSubscriptionAndConsumeIntent: vi.fn().mockResolvedValue({}),
  };
  const stripe: Record<string, ReturnType<typeof vi.fn>> = {
    createCheckoutSession: vi.fn().mockResolvedValue({
      id: 'cs_123',
      url: 'https://checkout.stripe.com/pay/cs_123',
      customer: 'cus_123',
    }),
    retrieveCheckoutSession: vi.fn().mockResolvedValue({
      id: 'cs_123',
      customer: 'cus_123',
      subscription: 'sub_123',
      metadata: { userId: 'user-1', planId: 'pro_monthly' },
    }),
    retrieveSubscription: vi.fn().mockResolvedValue(makeSub()),
    expireCheckoutSession: vi.fn().mockResolvedValue({}),
    updateStripeSubscription: vi.fn().mockResolvedValue(makeSub()),
    getSubscriptionSchedules: vi.fn().mockResolvedValue({ phases: [] }),
  };
  const log = vi.fn();
  const now = () => new Date('2026-08-20T12:00:00Z');
  const ingestion = createSubscriptionIngestionWith({
    db: db as unknown as IngestionDeps['db'],
    stripe: stripe as unknown as IngestionDeps['stripe'],
    log,
    now,
  });
  return { db, stripe, log, now, ingestion };
}

describe('createTrustedCheckoutSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists a Checkout intent with 24h expiry before returning the URL', async () => {
    const { db, stripe, ingestion } = makeDeps();
    const result = await ingestion.createTrustedCheckoutSession({
      customerId: 'cus_123',
      priceId: 'price_pro_monthly',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
      userId: 'user-1',
      planId: 'pro_monthly',
      trialPeriodDays: 14,
    });

    expect(result).toEqual({ ok: true, url: 'https://checkout.stripe.com/pay/cs_123' });
    expect(db.createCheckoutIntent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        checkoutSessionId: 'cs_123',
        stripeCustomerId: 'cus_123',
        priceId: 'price_pro_monthly',
      })
    );
    const created = (db.createCheckoutIntent as ReturnType<typeof vi.fn>).mock.calls[0][0] as {
      expiresAt: Date;
    };
    expect(created.expiresAt.getTime() - new Date('2026-08-20T12:00:00Z').getTime()).toBe(
      CHECKOUT_INTENT_TTL_MS
    );
    expect(stripe.expireCheckoutSession).not.toHaveBeenCalled();
  });

  it('expires the Stripe session and withholds the URL when intent persistence fails', async () => {
    const { db, stripe, ingestion } = makeDeps();
    db.createCheckoutIntent.mockRejectedValue(new Error('db down'));

    const result = await ingestion.createTrustedCheckoutSession({
      customerId: 'cus_123',
      priceId: 'price_pro_monthly',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
      userId: 'user-1',
      planId: 'pro_monthly',
    });

    expect(result).toEqual({ ok: false, error: 'Checkout intent persistence failed' });
    expect(stripe.expireCheckoutSession).toHaveBeenCalledWith('cs_123');
  });

  it('surfaces compensation failure without exposing the URL', async () => {
    const { db, stripe, log, ingestion } = makeDeps();
    db.createCheckoutIntent.mockRejectedValue(new Error('db down'));
    stripe.expireCheckoutSession.mockRejectedValue(new Error('stripe down'));

    const result = await ingestion.createTrustedCheckoutSession({
      customerId: 'cus_123',
      priceId: 'price_pro_monthly',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
      userId: 'user-1',
      planId: 'pro_monthly',
    });

    expect(result).toEqual({ ok: false, error: 'Checkout intent persistence failed' });
    expect(log).toHaveBeenCalledWith(
      'Failed to expire Stripe Checkout session after intent failure',
      expect.any(Error)
    );
  });
});

describe('ingestSubscriptionSnapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function snapshot(overrides: Partial<Record<string, unknown>> = {}) {
    const raw = makeSub(overrides) as unknown as {
      current_period_start?: number | null;
      current_period_end?: number | null;
    };
    return {
      stripeSubscriptionId: 'sub_123',
      stripeCustomerId: 'cus_123',
      status: (makeSub(overrides) as unknown as { status: string }).status,
      priceId: 'price_pro_monthly',
      currentPeriodStart: raw.current_period_start ?? null,
      currentPeriodEnd: raw.current_period_end ?? null,
      cancelAtPeriodEnd: false,
      cancelAt: null,
      trialEnd: null,
      raw: makeSub(overrides),
    };
  }

  it('ingests a snapshot under authenticated-user authority and upserts atomically', async () => {
    const { db, ingestion } = makeDeps();
    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot(),
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({ ok: true });
    expect(db.upsertSubscriptionAndConsumeIntent).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({
        userId: 'user-1',
        planId: 'pro_monthly',
        status: 'active',
      }),
      null
    );
  });

  it('rejects metadata that contradicts the authenticated user', async () => {
    const { db, ingestion } = makeDeps();
    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot(),
      metadata: { userId: 'user-evil', planId: 'pro_monthly' },
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({ ok: false, error: 'Metadata userId mismatch' });
    expect(db.upsertSubscriptionAndConsumeIntent).not.toHaveBeenCalled();
  });

  it('resolves the plan from the Checkout intent price, not the snapshot price', async () => {
    const { db, ingestion } = makeDeps();
    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot({ priceId: 'price_other' }),
      context: { authority: 'checkout-intent', intent: makeIntent() },
    });

    expect(result).toEqual({ ok: true });
    expect(db.getSubscriptionPlanByStripePriceId).toHaveBeenCalledWith('price_pro_monthly');
  });

  it('rejects when zero recognized prices exist', async () => {
    const { db, ingestion } = makeDeps();
    db.getSubscriptionPlanByStripePriceId.mockResolvedValue(null);

    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot(),
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({ ok: false, error: 'Unrecognized Stripe Price' });
  });

  it('rejects when multiple items carry the recognized price', async () => {
    const { ingestion } = makeDeps();
    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot({
        items: {
          data: [{ price: { id: 'price_pro_monthly' } }, { price: { id: 'price_pro_monthly' } }],
        },
      }),
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({ ok: false, error: 'Multiple recognized Stripe Prices' });
  });

  it('rejects contradictory subscription-level and item-level period values', async () => {
    const { ingestion } = makeDeps();
    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot({
        current_period_end: 1769817600,
        items: {
          data: [
            {
              price: { id: 'price_pro_monthly' },
              current_period_start: 1767225600,
              current_period_end: 1770000000,
            },
          ],
        },
      }),
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({ ok: false, error: 'Contradictory period end values' });
  });

  it('preserves persisted period dates when Stripe omits them', async () => {
    const { db, ingestion } = makeDeps();
    db.getSubscriptionByStripeIdForIngestion.mockResolvedValue({
      planId: 'pro_monthly',
      userId: 'user-1',
      currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
    });

    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot({
        current_period_start: null,
        current_period_end: null,
      }),
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({ ok: true });
    expect(db.upsertSubscriptionAndConsumeIntent).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({
        currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
        currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
      }),
      null
    );
  });

  it('rejects first-time ingestion when required periods are missing', async () => {
    const { db, ingestion } = makeDeps();
    db.getSubscriptionByStripeIdForIngestion.mockResolvedValue(null);

    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot({ current_period_start: null, current_period_end: null }),
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({
      ok: false,
      error: 'Missing required period dates for first-time ingestion',
    });
    expect(db.upsertSubscriptionAndConsumeIntent).not.toHaveBeenCalled();
  });

  it('persists raw status and consumes the intent for checkout authority', async () => {
    const { db, ingestion } = makeDeps();
    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot({ status: 'incomplete_expired' }),
      context: { authority: 'checkout-intent', intent: makeIntent() },
    });

    expect(result).toEqual({ ok: true });
    expect(db.upsertSubscriptionAndConsumeIntent).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({ status: 'incomplete_expired' }),
      'intent-1'
    );
  });

  it('rejects ingestion when the subscription is owned by another user', async () => {
    const { db, ingestion } = makeDeps();
    db.getSubscriptionByStripeIdForIngestion.mockResolvedValue({
      planId: 'pro_monthly',
      userId: 'user-2',
      currentPeriodStart: null,
      currentPeriodEnd: null,
    });

    const result = await ingestion.ingestSubscriptionSnapshot({
      snapshot: snapshot(),
      context: { authority: 'authenticated-user', userId: 'user-1' },
    });

    expect(result).toEqual({
      ok: false,
      error: 'Subscription already owned by another user',
    });
  });
});

describe('processStripeEvent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function event(type: string, overrides: Record<string, unknown> = {}) {
    return {
      id: 'evt_1',
      created: 1767225600,
      type,
      data: { object: overrides },
    } as unknown as Stripe.Event;
  }

  it('retrieves current Stripe state and applies checkout completion via intent', async () => {
    const { db, stripe, ingestion } = makeDeps();
    db.getCheckoutIntentBySession.mockResolvedValue(makeIntent());

    const result = await ingestion.processStripeEvent({
      event: event('checkout.session.completed', {
        id: 'cs_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: true, outcome: 'applied' });
    expect(stripe.retrieveCheckoutSession).toHaveBeenCalledWith('cs_123');
    expect(stripe.retrieveSubscription).toHaveBeenCalledWith('sub_123');
    expect(db.applySubscriptionMutation).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({ planId: 'pro_monthly', status: 'active' }),
      expect.objectContaining({ stripeEventId: 'evt_1' }),
      'intent-1'
    );
  });

  it('records a failed attempt and returns failure when no Checkout intent exists', async () => {
    const { db, ingestion } = makeDeps();

    const result = await ingestion.processStripeEvent({
      event: event('checkout.session.completed', {
        id: 'cs_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: false, error: 'No Checkout intent for session' });
    expect(db.recordFailedEventAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        stripeEventId: 'evt_1',
        outcome: 'failed',
        failureMessage: 'No Checkout intent for session',
      })
    );
  });

  it('rejects an expired Checkout intent', async () => {
    const { db, ingestion } = makeDeps();
    db.getCheckoutIntentBySession.mockResolvedValue(
      makeIntent({ expiresAt: new Date('2026-01-01T00:00:00Z') })
    );

    const result = await ingestion.processStripeEvent({
      event: event('checkout.session.completed', {
        id: 'cs_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: false, error: 'Checkout intent expired' });
    expect(db.recordFailedEventAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ failureMessage: 'Checkout intent expired' })
    );
  });

  it('returns ignored for duplicate terminal attempts', async () => {
    const { db, ingestion } = makeDeps();
    db.getCheckoutIntentBySession.mockResolvedValue(makeIntent());
    db.applySubscriptionMutation.mockResolvedValue({
      applied: false,
      ignored: true,
      reason: 'duplicate',
    });

    const result = await ingestion.processStripeEvent({
      event: event('checkout.session.completed', {
        id: 'cs_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: true, outcome: 'ignored' });
  });

  it('records failure when the mutation transaction fails and returns retryable error', async () => {
    const { db, ingestion } = makeDeps();
    db.getCheckoutIntentBySession.mockResolvedValue(makeIntent());
    db.applySubscriptionMutation.mockResolvedValue({
      applied: false,
      ignored: false,
      error: 'persistence boom',
    });

    const result = await ingestion.processStripeEvent({
      event: event('checkout.session.completed', {
        id: 'cs_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: false, error: 'persistence boom' });
    expect(db.recordFailedEventAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ outcome: 'failed', failureMessage: 'persistence boom' })
    );
  });

  it('no consulta el número de intento en el camino feliz: lo decide la transacción', async () => {
    const { db, ingestion } = makeDeps();
    db.getCheckoutIntentBySession.mockResolvedValue(makeIntent());
    db.getLatestEventAttempt.mockResolvedValue({ attemptNumber: 2 });

    const result = await ingestion.processStripeEvent({
      event: event('checkout.session.completed', {
        id: 'cs_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: true, outcome: 'applied' });
    expect(db.getLatestEventAttempt).not.toHaveBeenCalled();
    expect(db.applySubscriptionMutation).toHaveBeenCalledWith(
      'sub_123',
      expect.anything(),
      expect.objectContaining({ stripeEventId: 'evt_1' }),
      'intent-1'
    );
  });

  it('reutiliza la suscripción ya leída al resolver plan y periodos', async () => {
    const { db, ingestion } = makeDeps();
    const stored = {
      planId: 'pro_monthly',
      userId: 'user-1',
      currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
    };
    db.getSubscriptionByStripeIdForIngestion.mockResolvedValue(stored);

    const result = await ingestion.processStripeEvent({
      event: event('customer.subscription.updated', {
        id: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: true, outcome: 'applied' });
    expect(db.getSubscriptionByStripeIdForIngestion).toHaveBeenCalledTimes(1);
  });

  it('processes customer.subscription.updated through persisted linkage', async () => {
    const { db, ingestion } = makeDeps();
    db.getSubscriptionByStripeIdForIngestion.mockResolvedValue({
      planId: 'pro_monthly',
      userId: 'user-1',
      currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
    });

    const result = await ingestion.processStripeEvent({
      event: event('customer.subscription.updated', {
        id: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: true, outcome: 'applied' });
    expect(db.applySubscriptionMutation).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({ userId: 'user-1', planId: 'pro_monthly' }),
      expect.objectContaining({ eventType: 'customer.subscription.updated' }),
      null
    );
  });

  it('records failure when no persisted subscription exists for a lifecycle event', async () => {
    const { db, ingestion } = makeDeps();

    const result = await ingestion.processStripeEvent({
      event: event('invoice.payment_failed', {
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({
      ok: false,
      error: 'No persisted Subscription for event',
    });
    expect(db.recordFailedEventAttempt).toHaveBeenCalledWith(
      expect.objectContaining({ failureMessage: 'No persisted Subscription for event' })
    );
  });

  it('ingests the signed terminal payload when current retrieval is unavailable for deletion', async () => {
    const { db, stripe, ingestion } = makeDeps();
    db.getSubscriptionByStripeIdForIngestion.mockResolvedValue({
      planId: 'pro_monthly',
      userId: 'user-1',
      currentPeriodStart: new Date('2026-01-01T00:00:00Z'),
      currentPeriodEnd: new Date('2026-02-01T00:00:00Z'),
    });
    stripe.retrieveSubscription.mockRejectedValue(new Error('gone'));

    const result = await ingestion.processStripeEvent({
      event: event('customer.subscription.deleted', {
        id: 'sub_123',
        customer: 'cus_123',
        status: 'canceled',
        current_period_start: 1767225600,
        current_period_end: 1769817600,
        items: { data: [{ price: { id: 'price_pro_monthly' } }] },
      }),
    });

    expect(result).toEqual({ ok: true, outcome: 'applied' });
    expect(db.applySubscriptionMutation).toHaveBeenCalledWith(
      'sub_123',
      expect.objectContaining({ status: 'canceled', planId: 'pro_monthly' }),
      expect.objectContaining({ eventType: 'customer.subscription.deleted' }),
      null
    );
  });

  it('acknowledges unsupported event types without mutation', async () => {
    const { db, ingestion } = makeDeps();

    const result = await ingestion.processStripeEvent({
      event: event('charge.succeeded', { id: 'ch_1' }),
    });

    expect(result).toEqual({ ok: true, outcome: 'ignored' });
    expect(db.applySubscriptionMutation).not.toHaveBeenCalled();
    expect(db.recordFailedEventAttempt).not.toHaveBeenCalled();
  });

  it('passes the (created, id) ordering cursor to the persistence seam', async () => {
    const { db, ingestion } = makeDeps();
    db.getCheckoutIntentBySession.mockResolvedValue(makeIntent());
    db.applySubscriptionMutation.mockResolvedValue({
      applied: false,
      ignored: true,
      reason: 'stale',
    });

    const result = await ingestion.processStripeEvent({
      event: event('checkout.session.completed', {
        id: 'cs_123',
        subscription: 'sub_123',
        customer: 'cus_123',
      }),
    });

    expect(result).toEqual({ ok: true, outcome: 'ignored' });
    expect(db.applySubscriptionMutation).toHaveBeenCalledWith(
      'sub_123',
      expect.anything(),
      expect.objectContaining({ stripeCreated: 1767225600n, stripeEventId: 'evt_1' }),
      'intent-1'
    );
  });
});

describe('changePlanIfNeeded', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips the Stripe mutation when the target is already the active price', async () => {
    const { stripe, ingestion } = makeDeps();
    stripe.retrieveSubscription.mockResolvedValue(makeSub());
    stripe.updateStripeSubscription.mockResolvedValue(makeSub());

    const result = await ingestion.changePlanIfNeeded({
      subscriptionId: 'sub_123',
      priceId: 'price_pro_monthly',
      isUpgrade: true,
      isTrialing: false,
    });

    expect(result).toEqual({ ok: true, subscription: expect.anything() });
    expect(stripe.updateStripeSubscription).not.toHaveBeenCalled();
  });

  it('skips the Stripe mutation when the target is already scheduled', async () => {
    const { stripe, ingestion } = makeDeps();
    stripe.retrieveSubscription.mockResolvedValue(
      makeSub({
        items: { data: [{ price: { id: 'price_basic_monthly' } }] },
        schedule: 'sub_sched_1',
      })
    );
    stripe.getSubscriptionSchedules.mockResolvedValue({
      status: 'active',
      phases: [
        { items: [{ price: 'price_basic_monthly' }], start_date: 1767225600 },
        { items: [{ price: 'price_pro_monthly' }], start_date: 1769817600 },
      ],
    });

    const result = await ingestion.changePlanIfNeeded({
      subscriptionId: 'sub_123',
      priceId: 'price_pro_monthly',
      isUpgrade: true,
      isTrialing: false,
    });

    expect(result).toEqual({ ok: true, subscription: expect.anything() });
    expect(stripe.updateStripeSubscription).not.toHaveBeenCalled();
  });

  it('issues the Stripe mutation when the target is neither active nor scheduled', async () => {
    const { stripe, ingestion } = makeDeps();
    stripe.retrieveSubscription.mockResolvedValue(
      makeSub({ items: { data: [{ price: { id: 'price_basic_monthly' } }] } })
    );
    stripe.updateStripeSubscription.mockResolvedValue(makeSub());

    const result = await ingestion.changePlanIfNeeded({
      subscriptionId: 'sub_123',
      priceId: 'price_pro_monthly',
      isUpgrade: true,
      isTrialing: false,
    });

    expect(result).toEqual({ ok: true, subscription: expect.anything() });
    expect(stripe.updateStripeSubscription).toHaveBeenCalledWith({
      subscriptionId: 'sub_123',
      priceId: 'price_pro_monthly',
      isUpgrade: true,
      isTrialing: false,
    });
  });

  it('issues the Stripe mutation when the schedule is canceled even though it lists the target price', async () => {
    const { stripe, ingestion } = makeDeps();
    stripe.retrieveSubscription.mockResolvedValue(
      makeSub({
        items: { data: [{ price: { id: 'price_basic_monthly' } }] },
        schedule: 'sub_sched_1',
      })
    );
    stripe.getSubscriptionSchedules.mockResolvedValue({
      status: 'canceled',
      phases: [
        { items: [{ price: 'price_basic_monthly' }], start_date: 1767225600 },
        { items: [{ price: 'price_pro_monthly' }], start_date: 1769817600 },
      ],
    });
    stripe.updateStripeSubscription.mockResolvedValue(makeSub());

    const result = await ingestion.changePlanIfNeeded({
      subscriptionId: 'sub_123',
      priceId: 'price_pro_monthly',
      isUpgrade: true,
      isTrialing: false,
    });

    expect(result).toEqual({ ok: true, subscription: expect.anything() });
    expect(stripe.updateStripeSubscription).toHaveBeenCalled();
  });
});
