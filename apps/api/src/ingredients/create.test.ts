import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockCreateIngredient, mockCacheDelete } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockCreateIngredient = vi.fn();
  const mockCacheDelete = vi.fn();
  return { mockGetSession, mockAuth, mockCreateIngredient, mockCacheDelete };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => ({}),
  createIngredient: (input: unknown, ownerId: string, db: unknown) =>
    mockCreateIngredient(input, ownerId, db),
  cacheDelete: (key: string, db: unknown) => mockCacheDelete(key, db),
}));

const { ingredientsCreateHandler } = await import("./create.js");

const userId = "user-1";
const sessionFixture = {
  user: { id: userId, email: "a@b.c", name: "A", image: null },
  session: { id: "s1", userId, token: "t1", expiresAt: new Date() },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.post("/api/ingredients", ingredientsCreateHandler());
  return app;
}

beforeEach(() => {
  mockGetSession.mockReset();
  mockCreateIngredient.mockReset();
  mockCacheDelete.mockReset();
  mockGetSession.mockResolvedValue(sessionFixture);
});

describe("ingredientsCreateHandler", () => {
  it("creates an ingredient and returns 201 with the body", async () => {
    const created = {
      id: 42,
      ownerId: userId,
      name: "Tomato",
      unit: "kg",
      price: 3.5,
      purchaseQuantity: 1,
      brand: null,
      supplier: null,
    };
    mockCreateIngredient.mockResolvedValueOnce(created);

    const res = await buildApp().request("/api/ingredients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Tomato",
        unit: "kg",
        price: 3.5,
        purchaseQuantity: 1,
      }),
    });

    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; name: string };
    expect(body.id).toBe(42);
    expect(body.name).toBe("Tomato");
    expect(mockCreateIngredient).toHaveBeenCalledWith(
      {
        name: "Tomato",
        unit: "kg",
        price: 3.5,
        purchaseQuantity: 1,
      },
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

  it("returns 400 VALIDATION_ERROR when required fields are missing", async () => {
    const res = await buildApp().request("/api/ingredients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Tomato" }),
    });

    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockCreateIngredient).not.toHaveBeenCalled();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/ingredients", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Tomato",
        unit: "kg",
        price: 3.5,
        purchaseQuantity: 1,
      }),
    });

    expect(res.status).toBe(401);
    expect(mockCreateIngredient).not.toHaveBeenCalled();
  });
});
