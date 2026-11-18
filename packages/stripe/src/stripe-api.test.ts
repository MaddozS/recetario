import { describe, expect, it, vi } from 'vitest';

const {
  prices,
  createSession,
  retrieveSubscription,
  updateSubscription,
  createSchedule,
  updateSchedule,
  retrieveSchedule,
  constructEventAsync,
  constructEvent,
} = vi.hoisted(() => ({
  prices: vi.fn(),
  createSession: vi.fn(),
  retrieveSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  retrieveSchedule: vi.fn(),
  constructEventAsync: vi.fn(),
  constructEvent: vi.fn(),
}));

vi.mock('./stripe-client', () => ({
  stripe: {
    prices: { list: prices },
    checkout: { sessions: { create: createSession } },
    subscriptions: { retrieve: retrieveSubscription, update: updateSubscription },
    subscriptionSchedules: {
      create: createSchedule,
      update: updateSchedule,
      retrieve: retrieveSchedule,
    },
    webhooks: { constructEventAsync, constructEvent },
  },
}));

const { listPrices, createCheckoutSession, updateStripeSubscription, verifyWebhookSignature } =
  await import('./stripe-api');

describe('stripe-api', () => {
  it('filters unknown tiers and maps Stripe prices to sync inputs', async () => {
    prices.mockResolvedValueOnce({
      data: [
        {
          id: 'price_basic_monthly',
          unit_amount: 999,
          currency: 'mxn',
          recurring: { interval: 'month' },
          product: { name: 'Basic', metadata: { tier: 'basic', recipes_limit: '75' } },
        },
        {
          id: 'price_unknown',
          unit_amount: 1,
          currency: 'mxn',
          recurring: { interval: 'month' },
          product: { name: 'Unknown', metadata: { tier: 'unknown' } },
        },
      ],
    });

    await expect(listPrices()).resolves.toEqual([
      expect.objectContaining({
        id: 'basic_monthly',
        tier: 'basic',
        billingInterval: 'monthly',
        stripePriceId: 'price_basic_monthly',
        priceCents: 999,
        recipesLimit: 75,
        featuresJson: expect.stringContaining('recipe_duplicate'),
      }),
    ]);
  });

  it('creates checkout session with trial when trialPeriodDays > 0', async () => {
    createSession.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/test' });
    await createCheckoutSession({
      customerId: 'cus_123',
      priceId: 'price_basic',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
      userId: 'user_123',
      planId: 'plan_basic',
      trialPeriodDays: 14,
    });

    expect(createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        subscription_data: { trial_period_days: 14 },
      })
    );
  });

  it('creates checkout session without trial when trialPeriodDays is undefined or 0', async () => {
    createSession.mockResolvedValueOnce({ url: 'https://checkout.stripe.com/test' });
    await createCheckoutSession({
      customerId: 'cus_123',
      priceId: 'price_basic',
      successUrl: 'https://app/success',
      cancelUrl: 'https://app/cancel',
      userId: 'user_123',
      planId: 'plan_basic',
    });

    expect(createSession).toHaveBeenCalledWith(
      expect.not.objectContaining({
        subscription_data: expect.anything(),
      })
    );
  });

  it('updates existing subscription with always_invoice on upgrade', async () => {
    retrieveSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      items: { data: [{ id: 'item_123' }] },
    });
    updateSubscription.mockResolvedValueOnce({ id: 'sub_123', status: 'active' });

    await updateStripeSubscription({
      subscriptionId: 'sub_123',
      priceId: 'price_pro',
      isUpgrade: true,
      isTrialing: false,
    });

    expect(updateSubscription).toHaveBeenCalledWith('sub_123', {
      items: [{ id: 'item_123', price: 'price_pro' }],
      proration_behavior: 'always_invoice',
    });
  });

  it('updates existing subscription preserving trial when trialing', async () => {
    retrieveSubscription.mockResolvedValueOnce({
      id: 'sub_123',
      items: { data: [{ id: 'item_123' }] },
    });
    updateSubscription.mockResolvedValueOnce({ id: 'sub_123', status: 'trialing' });

    await updateStripeSubscription({
      subscriptionId: 'sub_123',
      priceId: 'price_pro',
      isUpgrade: true,
      isTrialing: true,
    });

    expect(updateSubscription).toHaveBeenCalledWith('sub_123', {
      items: [{ id: 'item_123', price: 'price_pro' }],
      proration_behavior: 'always_invoice',
    });
  });

  it('updates existing subscription with subscription schedule on downgrade', async () => {
    retrieveSubscription.mockResolvedValue({
      id: 'sub_123',
      items: { data: [{ id: 'item_123', price: { id: 'price_pro' } }] },
      current_period_end: 1789689600,
    });
    createSchedule.mockResolvedValueOnce({
      id: 'sched_123',
      phases: [{ start_date: 1750000000, end_date: 1789689600, items: [{ price: 'price_pro' }] }],
    });
    updateSchedule.mockResolvedValueOnce({ id: 'sched_123' });

    await updateStripeSubscription({
      subscriptionId: 'sub_123',
      priceId: 'price_basic',
      isUpgrade: false,
      isTrialing: false,
    });

    expect(createSchedule).toHaveBeenCalledWith({ from_subscription: 'sub_123' });
    expect(updateSchedule).toHaveBeenCalledWith(
      'sched_123',
      expect.objectContaining({
        end_behavior: 'release',
        phases: expect.arrayContaining([
          expect.objectContaining({ items: [{ price: 'price_basic', quantity: 1 }] }),
        ]),
      })
    );
  });

  it('starts a fresh schedule when the existing schedule is canceled on downgrade', async () => {
    retrieveSubscription.mockResolvedValue({
      id: 'sub_123',
      items: { data: [{ id: 'item_123', price: { id: 'price_pro' } }] },
      current_period_end: 1789689600,
      schedule: 'sched_stale',
    });
    retrieveSchedule.mockResolvedValueOnce({
      id: 'sched_stale',
      status: 'canceled',
      phases: [],
    });
    createSchedule.mockResolvedValueOnce({
      id: 'sched_fresh',
      status: 'active',
      phases: [{ start_date: 1750000000, end_date: 1789689600, items: [{ price: 'price_pro' }] }],
    });
    updateSchedule.mockResolvedValueOnce({ id: 'sched_fresh' });

    await updateStripeSubscription({
      subscriptionId: 'sub_123',
      priceId: 'price_basic',
      isUpgrade: false,
      isTrialing: false,
    });

    expect(retrieveSchedule).toHaveBeenCalledWith('sched_stale');
    expect(createSchedule).toHaveBeenCalledWith({ from_subscription: 'sub_123' });
    expect(updateSchedule).toHaveBeenCalledWith(
      'sched_fresh',
      expect.objectContaining({
        end_behavior: 'release',
      })
    );
  });

  it('verifies webhook signatures through the async verifier', async () => {
    constructEventAsync.mockResolvedValueOnce({ id: 'evt_1', type: 'customer.created' });

    await expect(verifyWebhookSignature('payload', 'signature', 'whsec_test')).resolves.toEqual({
      id: 'evt_1',
      type: 'customer.created',
    });
    expect(constructEventAsync).toHaveBeenCalledWith('payload', 'signature', 'whsec_test');
    expect(constructEvent).not.toHaveBeenCalled();
  });

  it('propagates the verification failure instead of falling back to the sync verifier', async () => {
    const failure = new Error('No signatures found matching the expected signature for payload');
    constructEventAsync.mockRejectedValueOnce(failure);

    await expect(verifyWebhookSignature('payload', 'signature', 'whsec_test')).rejects.toBe(
      failure
    );
    expect(constructEvent).not.toHaveBeenCalled();
  });
});
