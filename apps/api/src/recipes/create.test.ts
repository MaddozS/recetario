import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const {
  mockGetSession,
  mockAuth,
  mockCreateRecipe,
  mockCountUserRecipes,
  mockGetSubscriptionInfo,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockCreateRecipe = vi.fn();
  const mockCountUserRecipes = vi.fn();
  const mockGetSubscriptionInfo = vi.fn();
  return {
    mockGetSession,
    mockAuth,
    mockCreateRecipe,
    mockCountUserRecipes,
    mockGetSubscriptionInfo,
  };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/stripe/server", () => ({
  getSubscriptionInfo: (...args: unknown[]) => mockGetSubscriptionInfo(...args),
}));

vi.mock("@recetario/db", () => ({
  createRecipe: (ownerId: string, input: unknown, ...rest: unknown[]) =>
    mockCreateRecipe(ownerId, input, ...rest),
  countUserRecipes: (...args: unknown[]) => mockCountUserRecipes(...args),
}));

const { recipesCreateHandler } = await import("./create");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.post("/api/recipes", recipesCreateHandler());
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

describe("recipesCreateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockCreateRecipe.mockReset();
    mockCountUserRecipes.mockReset();
    mockCountUserRecipes.mockResolvedValue(0);
    mockGetSubscriptionInfo.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes", { method: "POST" });
    expect(res.status).toBe(401);
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("creates a recipe with the given name and scopes to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockCreateRecipe.mockResolvedValueOnce(recipeFixture(99));

    const res = await buildApp().request("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Tarta" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; name: string };
    expect(body.id).toBe(99);
    expect(mockCreateRecipe).toHaveBeenCalledWith(
      "user-1",
      {
        name: "Tarta",
        category: null,
        desiredMargin: 0,
        fixedCostsPercentage: 0,
      },
      undefined,
      undefined,
    );
  });

  it("returns 400 on invalid input", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: 123 }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("accepts an empty body and creates a default recipe", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockCreateRecipe.mockResolvedValueOnce(recipeFixture(1));

    const res = await buildApp().request("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    expect(mockCreateRecipe).toHaveBeenCalledWith(
      "user-1",
      {
        name: "Nueva Receta",
        category: null,
        desiredMargin: 0,
        fixedCostsPercentage: 0,
      },
      undefined,
      undefined,
    );
  });

  it("returns 403 PLAN_LIMIT when the plan is at its recipe limit", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetSubscriptionInfo.mockResolvedValueOnce({ recipesLimit: 10 });
    mockCountUserRecipes.mockResolvedValueOnce(10);

    const res = await buildApp().request("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Tarta" }),
    });

    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PLAN_LIMIT");
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("skips the recipe count when the plan is unlimited", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetSubscriptionInfo.mockResolvedValueOnce({ recipesLimit: null });
    mockCreateRecipe.mockResolvedValueOnce(recipeFixture(1));

    const res = await buildApp().request("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Tarta" }),
    });

    expect(res.status).toBe(201);
    expect(mockCountUserRecipes).not.toHaveBeenCalled();
  });
});
