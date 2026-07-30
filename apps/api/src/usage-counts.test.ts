import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "./envelope";
import { errorHandler } from "./error-handler";

const { mockGetSession, mockAuth, mockRecipeCount, mockIngredientCount } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockRecipeCount = vi.fn();
  const mockIngredientCount = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  return { mockGetSession, mockAuth, mockRecipeCount, mockIngredientCount };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  prisma: {
    recipe: { count: (args: unknown) => mockRecipeCount(args) },
    ingredient: { count: (args: unknown) => mockIngredientCount(args) },
  },
}));

const { usageCountsHandler } = await import("./usage-counts");

function buildApp(): Hono {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/usage-counts", usageCountsHandler());
  return app;
}

function sessionFor(userId: string) {
  return {
    user: { id: userId, email: "u@x.com" },
    session: { id: "sess-1" },
  };
}

describe("usageCountsHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockRecipeCount.mockReset();
    mockIngredientCount.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/usage-counts");
    expect(res.status).toBe(401);
    expect(mockRecipeCount).not.toHaveBeenCalled();
    expect(mockIngredientCount).not.toHaveBeenCalled();
  });

  it("scopes both counts to the session user's id", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFor("user-42"));
    mockRecipeCount.mockResolvedValueOnce(7);
    mockIngredientCount.mockResolvedValueOnce(3);

    const res = await buildApp().request("/api/usage-counts");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ recipes: 7, ingredients: 3 });
    expect(mockRecipeCount).toHaveBeenCalledWith({ where: { ownerId: "user-42" } });
    expect(mockIngredientCount).toHaveBeenCalledWith({ where: { ownerId: "user-42" } });
  });

  it("returns zero counts when the user has nothing yet", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFor("user-empty"));
    mockRecipeCount.mockResolvedValueOnce(0);
    mockIngredientCount.mockResolvedValueOnce(0);

    const res = await buildApp().request("/api/usage-counts");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ recipes: 0, ingredients: 0 });
  });
});
