import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";
import type { AuthVariables } from "../middleware/auth";

const {
  mockValidateCsrf,
  mockGetSubscriptionPlanByStripePriceId,
  mockGetStripeCustomerId,
  mockGetSubscriptionByUserId,
  mockUpsertSubscription,
  mockCreateCustomer,
  mockCreateCheckoutSession,
  mockUpdateStripeSubscription,
} = vi.hoisted(() => ({
  mockValidateCsrf: vi.fn(),
  mockGetSubscriptionPlanByStripePriceId: vi.fn(),
  mockGetStripeCustomerId: vi.fn(),
  mockGetSubscriptionByUserId: vi.fn(),
  mockUpsertSubscription: vi.fn(),
  mockCreateCustomer: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
  mockUpdateStripeSubscription: vi.fn(),
}));

vi.mock("@recetario/auth/server", () => ({
  validateCsrf: mockValidateCsrf,
}));

vi.mock("@recetario/db", () => ({
  getSubscriptionPlanByStripePriceId: mockGetSubscriptionPlanByStripePriceId,
  getStripeCustomerId: mockGetStripeCustomerId,
  getSubscriptionByUserId: mockGetSubscriptionByUserId,
  upsertSubscription: mockUpsertSubscription,
}));

vi.mock("@recetario/stripe/server", async () => {
  const actual = await vi.importActual("@recetario/stripe/server");
  return {
    ...actual,
    createCustomer: mockCreateCustomer,
    createCheckoutSession: mockCreateCheckoutSession,
    updateStripeSubscription: mockUpdateStripeSubscription,
  };
});

const { stripeCheckoutHandler } = await import("./checkout");

const mockUser = {
  id: "user_123",
  email: "test@recetario.io",
  name: "Test User",
};

function buildApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.use("*", hostAllowlist());
  app.use("*", async (c, next) => {
    c.set("user", mockUser as any);
    c.set("session", { id: "sess_1" } as any);
    await next();
  });
  app.post("/api/stripe/checkout", stripeCheckoutHandler());
  return app;
}

describe("stripeCheckoutHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockValidateCsrf.mockReturnValue(true);
    mockGetSubscriptionByUserId.mockResolvedValue(null);
  });

  it("returns 403 when CSRF validation fails", async () => {
    mockValidateCsrf.mockReturnValue(false);
    const res = await buildApp().request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: "price_pro_monthly" }),
      },
      {},
    );
    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.error).toBe("CSRF validation failed");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const res = await buildApp().request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid-json",
      },
      {},
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Invalid request body");
  });

  it("returns 400 when priceId is missing", async () => {
    const res = await buildApp().request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      {},
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Missing priceId");
  });

  it("returns 400 when plan is not found for priceId", async () => {
    mockGetSubscriptionPlanByStripePriceId.mockResolvedValueOnce(null);

    const res = await buildApp().request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: "price_invalid" }),
      },
      {},
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe("Invalid price ID");
  });

  it("updates existing subscription in-place when user already has an active subscription", async () => {
    mockGetSubscriptionPlanByStripePriceId.mockResolvedValueOnce({
      id: "pro_monthly",
      tier: "pro",
      billingInterval: "monthly",
      stripePriceId: "price_pro_monthly",
    });

    mockGetSubscriptionByUserId.mockResolvedValueOnce({
      stripeSubscriptionId: "sub_existing123",
      stripeCustomerId: "cus_existing123",
      status: "active",
      planId: "basic_monthly",
      plan: { tier: "basic", billingInterval: "monthly" },
    });

    mockUpdateStripeSubscription.mockResolvedValueOnce({
      id: "sub_existing123",
      status: "active",
      current_period_start: 1700000000,
      current_period_end: 1702500000,
      cancel_at_period_end: false,
      trial_end: null,
    });

    const res = await buildApp().request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: "price_pro_monthly" }),
      },
      {},
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "http://localhost/settings?tab=billing&success=1",
    });

    expect(mockUpdateStripeSubscription).toHaveBeenCalledWith({
      subscriptionId: "sub_existing123",
      priceId: "price_pro_monthly",
      isUpgrade: true,
      isTrialing: false,
    });

    expect(mockUpsertSubscription).toHaveBeenCalledWith(
      "sub_existing123",
      expect.objectContaining({
        planId: "pro_monthly",
        status: "active",
      }),
    );
  });

  it("creates new Stripe customer and checkout session with trial for first time subscriber", async () => {
    mockGetSubscriptionPlanByStripePriceId.mockResolvedValueOnce({
      id: "basic_monthly",
      tier: "basic",
      billingInterval: "monthly",
    });
    mockGetSubscriptionByUserId.mockResolvedValue(null);
    mockGetStripeCustomerId.mockResolvedValueOnce(null);
    mockCreateCustomer.mockResolvedValueOnce({ id: "cus_new123" });
    mockCreateCheckoutSession.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/pay/cs_test123",
    });

    const res = await buildApp().request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: "price_basic_monthly" }),
      },
      {},
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://checkout.stripe.com/pay/cs_test123",
    });
    expect(mockCreateCustomer).toHaveBeenCalledWith({
      email: "test@recetario.io",
      userId: "user_123",
    });
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_new123",
        priceId: "price_basic_monthly",
        userId: "user_123",
        planId: "basic_monthly",
        trialPeriodDays: 14,
      }),
    );
  });

  it("creates checkout session without trial for returning customer with prior canceled subscription", async () => {
    mockGetSubscriptionPlanByStripePriceId.mockResolvedValueOnce({
      id: "pro_monthly",
      tier: "pro",
      billingInterval: "monthly",
    });

    // 1st call for active/trialing returns null
    // 2nd call for priorSub returns canceled sub
    mockGetSubscriptionByUserId
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        stripeSubscriptionId: "sub_old999",
        status: "canceled",
      });

    mockGetStripeCustomerId.mockResolvedValueOnce("cus_existing456");
    mockCreateCheckoutSession.mockResolvedValueOnce({
      url: "https://checkout.stripe.com/pay/cs_test456",
    });

    const res = await buildApp().request(
      "/api/stripe/checkout",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId: "price_pro_monthly" }),
      },
      {},
    );

    expect(res.status).toBe(200);
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_existing456",
        trialPeriodDays: undefined,
      }),
    );
  });
});
