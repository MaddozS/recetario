import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockGetRecipeById, mockUpdateRecipe } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetRecipeById = vi.fn();
  const mockUpdateRecipe = vi.fn();
  return { mockGetSession, mockAuth, mockGetRecipeById, mockUpdateRecipe };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  prisma: {},
  getRecipeById: (id: number, ownerId: string) =>
    mockGetRecipeById(id, ownerId),
  updateRecipe: (id: number, input: unknown, ownerId: string) =>
    mockUpdateRecipe(id, input, ownerId),
}));

const { recipesUpdateHandler } = await import("./update");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.patch("/api/recipes/:id", recipesUpdateHandler());
  return app;
}

describe("recipesUpdateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetRecipeById.mockReset();
    mockUpdateRecipe.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1", { method: "PATCH" });
    expect(res.status).toBe(401);
  });

  it("updates a recipe and returns the new detail", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipeById.mockResolvedValueOnce({ id: 1 });
    mockUpdateRecipe.mockResolvedValueOnce(undefined);
    mockGetRecipeById.mockResolvedValueOnce({
      id: 1,
      name: "Tarta v2",
      ingredients: [],
      presentations: [],
      recipeFixedCosts: [],
    });

    const res = await buildApp().request("/api/recipes/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Tarta v2",
        desiredMargin: 30,
        fixedCostsPercentage: 10,
        ingredients: [{ ingredientId: 1, quantity: 200, unit: "g" }],
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { name: string };
    expect(body.name).toBe("Tarta v2");
    expect(mockUpdateRecipe).toHaveBeenCalledWith(
      1,
      {
        name: "Tarta v2",
        desiredMargin: 30,
        fixedCostsPercentage: 10,
        ingredients: [
          { ingredientId: 1, quantity: 200, unit: "g", comment: null },
        ],
        category: undefined,
        instructions: undefined,
        recipeFixedCosts: undefined,
      },
      "user-1",
    );
  });

  it("returns 404 when the recipe does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipeById.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "X",
        desiredMargin: 0,
        fixedCostsPercentage: 0,
        ingredients: [],
      }),
    });
    expect(res.status).toBe(404);
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it("returns 400 when the body is invalid", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ desiredMargin: 30 }),
    });
    expect(res.status).toBe(400);
    expect(mockUpdateRecipe).not.toHaveBeenCalled();
  });

  it("returns 400 for a malformed JSON body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes/1", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: "not-json",
    });
    expect(res.status).toBe(400);
  });
});
