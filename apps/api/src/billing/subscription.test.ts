import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";

const { mockGetSession, mockReconcileSubscription } = vi.hoisted(() => ({
  mockGetSession: vi.fn(),
  mockReconcileSubscription: vi.fn(),
}));

vi.mock("@recetario/auth/server", () => ({ auth: { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } } }));
vi.mock("@recetario/stripe/server", () => ({ reconcileSubscription: (...args: unknown[]) => mockReconcileSubscription(...args) }));

const { subscriptionHandler } = await import("./subscription");
const sessionFixture = { user: { id: "user-1", email: "ada@example.com" }, session: { id: "sess-1", userId: "user-1" } };
const infoFixture = {
  tier: "pro",
  status: "active",
  recipesLimit: null,
  ingredientsLimit: null,
  features: { recipe_duplicate: true, pdf_export: true },
  priceCents: 1999,
  currency: "mxn",
  billingInterval: "monthly",
  currentPeriodEnd: "2030-01-01T00:00:00.000Z",
  cancelAtPeriodEnd: false,
  isTrial: false,
  trialEnd: null,
  scheduledChange: null,
};
function buildApp() { const app = new Hono(); app.onError(errorHandler()); app.use("*", envelope()); app.use("*", hostAllowlist()); app.get("/api/billing/subscription", subscriptionHandler()); return app; }

describe("subscriptionHandler", () => {
  beforeEach(() => { mockGetSession.mockReset(); mockReconcileSubscription.mockReset(); });
  it("returns the reconciled subscription", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture); mockReconcileSubscription.mockResolvedValueOnce(infoFixture);
    const res = await buildApp().request("/api/billing/subscription", {}, {});
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(infoFixture);
    expect(mockReconcileSubscription).toHaveBeenCalledWith("user-1");
  });
  it("returns 404 when reconcile returns null", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture); mockReconcileSubscription.mockResolvedValueOnce(null);
    expect((await buildApp().request("/api/billing/subscription", {}, {})).status).toBe(404);
  });
  it("returns 401 without a session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    expect((await buildApp().request("/api/billing/subscription", {}, {})).status).toBe(401);
    expect(mockReconcileSubscription).not.toHaveBeenCalled();
  });
});
