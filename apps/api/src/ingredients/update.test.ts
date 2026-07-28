import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockUpdateIngredient, mockCacheDelete } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockUpdateIngredient = vi.fn();
  const mockCacheDelete = vi.fn();
  return { mockGetSession, mockAuth, mockUpdateIngredient, mockCacheDelete };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => ({}),
  updateIngredient: (id: number, input: unknown, ownerId: string, db: unknown) =>
    mockUpdateIngredient(id, input, ownerId, db),
  cacheDelete: (key: string, db: unknown) => mockCacheDelete(key, db),
}));

const { ingredientsUpdateHandler } = await import("./update.js");

const userId = "user-1";
const sessionFixture = {
  user: { id: userId, email: "a@b.c", name: "A", image: null },
  session: { id: "s1", userId, token: "t1", expiresAt: new Date() },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.patch("/api/ingredients/:id", ingredientsUpdateHandler());
  return app;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockUpdateIngredient.mockReset();
  mockCacheDelete.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe("ingredientsUpdateHandler", () => {
  it("updates the ingredient and returns 200 with the body", async () => {
    const updated = {
      id: 7,
      ownerId: userId,
      name: "Tomato (updated)",
      unit: "kg",
      price: 4.0,
      purchaseQuantity: 1,
      brand: null,
      supplier: null,
    };
    mockUpdateIngredient.mockResolvedValueOnce(updated);

    const res = await buildApp().request("/api/ingredients/7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Tomato (updated)", price: 4.0 }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as { id: number; name: string };
    expect(body.id).toBe(7);
    expect(body.name).toBe("Tomato (updated)");
    expect(mockUpdateIngredient).toHaveBeenCalledWith(
      7,
      { name: "Tomato (updated)", price: 4.0 },
      userId,
      expect.anything(),
    );
    expect(mockCacheDelete).toHaveBeenCalledWith(
      `ingredients:${userId}`,
      expect.anything(),
    );
    expect(mockCacheDelete).toHaveBeenCalledWith(
      `ingredient_usage:${userId}`,
      expect.anything(),
    );
  });

  it("returns 400 VALIDATION_ERROR when fields are invalid", async () => {
    const res = await buildApp().request("/api/ingredients/7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ price: -5 }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockUpdateIngredient).not.toHaveBeenCalled();
  });

  it("returns 404 when the ingredient does not belong to the user", async () => {
    mockUpdateIngredient.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/ingredients/999", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Other" }),
    });

    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/ingredients/7", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(401);
  });
});
