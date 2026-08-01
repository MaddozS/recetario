import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockGetRecipe, mockUpdateRecipe } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetRecipe = vi.fn();
  const mockUpdateRecipe = vi.fn();
  return { mockGetSession, mockAuth, mockGetRecipe, mockUpdateRecipe };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getRecipe: (id: number, ownerId: string) => mockGetRecipe(id, ownerId),
  updateRecipe: (
    id: number,
    input: unknown,
    ownerId: string,
    ingredients: unknown,
    recipeFixedCosts?: unknown,
  ) => mockUpdateRecipe(id, input, ownerId, ingredients, recipeFixedCosts),
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

describe("recipesUpdateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetRecipe.mockReset();
    mockUpdateRecipe.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1", { method: "PATCH" });
    expect(res.status).toBe(401);
  });

  it("updates a recipe and returns the new detail", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipe.mockResolvedValueOnce(recipeFixture(1));
    mockUpdateRecipe.mockResolvedValueOnce(undefined);
    mockGetRecipe.mockResolvedValueOnce(recipeFixture(1));

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
    expect(body.name).toBe("Tarta");
    expect(mockUpdateRecipe).toHaveBeenCalledWith(
      1,
      {
        name: "Tarta v2",
        category: null,
        instructions: null,
        desiredMargin: 30,
        fixedCostsPercentage: 10,
      },
      "user-1",
      [{ ingredientId: 1, quantity: 200, unit: "g", comment: null }],
      undefined,
    );
  });

  it("returns 404 when the recipe does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipe.mockResolvedValueOnce(null);

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
