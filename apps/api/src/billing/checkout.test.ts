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
  mockCreateCustomer,
  mockCreateCheckoutSession,
} = vi.hoisted(() => ({
  mockValidateCsrf: vi.fn(),
  mockGetSubscriptionPlanByStripePriceId: vi.fn(),
  mockGetStripeCustomerId: vi.fn(),
  mockCreateCustomer: vi.fn(),
  mockCreateCheckoutSession: vi.fn(),
}));

vi.mock("@recetario/auth/server", () => ({
  validateCsrf: mockValidateCsrf,
}));

vi.mock("@recetario/db", () => ({
  getSubscriptionPlanByStripePriceId: mockGetSubscriptionPlanByStripePriceId,
  getStripeCustomerId: mockGetStripeCustomerId,
}));

vi.mock("@recetario/stripe/server", () => ({
  createCustomer: mockCreateCustomer,
  createCheckoutSession: mockCreateCheckoutSession,
}));

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

  it("creates new Stripe customer if customerId does not exist in DB", async () => {
    mockGetSubscriptionPlanByStripePriceId.mockResolvedValueOnce({
      id: "plan_pro",
    });
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
        body: JSON.stringify({ priceId: "price_pro_monthly" }),
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
        priceId: "price_pro_monthly",
        userId: "user_123",
        planId: "plan_pro",
      }),
    );
  });

  it("reuses existing customerId from DB if present", async () => {
    mockGetSubscriptionPlanByStripePriceId.mockResolvedValueOnce({
      id: "plan_pro",
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
    expect(mockCreateCustomer).not.toHaveBeenCalled();
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith(
      expect.objectContaining({
        customerId: "cus_existing456",
      }),
    );
  });
});
