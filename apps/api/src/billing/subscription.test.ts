import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";

const { mockGetSession, mockAuth, mockGetSubscriptionByUserId, mockSeedSubscriptionPlans } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetSubscriptionByUserId = vi.fn();
  const mockSeedSubscriptionPlans = vi.fn();
  return { mockGetSession, mockAuth, mockGetSubscriptionByUserId, mockSeedSubscriptionPlans };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getSubscriptionByUserId: (userId: string, statuses: string[]) =>
    mockGetSubscriptionByUserId(userId, statuses),
  seedSubscriptionPlans: () => mockSeedSubscriptionPlans(),
}));

vi.mock("@recetario/billing", () => ({
  resolveSubscription: (sub: unknown) => {
    if (!sub) {
      return {
        tier: "free",
        status: null,
        recipesLimit: 10,
        ingredientsLimit: 30,
        features: {},
        priceCents: null,
        currency: null,
        billingInterval: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        isTrial: false,
        trialEnd: null,
      };
    }
    const s = sub as {
      tier: string;
      status: string;
      recipesLimit: number | null;
      ingredientsLimit: number | null;
      features: Record<string, boolean>;
      priceCents: number | null;
      currency: string | null;
      billingInterval: string | null;
      currentPeriodEnd: Date | null;
      cancelAtPeriodEnd: boolean;
      trialEnd: Date | null;
    };
    return {
      tier: s.tier,
      status: s.status,
      recipesLimit: s.recipesLimit,
      ingredientsLimit: s.ingredientsLimit,
      features: s.features,
      priceCents: s.priceCents,
      currency: s.currency,
      billingInterval: s.billingInterval,
      currentPeriodEnd: s.currentPeriodEnd
        ? s.currentPeriodEnd.toISOString()
        : null,
      cancelAtPeriodEnd: s.cancelAtPeriodEnd,
      isTrial: s.status === "trialing",
      trialEnd: s.trialEnd ? s.trialEnd.toISOString() : null,
    };
  },
}));

const cacheStore = new Map<string, { value: unknown; expiresAt: number }>();

vi.mock("../cache", () => ({
  get: (key: string) => {
    const entry = cacheStore.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt <= Date.now()) {
      cacheStore.delete(key);
      return undefined;
    }
    return entry.value;
  },
  set: (key: string, value: unknown, ttlMs: number) => {
    cacheStore.set(key, { value, expiresAt: Date.now() + ttlMs });
  },
}));

const { subscriptionHandler } = await import("./subscription");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

const dbSubFixture = {
  id: "sub-row-1",
  userId: "user-1",
  stripeCustomerId: "cus_123",
  stripeSubscriptionId: "sub_123",
  planId: "pro_monthly",
  status: "active",
  currentPeriodStart: new Date("2025-01-01T00:00:00Z"),
  currentPeriodEnd: new Date("2030-01-01T00:00:00Z"),
  cancelAtPeriodEnd: false,
  trialEnd: null,
  createdAt: new Date("2025-01-01T00:00:00Z"),
  plan: {
    id: "pro_monthly",
    stripePriceId: "price_pro_monthly",
    name: "Pro",
    tier: "pro",
    billingInterval: "monthly",
    priceCents: 1999,
    currency: "mxn",
    recipesLimit: null,
    ingredientsLimit: null,
    featuresJson: JSON.stringify({ recipe_duplicate: true, pdf_export: true }),
    active: true,
  },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.use("*", hostAllowlist());
  app.get("/api/billing/subscription", subscriptionHandler());
  return app;
}

describe("subscriptionHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetSubscriptionByUserId.mockReset();
    cacheStore.clear();
  });

  it("returns 200 and resolved subscription when user has an active sub", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetSubscriptionByUserId.mockResolvedValueOnce(dbSubFixture);

    const res = await buildApp().request(
      "/api/billing/subscription",
      { headers: { cookie: "better-auth.session_token=valid" } },
      {},
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      tier: string;
      status: string;
      priceCents: number | null;
    };
    expect(body.tier).toBe("pro");
    expect(body.status).toBe("active");
    expect(body.priceCents).toBe(1999);

    expect(mockGetSubscriptionByUserId).toHaveBeenCalledTimes(1);
    expect(mockGetSubscriptionByUserId).toHaveBeenCalledWith("user-1", ["active", "trialing"]);
  });

  it("returns 404 NOT_FOUND when user has no active subscription", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetSubscriptionByUserId.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/billing/subscription", {}, {});

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 UNAUTHENTICATED when no session is present", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/billing/subscription", {}, {});

    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockGetSubscriptionByUserId).not.toHaveBeenCalled();
  });

  it("forwards the request cookie to auth.api.getSession", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetSubscriptionByUserId.mockResolvedValueOnce(dbSubFixture);

    await buildApp().request(
      "/api/billing/subscription",
      { headers: { cookie: "better-auth.session_token=abc123" } },
      {},
    );

    expect(mockGetSession).toHaveBeenCalledTimes(1);
    const callArg = mockGetSession.mock.calls[0]?.[0] as { headers: Headers };
    expect(callArg.headers.get("cookie")).toBe("better-auth.session_token=abc123");
  });

  it("serves the cached subscription on the second call without re-querying the DB", async () => {
    mockGetSession.mockResolvedValue(sessionFixture);
    mockGetSubscriptionByUserId.mockResolvedValue(dbSubFixture);

    const app = buildApp();
    const first = await app.request("/api/billing/subscription", {}, {});
    expect(first.status).toBe(200);
    expect(mockGetSubscriptionByUserId).toHaveBeenCalledTimes(1);

    const second = await app.request("/api/billing/subscription", {}, {});
    expect(second.status).toBe(200);
    expect(mockGetSubscriptionByUserId).toHaveBeenCalledTimes(1);

    const secondBody = (await second.json()) as { tier: string };
    expect(secondBody.tier).toBe("pro");
  });

  it("rejects requests with the wrong Host header via host allowlist", async () => {
    const res = await buildApp().request(
      "http://api.local/api/billing/subscription",
      { headers: { Host: "evil.com" } },
      { INTERNAL_API_HOST: "api.recetario.app" },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });
});
