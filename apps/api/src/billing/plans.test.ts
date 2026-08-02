import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";
import { plansListResponseSchema } from "@recetario/types";

const { mockGetSubscriptionPlans, mockSeedSubscriptionPlans } = vi.hoisted(() => {
  const mockGetSubscriptionPlans = vi.fn();
  const mockSeedSubscriptionPlans = vi.fn();
  return { mockGetSubscriptionPlans, mockSeedSubscriptionPlans };
});

vi.mock("@recetario/db", () => ({
  getSubscriptionPlans: (activeOnly: boolean) => mockGetSubscriptionPlans(activeOnly),
  seedSubscriptionPlans: () => mockSeedSubscriptionPlans(),
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

const { plansHandler } = await import("./plans");

const planFixture = [
  {
    id: "basic_monthly",
    stripePriceId: "price_basic_monthly",
    name: "Basic",
    tier: "basic",
    billingInterval: "monthly",
    priceCents: 999,
    currency: "mxn",
    recipesLimit: 75,
    ingredientsLimit: null,
    featuresJson: JSON.stringify({ recipe_duplicate: true }),
    active: true,
  },
  {
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
];

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.use("*", hostAllowlist());
  app.get("/api/billing/plans", plansHandler());
  return app;
}

describe("plansHandler", () => {
  beforeEach(() => {
    mockGetSubscriptionPlans.mockReset();
    mockSeedSubscriptionPlans.mockReset();
    cacheStore.clear();
  });

  it("returns 200 and the list of active plans ordered by price", async () => {
    mockGetSubscriptionPlans.mockResolvedValueOnce(planFixture);

    const res = await buildApp().request("/api/billing/plans", {}, {});

    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: string; priceCents: number; features: Record<string, boolean> }>;
    expect(body).toHaveLength(2);
    expect(body[0]?.id).toBe("basic_monthly");
    expect(body[1]?.id).toBe("pro_monthly");
    expect(body[1]?.priceCents).toBe(1999);
    expect(body[0]?.features).toEqual({ recipe_duplicate: true });
    expect(body[1]?.features).toEqual({ recipe_duplicate: true, pdf_export: true });
    expect((body[0] as Record<string, unknown>).featuresJson).toBeUndefined();

    expect(mockGetSubscriptionPlans).toHaveBeenCalledTimes(1);
    expect(mockGetSubscriptionPlans).toHaveBeenCalledWith(true);
  });

  it("returns an empty array when there are no active plans", async () => {
    mockGetSubscriptionPlans.mockResolvedValueOnce([]);

    const res = await buildApp().request("/api/billing/plans", {}, {});

    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toEqual([]);
  });

  it("serves the cached plans on the second call without re-querying the DB", async () => {
    mockGetSubscriptionPlans.mockResolvedValueOnce(planFixture);

    const app = buildApp();
    const first = await app.request("/api/billing/plans", {}, {});
    expect(first.status).toBe(200);
    expect(mockGetSubscriptionPlans).toHaveBeenCalledTimes(1);

    const second = await app.request("/api/billing/plans", {}, {});
    expect(second.status).toBe(200);
    expect(mockGetSubscriptionPlans).toHaveBeenCalledTimes(1);
  });

  it("rejects requests with the wrong Host header via host allowlist", async () => {
    const res = await buildApp().request(
      "http://api.local/api/billing/plans",
      { headers: { Host: "evil.com" } },
      { INTERNAL_API_HOST: "api.recetario.app" },
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("does not require authentication (public pricing data)", async () => {
    mockGetSubscriptionPlans.mockResolvedValueOnce(planFixture);

    const res = await buildApp().request("/api/billing/plans", {}, {});
    expect(res.status).toBe(200);
  });

  it("response body conforms to the consumer contract (z.array(planSchema))", async () => {
    mockGetSubscriptionPlans.mockResolvedValueOnce(planFixture);

    const res = await buildApp().request("/api/billing/plans", {}, {});
    expect(res.status).toBe(200);

    const body = await res.json();
    const parsed = plansListResponseSchema.safeParse(body);
    expect(parsed.success).toBe(true);
  });
});
