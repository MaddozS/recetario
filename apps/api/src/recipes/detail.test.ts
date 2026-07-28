import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockGetRecipeById } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetRecipeById = vi.fn();
  return { mockGetSession, mockAuth, mockGetRecipeById };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => ({}),
  getRecipeById: (id: number, ownerId: string, db: unknown) =>
    mockGetRecipeById(id, ownerId, db),
}));

const { recipesDetailHandler } = await import("./detail.js");

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

describe("recipesDetailHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetRecipeById.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1");
    expect(res.status).toBe(401);
    expect(mockGetRecipeById).not.toHaveBeenCalled();
  });

  it("returns the recipe when owned by the session user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipeById.mockResolvedValueOnce({
      id: 1,
      name: "Tarta",
      ingredients: [],
      presentations: [],
      recipeFixedCosts: [],
      desiredMargin: 30,
      fixedCostsPercentage: 10,
    });

    const res = await buildApp().request("/api/recipes/1");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number; name: string };
    expect(body.name).toBe("Tarta");
    expect(mockGetRecipeById).toHaveBeenCalledWith(1, "user-1", expect.anything());
  });

  it("returns 404 when the recipe does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipeById.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42");
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 404 for a non-numeric id", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes/abc");
    expect(res.status).toBe(404);
    expect(mockGetRecipeById).not.toHaveBeenCalled();
  });
});
