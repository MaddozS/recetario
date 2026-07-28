import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockPrisma } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockIngredientFindFirst = vi.fn();
  const mockRecipeIngredientFindMany = vi.fn();
  const mockPrisma = {
    ingredient: { findFirst: mockIngredientFindFirst },
    recipeIngredient: { findMany: mockRecipeIngredientFindMany },
  };
  return { mockGetSession, mockAuth, mockPrisma, mockIngredientFindFirst, mockRecipeIngredientFindMany };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => mockPrisma,
}));

const { ingredientsUsageHandler } = await import("./usage.js");

const userId = "user-1";
const sessionFixture = {
  user: { id: userId, email: "a@b.c", name: "A", image: null },
  session: { id: "s1", userId, token: "t1", expiresAt: new Date() },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/ingredients/:id/usage", ingredientsUsageHandler());
  return app;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockPrisma.ingredient.findFirst.mockReset();
  mockPrisma.recipeIngredient.findMany.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe("ingredientsUsageHandler", () => {
  it("returns the recipes that use the ingredient", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockPrisma.recipeIngredient.findMany.mockResolvedValueOnce([
      { recipe: { id: 10, name: "Tarta", salePrice: 250 } },
      { recipe: { id: 11, name: "Flan", salePrice: null } },
    ]);

    const res = await buildApp().request("/api/ingredients/7/usage");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      recipes: Array<{ id: number; name: string; salePrice: number | null }>;
    };
    expect(body.recipes).toEqual([
      { id: 10, name: "Tarta", salePrice: 250 },
      { id: 11, name: "Flan", salePrice: null },
    ]);
  });

  it("scopes both the ingredient and recipe lookups to the owner", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockPrisma.recipeIngredient.findMany.mockResolvedValueOnce([]);

    await buildApp().request("/api/ingredients/7/usage");

    expect(mockPrisma.ingredient.findFirst).toHaveBeenCalledWith({
      where: { id: 7, ownerId: userId },
      select: { id: true },
    });
    expect(mockPrisma.recipeIngredient.findMany).toHaveBeenCalledWith({
      where: {
        ingredientId: 7,
        recipe: { ownerId: userId },
      },
      select: { recipe: { select: { id: true, name: true, salePrice: true } } },
      orderBy: { recipe: { id: "asc" } },
    });
  });

  it("returns 404 when the ingredient does not belong to the user", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/ingredients/999/usage");
    expect(res.status).toBe(404);
  });

  it("returns an empty list when the ingredient is unused", async () => {
    mockPrisma.ingredient.findFirst.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockPrisma.recipeIngredient.findMany.mockResolvedValueOnce([]);

    const res = await buildApp().request("/api/ingredients/7/usage");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { recipes: unknown[] };
    expect(body.recipes).toEqual([]);
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/ingredients/7/usage");
    expect(res.status).toBe(401);
  });
});
