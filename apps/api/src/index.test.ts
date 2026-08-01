import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import { createTestEnv } from "./test-utils/index";

const mocks = vi.hoisted(() => ({
  getSubscriptionPlanByStripePriceId: vi.fn(),
  getSubscriptionByStripeId: vi.fn(),
  upsertSubscription: vi.fn(),
  updateSubscription: vi.fn(),
  verifyWebhookSignature: vi.fn(),
  retrieveSubscription: vi.fn(),
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
  rateLimitCheck: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
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
  upsertSubscription: mocks.upsertSubscription,
  updateSubscription: mocks.updateSubscription,
  getStripeCustomerId: vi.fn(),
}));

vi.mock("@recetario/stripe/server", () => ({
  createCustomer: vi.fn(),
  createCheckoutSession: vi.fn(),
  createPortalSession: vi.fn(),
  retrieveSubscription: mocks.retrieveSubscription,
  verifyWebhookSignature: mocks.verifyWebhookSignature,
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
    mocks.getSubscriptionPlanByStripePriceId.mockResolvedValueOnce({ id: "pro_monthly" });
    mocks.getSubscriptionByStripeId.mockResolvedValueOnce({ userId: "user-1" });

    const response = await app.request(
      "/api/stripe/webhook",
      { method: "POST", headers: { "stripe-signature": "sig" }, body: "{}" },
      createTestEnv() as unknown as Record<string, unknown>,
    );

    expect(response.status).toBe(200);
    expect(mocks.getSubscriptionPlanByStripePriceId).toHaveBeenCalledWith("price_pro_monthly");
    expect(mocks.upsertSubscription).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({ planId: "pro_monthly", userId: "user-1", status: "active" }),
    );
  });
});
