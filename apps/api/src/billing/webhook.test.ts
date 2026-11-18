import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { envelope } from '../envelope';
import { errorHandler } from '../error-handler';
import { hostAllowlist } from '../host-allowlist';

const { mockVerifyWebhookSignature, mockProcessStripeEvent } = vi.hoisted(() => ({
  mockVerifyWebhookSignature: vi.fn(),
  mockProcessStripeEvent: vi.fn(),
}));

vi.mock('@recetario/stripe/server', () => ({
  verifyWebhookSignature: mockVerifyWebhookSignature,
  subscriptionIngestion: {
    processStripeEvent: mockProcessStripeEvent,
  },
}));

const { stripeWebhookHandler } = await import('./webhook');

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use('*', envelope());
  app.use('*', hostAllowlist());
  app.post('/api/stripe/webhook', stripeWebhookHandler());
  return app;
}

describe('stripeWebhookHandler', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns 400 if stripe-signature header is missing', async () => {
    const res = await buildApp().request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        body: JSON.stringify({ id: 'evt_1' }),
      },
      {}
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 400 if signature verification throws an error', async () => {
    mockVerifyWebhookSignature.mockRejectedValueOnce(new Error('Bad signature'));

    const res = await buildApp().request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_invalid' },
        body: JSON.stringify({ id: 'evt_1' }),
      },
      {}
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('delegates verified events to the ingestion module and returns 200 on applied', async () => {
    const eventObj = {
      id: 'evt_1',
      type: 'checkout.session.completed',
      created: 1700000000,
      data: {
        object: {
          id: 'cs_123',
          subscription: 'sub_123',
          customer: 'cus_123',
        },
      },
    };
    mockVerifyWebhookSignature.mockResolvedValueOnce(eventObj);
    mockProcessStripeEvent.mockResolvedValueOnce({
      ok: true,
      outcome: 'applied',
    });

    const res = await buildApp().request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_valid' },
        body: JSON.stringify(eventObj),
      },
      {}
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
    expect(mockProcessStripeEvent).toHaveBeenCalledWith({
      event: expect.objectContaining({ id: 'evt_1', type: 'checkout.session.completed' }),
    });
  });

  it('returns 200 for ignored (duplicate/stale/unsupported) outcomes', async () => {
    const eventObj = {
      id: 'evt_2',
      type: 'charge.succeeded',
      created: 1700000000,
      data: { object: { id: 'ch_1' } },
    };
    mockVerifyWebhookSignature.mockResolvedValueOnce(eventObj);
    mockProcessStripeEvent.mockResolvedValueOnce({
      ok: true,
      outcome: 'ignored',
    });

    const res = await buildApp().request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_valid' },
        body: JSON.stringify(eventObj),
      },
      {}
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe('OK');
  });

  it('returns 500 (non-2xx) when ingestion reports a retryable failure', async () => {
    const eventObj = {
      id: 'evt_3',
      type: 'checkout.session.completed',
      created: 1700000000,
      data: {
        object: {
          id: 'cs_123',
          subscription: 'sub_123',
          customer: 'cus_123',
        },
      },
    };
    mockVerifyWebhookSignature.mockResolvedValueOnce(eventObj);
    mockProcessStripeEvent.mockResolvedValueOnce({
      ok: false,
      error: 'No Checkout intent for session',
    });

    const res = await buildApp().request(
      '/api/stripe/webhook',
      {
        method: 'POST',
        headers: { 'stripe-signature': 'sig_valid' },
        body: JSON.stringify(eventObj),
      },
      {}
    );

    expect(res.status).toBe(500);
    const body = (await res.json()) as any;
    expect(body.error.code).toBe('INTERNAL');
  });
});
