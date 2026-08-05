import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";

const { mockGetSession, mockGetSubscriptionByUserId } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockGetSubscriptionByUserId: vi.fn(),
}));

vi.mock("@recetario/auth/server", () => ({ auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } } }));
vi.mock("@recetario/db", () => ({ getSubscriptionByUserId: (...args: unknown[]) => mockGetSubscriptionByUserId(...args) }));

const { subscriptionHandler } = await import("./subscription");
const sessionFixture = { user: { id: "user-1", email: "ada@example.com" }, session: { id: "sess-1", userId: "user-1" } };
const dbSubFixture = {
  id: "sub-row-1", userId: "user-1", stripeCustomerId: "cus_123", stripeSubscriptionId: "sub_123", planId: "pro_monthly", status: "active",
  currentPeriodStart: new Date("2025-01-01T00:00:00Z"), currentPeriodEnd: new Date("2030-01-01T00:00:00Z"), cancelAtPeriodEnd: false, trialEnd: null, createdAt: new Date("2025-01-01T00:00:00Z"),
  plan: { id: "pro_monthly", stripePriceId: "price_pro_monthly", name: "Pro", tier: "pro", billingInterval: "monthly", priceCents: 1999, currency: "mxn", recipesLimit: null, ingredientsLimit: null, featuresJson: JSON.stringify({ recipe_duplicate: true, pdf_export: true }), active: true },
};
function buildApp() { const app = new Hono(); app.onError(errorHandler()); app.use("*", envelope()); app.use("*", hostAllowlist()); app.get("/api/billing/subscription", subscriptionHandler()); return app; }

describe("subscriptionHandler", () => {
  beforeEach(() => { mockGetSession.mockReset(); mockGetSubscriptionByUserId.mockReset(); });
  it("returns the Zod-shaped subscription", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture); mockGetSubscriptionByUserId.mockResolvedValueOnce(dbSubFixture);
    const res = await buildApp().request("/api/billing/subscription", {}, {});
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ tier: "pro", status: "active", priceCents: 1999, currentPeriodEnd: "2030-01-01T00:00:00.000Z" });
    expect(mockGetSubscriptionByUserId).toHaveBeenCalledWith("user-1", ["active", "trialing"]);
  });
  it("returns 404 when no active subscription exists", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture); mockGetSubscriptionByUserId.mockResolvedValueOnce(null);
    expect((await buildApp().request("/api/billing/subscription", {}, {})).status).toBe(404);
  });
  it("returns 401 without a session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    expect((await buildApp().request("/api/billing/subscription", {}, {})).status).toBe(401);
    expect(mockGetSubscriptionByUserId).not.toHaveBeenCalled();
  });
});
