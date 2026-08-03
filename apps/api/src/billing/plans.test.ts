import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";
import { plansListResponseSchema } from "@recetario/types";

const { mockGetPricingPlans } = vi.hoisted(() => ({ mockGetPricingPlans: vi.fn() }));

vi.mock("@recetario/stripe/server", () => ({
  getPricingPlans: mockGetPricingPlans,
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
    id: "free",
    tier: "free",
    name: "Free",
    description: "Para empezar a costear",
    badge: null,
    currency: "MXN",
    monthlyPriceId: null,
    monthlyDisplay: null,
    yearlyPriceId: null,
    yearlyDisplay: null,
    yearlyPerMonthDisplay: null,
    features: [],
  },
  {
    id: "basic",
    tier: "basic",
    name: "Basic",
    description: "Para negocios en crecimiento",
    badge: { text: "Recomendado", class: "bg-success-bg text-success" },
    currency: "MXN",
    monthlyPriceId: "price_basic_monthly",
    monthlyDisplay: "$9.99",
    yearlyPriceId: null,
    yearlyDisplay: null,
    yearlyPerMonthDisplay: null,
    features: [{ text: "Hasta 75 recetas", included: true }],
  },
  {
    id: "pro",
    tier: "pro",
    name: "Pro",
    description: "Para profesionales",
    badge: { text: "Mas popular", class: "bg-accent-600 text-white" },
    currency: "MXN",
    monthlyPriceId: "price_pro_monthly",
    monthlyDisplay: "$19.99",
    yearlyPriceId: null,
    yearlyDisplay: null,
    yearlyPerMonthDisplay: null,
    features: [{ text: "Recetas ilimitadas", included: true }],
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
    mockGetPricingPlans.mockReset();
    cacheStore.clear();
  });

  it("returns the enriched pricing plan response", async () => {
    mockGetPricingPlans.mockResolvedValueOnce(planFixture);
    const res = await buildApp().request("/api/billing/plans", {}, {});
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(planFixture);
    expect(plansListResponseSchema.safeParse(body).success).toBe(true);
    expect(mockGetPricingPlans).toHaveBeenCalledTimes(1);
  });

  it("returns an empty array when the pricing source is empty", async () => {
    mockGetPricingPlans.mockResolvedValueOnce([]);
    const res = await buildApp().request("/api/billing/plans", {}, {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it("serves cached plans on the second call", async () => {
    mockGetPricingPlans.mockResolvedValueOnce(planFixture);
    const app = buildApp();
    await app.request("/api/billing/plans", {}, {});
    await app.request("/api/billing/plans", {}, {});
    expect(mockGetPricingPlans).toHaveBeenCalledTimes(1);
  });

  it("rejects requests with the wrong Host header", async () => {
    const res = await buildApp().request("http://api.local/api/billing/plans", { headers: { Host: "evil.com" } }, { INTERNAL_API_HOST: "api.recetario.app" });
    expect(res.status).toBe(403);
  });

  it("does not require authentication", async () => {
    mockGetPricingPlans.mockResolvedValueOnce(planFixture);
    expect((await buildApp().request("/api/billing/plans", {}, {})).status).toBe(200);
  });
});
