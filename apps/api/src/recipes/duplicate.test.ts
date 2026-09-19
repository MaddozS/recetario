import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const {
  mockGetSession,
  mockAuth,
  mockDuplicateRecipe,
  mockCountUserRecipes,
  mockGetSubscriptionInfo,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockDuplicateRecipe = vi.fn();
  const mockCountUserRecipes = vi.fn();
  const mockGetSubscriptionInfo = vi.fn();
  return {
    mockGetSession,
    mockAuth,
    mockDuplicateRecipe,
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
  duplicateRecipe: (sourceRecipeId: number, ownerId: string) =>
    mockDuplicateRecipe(sourceRecipeId, ownerId),
  countUserRecipes: (...args: unknown[]) => mockCountUserRecipes(...args),
}));

const { recipesDuplicateHandler } = await import("./duplicate");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.post("/api/recipes/:id/duplicate", recipesDuplicateHandler());
  return app;
}

function recipeFixture(id: number) {
  return {
    id,
    name: "Copia de Tarta",
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

describe("recipesDuplicateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockDuplicateRecipe.mockReset();
    mockCountUserRecipes.mockReset();
    mockCountUserRecipes.mockResolvedValue(0);
    mockGetSubscriptionInfo.mockReset();
    mockGetSubscriptionInfo.mockResolvedValue({
      recipesLimit: null,
      features: { recipe_duplicate: true },
    });
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/duplicate", { method: "POST" });
    expect(res.status).toBe(401);
    expect(mockDuplicateRecipe).not.toHaveBeenCalled();
  });

  it("duplicates the recipe and returns the shaped detail", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockDuplicateRecipe.mockResolvedValueOnce(recipeFixture(99));

    const res = await buildApp().request("/api/recipes/1/duplicate", { method: "POST" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      id: number;
      name: string;
      updatedAt: string;
      ingredients: unknown[];
    };
    expect(body.id).toBe(99);
    expect(body.name).toBe("Copia de Tarta");
    expect(typeof body.updatedAt).toBe("string");
    expect(Array.isArray(body.ingredients)).toBe(true);
    expect(mockDuplicateRecipe).toHaveBeenCalledWith(1, "user-1");
  });

  it("returns 404 when the recipe does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockDuplicateRecipe.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42/duplicate", { method: "POST" });
    expect(res.status).toBe(404);
  });

  it("returns 403 FEATURE_REQUIRED when the plan lacks recipe_duplicate", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetSubscriptionInfo.mockResolvedValueOnce({
      recipesLimit: null,
      features: { recipe_duplicate: false },
    });

    const res = await buildApp().request("/api/recipes/1/duplicate", { method: "POST" });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FEATURE_REQUIRED");
    expect(mockDuplicateRecipe).not.toHaveBeenCalled();
  });

  it("returns 403 PLAN_LIMIT when duplicating would exceed the recipe limit", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetSubscriptionInfo.mockResolvedValueOnce({
      recipesLimit: 10,
      features: { recipe_duplicate: true },
    });
    mockCountUserRecipes.mockResolvedValueOnce(10);

    const res = await buildApp().request("/api/recipes/1/duplicate", { method: "POST" });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("PLAN_LIMIT");
    expect(mockDuplicateRecipe).not.toHaveBeenCalled();
  });
});
