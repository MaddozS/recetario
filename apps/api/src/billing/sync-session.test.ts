import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";
import type { AuthVariables } from "../middleware/auth";

const {
  mockGetCheckoutIntentBySession,
  mockRetrieveCheckoutSession,
  mockRetrieveSubscription,
  mockIngestSubscriptionSnapshot,
} = vi.hoisted(() => ({
  mockGetCheckoutIntentBySession: vi.fn(),
  mockRetrieveCheckoutSession: vi.fn(),
  mockRetrieveSubscription: vi.fn(),
  mockIngestSubscriptionSnapshot: vi.fn(),
}));

vi.mock("@recetario/db", () => ({
  getCheckoutIntentBySession: mockGetCheckoutIntentBySession,
  getCheckoutIntentBySubscription: vi.fn(),
  getSubscriptionPlanByStripePriceId: vi.fn(),
  getSubscriptionByStripeIdForIngestion: vi.fn(),
  getSubscriptionByUserId: vi.fn(),
  createCheckoutIntent: vi.fn(),
  consumeCheckoutIntent: vi.fn(),
  getLatestEventAttempt: vi.fn(),
  getLatestTerminalAttemptForSubscription: vi.fn(),
  recordFailedEventAttempt: vi.fn(),
  applySubscriptionMutation: vi.fn(),
  upsertSubscriptionAndConsumeIntent: vi.fn(),
  upsertSubscription: vi.fn(),
}));

vi.mock("@recetario/stripe/server", async () => {
  const actual = await vi.importActual("@recetario/stripe/server");
  return {
    ...actual,
    retrieveCheckoutSession: mockRetrieveCheckoutSession,
    retrieveSubscription: mockRetrieveSubscription,
    subscriptionIngestion: {
      ingestSubscriptionSnapshot: mockIngestSubscriptionSnapshot,
      createTrustedCheckoutSession: vi.fn(),
      processStripeEvent: vi.fn(),
      snapshotFromSubscription: (sub: unknown, customerId: string) => ({
        stripeSubscriptionId: (sub as { id?: string })?.id ?? "sub_123",
        stripeCustomerId: customerId,
        status: "active",
        priceId: "price_pro_monthly",
        currentPeriodStart: 1767225600,
        currentPeriodEnd: 1769817600,
        cancelAtPeriodEnd: false,
        cancelAt: null,
        trialEnd: null,
        raw: sub,
      }),
    },
  };
});

const { syncCheckoutSessionHandler } = await import("./sync-session");

const mockUser = { id: "user_123", email: "test@recetario.io" };

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
  app.post("/api/stripe/sync-session", syncCheckoutSessionHandler());
  return app;
}

const pendingIntent = {
  id: "intent-1",
  userId: "user_123",
  checkoutSessionId: "cs_123",
  stripeCustomerId: "cus_123",
  priceId: "price_pro_monthly",
  state: "pending",
  stripeSubscriptionId: null,
  createdAt: new Date(Date.now() - 60 * 60 * 1000),
  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  consumedAt: null,
};

const liveSub = {
  id: "sub_123",
  status: "active",
  items: { data: [{ price: { id: "price_pro_monthly" } }] },
  current_period_start: 1767225600,
  current_period_end: 1769817600,
  cancel_at_period_end: false,
  cancel_at: null,
  trial_end: null,
};

describe("syncCheckoutSessionHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockRetrieveCheckoutSession.mockResolvedValue({
      id: "cs_123",
      customer: "cus_123",
      subscription: "sub_123",
      metadata: { userId: "user_123", planId: "pro_monthly" },
    });
    mockRetrieveSubscription.mockResolvedValue(liveSub);
    mockIngestSubscriptionSnapshot.mockResolvedValue({ ok: true });
  });

  it("returns 400 when sessionId is missing", async () => {
    const res = await buildApp().request(
      "/api/stripe/sync-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      },
      {},
    );
    expect(res.status).toBe(400);
    const data = (await res.json()) as { error: { code: string } };
    expect(data.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns ok:false when the session has no subscription yet", async () => {
    mockRetrieveCheckoutSession.mockResolvedValue({
      id: "cs_123",
      customer: "cus_123",
    });
    const res = await buildApp().request(
      "/api/stripe/sync-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_123" }),
      },
      {},
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: false });
    expect(mockIngestSubscriptionSnapshot).not.toHaveBeenCalled();
  });

  it("rejects (hard cutover) when no Checkout intent exists for the session", async () => {
    mockGetCheckoutIntentBySession.mockResolvedValue(null);
    const res = await buildApp().request(
      "/api/stripe/sync-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_123" }),
      },
      {},
    );
    expect(res.status).toBe(409);
    expect(mockIngestSubscriptionSnapshot).not.toHaveBeenCalled();
  });

  it("rejects when the intent belongs to a different user", async () => {
    mockGetCheckoutIntentBySession.mockResolvedValue({
      ...pendingIntent,
      userId: "user_evil",
    });
    const res = await buildApp().request(
      "/api/stripe/sync-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_123" }),
      },
      {},
    );
    expect(res.status).toBe(409);
  });

  it("rejects an expired intent", async () => {
    mockGetCheckoutIntentBySession.mockResolvedValue({
      ...pendingIntent,
      expiresAt: new Date("2025-12-31T00:00:00Z"),
    });
    const res = await buildApp().request(
      "/api/stripe/sync-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_123" }),
      },
      {},
    );
    expect(res.status).toBe(409);
  });

  it("ingests the canonical snapshot through the Checkout intent authority", async () => {
    mockGetCheckoutIntentBySession.mockResolvedValue(pendingIntent);
    const res = await buildApp().request(
      "/api/stripe/sync-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_123" }),
      },
      {},
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockIngestSubscriptionSnapshot).toHaveBeenCalledWith({
      snapshot: expect.objectContaining({
        stripeSubscriptionId: "sub_123",
        status: "active",
      }),
      metadata: { userId: "user_123", planId: "pro_monthly" },
      context: { authority: "checkout-intent", intent: pendingIntent },
    });
  });

  it("returns 500 when ingestion fails", async () => {
    mockGetCheckoutIntentBySession.mockResolvedValue(pendingIntent);
    mockIngestSubscriptionSnapshot.mockResolvedValue({
      ok: false,
      error: "Unrecognized Stripe Price",
    });
    const res = await buildApp().request(
      "/api/stripe/sync-session",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: "cs_123" }),
      },
      {},
    );
    expect(res.status).toBe(500);
  });
});
