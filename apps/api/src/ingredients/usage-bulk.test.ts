import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockGetIngredientUsage } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockGetIngredientUsage = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  return { mockGetSession, mockAuth, mockGetIngredientUsage };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getIngredientUsage: (ownerId: string) => mockGetIngredientUsage(ownerId),
}));

const { ingredientsUsageBulkHandler } = await import("./usage-bulk");

const sessionFixture = {
  user: { id: "user-1", email: "u@x.com" },
  session: { id: "sess-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/ingredients/usage", ingredientsUsageBulkHandler());
  return app;
}

describe("ingredientsUsageBulkHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetIngredientUsage.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/ingredients/usage");
    expect(res.status).toBe(401);
  });

  it("returns a record keyed by ingredientId", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetIngredientUsage.mockResolvedValueOnce({
      1: ["Brownie", "Galleta"],
      2: ["Brownie"],
    });

    const res = await buildApp().request("/api/ingredients/usage");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      "1": ["Brownie", "Galleta"],
      "2": ["Brownie"],
    });
    expect(mockGetIngredientUsage).toHaveBeenCalledWith("user-1");
  });
});
