import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockGetRecipe } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetRecipe = vi.fn();
  return { mockGetSession, mockAuth, mockGetRecipe };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getRecipe: (id: number, ownerId: string) => mockGetRecipe(id, ownerId),
}));

const { recipesDetailHandler } = await import("./detail");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/recipes/:id", recipesDetailHandler());
  return app;
}

function recipeFixture(id: number) {
  return {
    id,
    name: "Tarta",
    category: null,
    instructions: null,
    desiredMargin: 30,
    fixedCostsPercentage: 10,
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    recipeIngredients: [],
    presentations: [],
    recipeFixedCosts: [],
  };
}

describe("recipesDetailHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetRecipe.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1");
    expect(res.status).toBe(401);
    expect(mockGetRecipe).not.toHaveBeenCalled();
  });

  it("returns the recipe when owned by the session user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipe.mockResolvedValueOnce(recipeFixture(1));

    const res = await buildApp().request("/api/recipes/1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number; name: string };
    expect(body.name).toBe("Tarta");
    expect(mockGetRecipe).toHaveBeenCalledWith(1, "user-1");
  });

  it("returns 404 when the recipe does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipe.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a non-numeric id", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes/abc");
    expect(res.status).toBe(404);
    expect(mockGetRecipe).not.toHaveBeenCalled();
  });
});
