import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockListIngredients = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: { api: { getSession: (args: unknown) => mockGetSession(args) } },
}));

vi.mock("@recetario/db", () => ({
  listIngredients: (ownerId: string) => mockListIngredients(ownerId),
}));

const { ingredientsListHandler } = await import("./list.js");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/ingredients", ingredientsListHandler());
  return app;
}

describe("ingredientsListHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockListIngredients.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/ingredients");
    expect(res.status).toBe(401);
    expect(mockListIngredients).not.toHaveBeenCalled();
  });

  it("returns only id, name and unit, scoped to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockListIngredients.mockResolvedValueOnce([
      {
        id: 1,
        name: "Harina",
        unit: "kg",
        price: 25,
        purchaseQuantity: 1,
        brand: "X",
        supplier: "Y",
      },
      {
        id: 2,
        name: "Azucar",
        unit: "kg",
        price: 30,
        purchaseQuantity: 1,
      },
    ]);

    const res = await buildApp().request("/api/ingredients");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number; name: string; unit: string }>;
    expect(body).toEqual([
      { id: 1, name: "Harina", unit: "kg" },
      { id: 2, name: "Azucar", unit: "kg" },
    ]);
    expect(mockListIngredients).toHaveBeenCalledWith("user-1");
  });
});
