import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockIngredientFindFirst = vi.fn();
const mockRecipeIngredientFindMany = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: {
    api: {
      getSession: (args: unknown) => mockGetSession(args),
    },
  },
}));

vi.mock("@recetario/db", () => ({
  prisma: {
    ingredient: {
      findFirst: (args: unknown) => mockIngredientFindFirst(args),
    },
    recipeIngredient: {
      findMany: (args: unknown) => mockRecipeIngredientFindMany(args),
    },
  },
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
  mockIngredientFindFirst.mockReset();
  mockRecipeIngredientFindMany.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe("ingredientsUsageHandler", () => {
  it("returns the recipes that use the ingredient", async () => {
    mockIngredientFindFirst.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockRecipeIngredientFindMany.mockResolvedValueOnce([
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
    mockIngredientFindFirst.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockRecipeIngredientFindMany.mockResolvedValueOnce([]);

    await buildApp().request("/api/ingredients/7/usage");

    expect(mockIngredientFindFirst).toHaveBeenCalledWith({
      where: { id: 7, ownerId: userId },
      select: { id: true },
    });
    expect(mockRecipeIngredientFindMany).toHaveBeenCalledWith({
      where: {
        ingredientId: 7,
        recipe: { ownerId: userId },
      },
      select: { recipe: { select: { id: true, name: true, salePrice: true } } },
      orderBy: { recipe: { id: "asc" } },
    });
  });

  it("returns 404 when the ingredient does not belong to the user", async () => {
    mockIngredientFindFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/ingredients/999/usage");
    expect(res.status).toBe(404);
  });

  it("returns an empty list when the ingredient is unused", async () => {
    mockIngredientFindFirst.mockResolvedValueOnce({ id: 7, ownerId: userId });
    mockRecipeIngredientFindMany.mockResolvedValueOnce([]);

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
