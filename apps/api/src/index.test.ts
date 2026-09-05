import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createTestEnv } from "./test-utils/index";

const mocks = vi.hoisted(() => ({
  getSubscriptionPlanByStripePriceId: vi.fn(),
  getSubscriptionByStripeId: vi.fn(),
  getSubscriptionByUserId: vi.fn(),
  upsertSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  retrieveSubscription: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  processStripeEvent: vi.fn(),
  createTrustedCheckoutSession: vi.fn(),
}));

vi.mock("@recetario/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
      requestPasswordReset: vi.fn(),
      changeEmail: vi.fn(),
      changePassword: vi.fn(),
    },
    handler: vi.fn(),
  },
  validateCsrf: vi.fn().mockReturnValue(true),
  validatePassword: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  validatePasswordResetToken: vi.fn().mockResolvedValue({ valid: false }),
  markTokenAsUsed: vi.fn(),
  getRemainingSeconds: vi.fn().mockResolvedValue(0),
  formatTime: vi.fn().mockReturnValue("0 min"),
  hashPassword: vi.fn(),
}));

vi.mock("@recetario/db", () => ({
  logAuditEvent: vi.fn(),
  updateAccountPassword: vi.fn(),
  updateUserName: vi.fn(),
  getSubscriptionPlanByStripePriceId: mocks.getSubscriptionPlanByStripePriceId,
  getSubscriptionByStripeId: mocks.getSubscriptionByStripeId,
  getSubscriptionByUserId: mocks.getSubscriptionByUserId,
  upsertSubscription: mocks.upsertSubscription,
  updateSubscription: mocks.updateSubscription,
  getStripeCustomerId: vi.fn(),
  getCheckoutIntentBySession: vi.fn(),
  getCheckoutIntentBySubscription: vi.fn(),
  getSubscriptionByStripeIdForIngestion: vi.fn(),
  createCheckoutIntent: vi.fn(),
  consumeCheckoutIntent: vi.fn(),
  getLatestEventAttempt: vi.fn(),
  getLatestTerminalAttemptForSubscription: vi.fn(),
  recordFailedEventAttempt: vi.fn(),
  applySubscriptionMutation: vi.fn(),
  upsertSubscriptionAndConsumeIntent: vi.fn(),
}));

vi.mock("@recetario/stripe/server", () => ({
  createCustomer: vi.fn(),
  createCheckoutSession: mocks.createCheckoutSession,
  createPortalSession: mocks.createPortalSession,
  retrieveSubscription: mocks.retrieveSubscription,
  verifyWebhookSignature: mocks.verifyWebhookSignature,
  subscriptionIngestion: {
    processStripeEvent: mocks.processStripeEvent,
    createTrustedCheckoutSession: mocks.createTrustedCheckoutSession,
    ingestSubscriptionSnapshot: vi.fn().mockResolvedValue({ ok: true }),
  },
}));

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
  process.env.BETTER_AUTH_SECRET = "test-secret";
  process.env.BETTER_AUTH_URL = "http://localhost:4321";
  process.env.GOOGLE_CLIENT_ID = "test-google-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
  process.env.PUBLIC_APP_URL = "http://localhost:4321";
  process.env.RECIPES_STATIC_OWNER_EMAIL = "owner@test.local";
  process.env.RECIPES_STATIC_OWNER_ID = "owner-test-id";
  process.env.RESEND_API_KEY = "test-resend";
  process.env.SENDER_EMAIL = "test@test.local";
  process.env.STRIPE_SECRET_KEY = "sk_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("health endpoint", () => {
  beforeEach(() => {
    for (const mock of Object.values(mocks)) mock.mockReset();
  });

  it("returns 200 and ok body", async () => {
    const { default: app } = await import("./index");
    const res = await app.request(
      "/health",
      {},
      createTestEnv() as unknown as Record<string, unknown>,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("recetario-api");
  });

  it("resolves subscription updates from the Stripe price ID", async () => {
    const { default: app } = await import("./index");
    mocks.verifyWebhookSignature.mockReturnValue({
      id: "evt_1",
      created: 1700000000,
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          current_period_start: 1735689600,
          current_period_end: 1767225600,
          cancel_at_period_end: false,
          trial_end: null,
          items: { data: [{ price: { id: "price_pro_monthly" } }] },
        },
      },
    });
    mocks.processStripeEvent.mockResolvedValueOnce({
      ok: true,
      outcome: "applied",
    });

    const response = await app.request(
      "/api/stripe/webhook",
      { method: "POST", headers: { "stripe-signature": "sig" }, body: "{}" },
      createTestEnv() as unknown as Record<string, unknown>,
    );

    expect(response.status).toBe(200);
    expect(mocks.processStripeEvent).toHaveBeenCalledWith({
      event: expect.objectContaining({ id: "evt_1", type: "customer.subscription.updated" }),
    });
  });

  it("uses web app origin for checkout success and cancel redirect URLs", async () => {
    const { default: app } = await import("./index");
    const { auth } = await import("@recetario/auth/server");
    (auth.api.getSession as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      user: { id: "user-1", email: "user@test.local" },
      session: { id: "sess-1", userId: "user-1" },
    });
    const { getStripeCustomerId } = await import("@recetario/db");
    (getStripeCustomerId as unknown as ReturnType<typeof vi.fn>).mockResolvedValueOnce("cus_123");
    mocks.getSubscriptionPlanByStripePriceId.mockResolvedValueOnce({ id: "plan_123" });
    mocks.createTrustedCheckoutSession.mockResolvedValueOnce({
      ok: true,
      url: "https://checkout.stripe.com/test",
    });

    const response = await app.request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: "http://localhost:4321" },
        body: JSON.stringify({
          priceId: "price_123",
          successUrl: "http://localhost:4321/settings?tab=billing&success=1",
          cancelUrl: "http://localhost:4321/pricing?canceled=1",
        }),
      },
      createTestEnv() as unknown as Record<string, unknown>,
    );

    expect(response.status).toBe(200);
    expect(mocks.createTrustedCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        successUrl: "http://localhost:4321/settings?tab=billing&success=1&session_id={CHECKOUT_SESSION_ID}",
        cancelUrl: "http://localhost:4321/pricing?canceled=1",
      }),
    );
  });
});
