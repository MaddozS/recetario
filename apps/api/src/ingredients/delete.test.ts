import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockDeleteIngredient, mockCacheDelete } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockDeleteIngredient = vi.fn();
  const mockCacheDelete = vi.fn();
  return { mockGetSession, mockAuth, mockDeleteIngredient, mockCacheDelete };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => ({}),
  deleteIngredient: (id: number, ownerId: string, db: unknown) =>
    mockDeleteIngredient(id, ownerId, db),
  cacheDelete: (key: string, db: unknown) => mockCacheDelete(key, db),
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
  mockDeleteIngredient.mockReset();
  mockCacheDelete.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe("ingredientsDeleteHandler", () => {
  it("returns 204 when the ingredient is not in use", async () => {
    mockDeleteIngredient.mockResolvedValueOnce({ status: "deleted" });

    const res = await buildApp().request("/api/ingredients/7", {
      method: "DELETE",
    });

    expect(res.status).toBe(204);
    expect(mockDeleteIngredient).toHaveBeenCalledWith(7, userId, expect.anything());
    expect(mockCacheDelete).toHaveBeenCalledWith(
      `ingredients:${userId}`,
      expect.anything(),
    );
    expect(mockCacheDelete).toHaveBeenCalledWith(
      `ingredient_usage:${userId}`,
      expect.anything(),
    );
  });

  it("returns 409 with the recipe list when the ingredient is in use", async () => {
    mockDeleteIngredient.mockResolvedValueOnce({
      status: "blocked",
      recipes: [
        { id: 10, name: "Tarta de Chocolate", salePrice: 250 },
        { id: 11, name: "Flan Casero", salePrice: null },
      ],
    });

    const res = await buildApp().request("/api/ingredients/7", {
      method: "DELETE",
    });

    expect(res.status).toBe(409);
    const body = (await res.json()) as {
      error: { code: string; reason: string };
      recipes: Array<{ id: number; name: string; salePrice: number | null }>;
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
  });

  it("returns 404 when the ingredient does not exist for the user", async () => {
    mockDeleteIngredient.mockResolvedValueOnce({ status: "not-found" });

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
