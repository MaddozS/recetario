import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";

const {
  mockVerifyWebhookSignature,
  mockRetrieveSubscription,
  mockGetSubscriptionPlanByStripePriceId,
  mockGetSubscriptionByStripeId,
  mockUpsertSubscription,
  mockUpdateSubscription,
} = vi.hoisted(() => ({
  mockVerifyWebhookSignature: vi.fn(),
  mockRetrieveSubscription: vi.fn(),
  mockGetSubscriptionPlanByStripePriceId: vi.fn(),
  mockGetSubscriptionByStripeId: vi.fn(),
  mockUpsertSubscription: vi.fn(),
  mockUpdateSubscription: vi.fn(),
}));

vi.mock("@recetario/stripe/server", () => ({
  verifyWebhookSignature: mockVerifyWebhookSignature,
  retrieveSubscription: mockRetrieveSubscription,
}));

vi.mock("@recetario/db", () => ({
  getSubscriptionPlanByStripePriceId: mockGetSubscriptionPlanByStripePriceId,
  getSubscriptionByStripeId: mockGetSubscriptionByStripeId,
  upsertSubscription: mockUpsertSubscription,
  updateSubscription: mockUpdateSubscription,
}));

const { stripeWebhookHandler } = await import("./webhook");

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.use("*", hostAllowlist());
  app.post("/api/stripe/webhook", stripeWebhookHandler());
  return app;
}

describe("stripeWebhookHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("returns 400 if stripe-signature header is missing", async () => {
    const res = await buildApp().request(
      "/api/stripe/webhook",
      {
        method: "POST",
        body: JSON.stringify({ id: "evt_1" }),
      },
      {},
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 if signature verification throws an error", async () => {
    mockVerifyWebhookSignature.mockRejectedValueOnce(
      new Error("Bad signature"),
    );

    const res = await buildApp().request(
      "/api/stripe/webhook",
      {
        method: "POST",
        headers: { "stripe-signature": "sig_invalid" },
        body: JSON.stringify({ id: "evt_1" }),
      },
      {},
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("handles checkout.session.completed event and upserts subscription", async () => {
    const eventObj = {
      type: "checkout.session.completed",
      data: {
        object: {
          subscription: "sub_123",
          customer: "cus_123",
          metadata: { userId: "usr_1", planId: "plan_pro" },
        },
      },
    };
    mockVerifyWebhookSignature.mockResolvedValueOnce(eventObj);
    mockRetrieveSubscription.mockResolvedValueOnce({
      status: "active",
      items: { data: [{ price: { id: "price_pro_m" } }] },
      current_period_start: 1600000000,
      current_period_end: 1602500000,
      cancel_at_period_end: false,
    });

    const res = await buildApp().request(
      "/api/stripe/webhook",
      {
        method: "POST",
        headers: { "stripe-signature": "sig_valid" },
        body: JSON.stringify(eventObj),
      },
      {},
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        id: "sub_123",
        userId: "usr_1",
        stripeCustomerId: "cus_123",
        planId: "plan_pro",
        status: "active",
      }),
    );
  });

  it("handles customer.subscription.updated event", async () => {
    const eventObj = {
      type: "customer.subscription.updated",
      data: {
        object: {
          id: "sub_123",
          customer: "cus_123",
          status: "active",
          items: { data: [{ price: { id: "price_pro_m" } }] },
          current_period_start: 1600000000,
          current_period_end: 1602500000,
          cancel_at_period_end: false,
        },
      },
    };
    mockVerifyWebhookSignature.mockResolvedValueOnce(eventObj);
    mockGetSubscriptionPlanByStripePriceId.mockResolvedValueOnce({
      id: "plan_pro",
    });
    mockGetSubscriptionByStripeId.mockResolvedValueOnce({
      userId: "usr_existing",
    });

    const res = await buildApp().request(
      "/api/stripe/webhook",
      {
        method: "POST",
        headers: { "stripe-signature": "sig_valid" },
        body: JSON.stringify(eventObj),
      },
      {},
    );

    expect(res.status).toBe(200);
    expect(await res.text()).toBe("OK");
    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      "sub_123",
      expect.objectContaining({
        id: "sub_123",
        userId: "usr_existing",
        planId: "plan_pro",
      }),
    );
  });

  it("handles customer.subscription.deleted event", async () => {
    const eventObj = {
      type: "customer.subscription.deleted",
      data: {
        object: {
          id: "sub_123",
        },
      },
    };
    mockVerifyWebhookSignature.mockResolvedValueOnce(eventObj);
    mockGetSubscriptionByStripeId.mockResolvedValueOnce({ id: "sub_123" });

    const res = await buildApp().request(
      "/api/stripe/webhook",
      {
        method: "POST",
        headers: { "stripe-signature": "sig_valid" },
        body: JSON.stringify(eventObj),
      },
      {},
    );

    expect(res.status).toBe(200);
    expect(mockUpdateSubscription).toHaveBeenCalledWith("sub_123", {
      status: "canceled",
      cancelAtPeriodEnd: true,
    });
  });

  it("handles invoice.payment_failed event", async () => {
    const eventObj = {
      type: "invoice.payment_failed",
      data: {
        object: {
          subscription: "sub_failed_1",
        },
      },
    };
    mockVerifyWebhookSignature.mockResolvedValueOnce(eventObj);
    mockGetSubscriptionByStripeId.mockResolvedValueOnce({
      id: "sub_failed_1",
    });

    const res = await buildApp().request(
      "/api/stripe/webhook",
      {
        method: "POST",
        headers: { "stripe-signature": "sig_valid" },
        body: JSON.stringify(eventObj),
      },
      {},
    );

    expect(res.status).toBe(200);
    expect(mockUpdateSubscription).toHaveBeenCalledWith("sub_failed_1", {
      status: "past_due",
    });
  });
});
