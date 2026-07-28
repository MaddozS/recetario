import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockRecipeIngredientFindMany = vi.fn();
const mockPrismaIngredientDelete = vi.fn();
const mockCacheDelete = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: {
    api: {
      getSession: (args: unknown) => mockGetSession(args),
    },
  },
}));

vi.mock("@recetario/db", () => ({
  prisma: {
    recipeIngredient: {
      findMany: (args: unknown) => mockRecipeIngredientFindMany(args),
    },
    ingredient: {
      delete: (args: unknown) => mockPrismaIngredientDelete(args),
    },
  },
  cacheDelete: mockCacheDelete,
}));

const { ingredientsDeleteHandler } = await import("./delete.js");

const userId = "user-1";
const sessionFixture = {
  user: { id: userId, email: "a@b.c", name: "A", image: null },
  session: { id: "s1", userId, token: "t1", expiresAt: new Date() },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.delete("/api/ingredients/:id", ingredientsDeleteHandler());
  return app;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockRecipeIngredientFindMany.mockReset();
  mockPrismaIngredientDelete.mockReset();
  mockCacheDelete.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe("ingredientsDeleteHandler", () => {
  it("returns 204 when the ingredient is not in use", async () => {
    mockRecipeIngredientFindMany.mockResolvedValueOnce([]);
    mockPrismaIngredientDelete.mockResolvedValueOnce({ id: 7 });

    const res = await buildApp().request("/api/ingredients/7", {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
    expect(mockPrismaIngredientDelete).toHaveBeenCalledWith({
      where: { id: 7, ownerId: userId },
    });
    expect(mockCacheDelete).toHaveBeenCalledWith(`ingredients:${userId}`);
    expect(mockCacheDelete).toHaveBeenCalledWith(
      `ingredient_usage:${userId}`,
    );
  });

  it("returns 409 with the recipe list when the ingredient is in use", async () => {
    mockRecipeIngredientFindMany.mockResolvedValueOnce([
      { recipe: { id: 10, name: "Tarta de Chocolate", salePrice: 250 } },
      { recipe: { id: 11, name: "Flan Casero", salePrice: null } },
    ]);

    const res = await buildApp().request("/api/ingredients/7", {
      method: "DELETE",
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; reason: string };
      recipes: Array<{ id: number; name: string }>;
    };
    expect(body.error.code).toBe("DOMAIN_ERROR");
    expect(body.error.reason).toBe("ingredient_in_use");
    expect(body.recipes).toHaveLength(2);
    expect(body.recipes[0]).toEqual({
      id: 10,
      name: "Tarta de Chocolate",
      salePrice: 250,
    });
    expect(body.recipes[1]).toEqual({
      id: 11,
      name: "Flan Casero",
      salePrice: null,
    });
    expect(mockPrismaIngredientDelete).not.toHaveBeenCalled();
  });

  it("scopes the usage check to the calling user", async () => {
    mockRecipeIngredientFindMany.mockResolvedValueOnce([]);

    await buildApp().request("/api/ingredients/7", { method: "DELETE" });

    expect(mockRecipeIngredientFindMany).toHaveBeenCalledWith({
      where: {
        ingredientId: 7,
        recipe: { ownerId: userId },
      },
      select: {
        recipe: { select: { id: true, name: true, salePrice: true } },
      },
    });
  });

  it("returns 404 when the ingredient does not exist for the user", async () => {
    mockRecipeIngredientFindMany.mockResolvedValueOnce([]);
    mockPrismaIngredientDelete.mockImplementationOnce(() => {
      throw Object.assign(new Error("not found"), { code: "P2025" });
    });

    const res = await buildApp().request("/api/ingredients/999", {
      method: "DELETE",
    });

    expect(res.status).toBe(404);
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/ingredients/7", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });
});
