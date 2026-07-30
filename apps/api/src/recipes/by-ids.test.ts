import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockGetRecipesByIds } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetRecipesByIds = vi.fn();
  return { mockGetSession, mockAuth, mockGetRecipesByIds };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  prisma: {},
  getRecipesByIds: (ids: number[], ownerId: string) =>
    mockGetRecipesByIds(ids, ownerId),
}));

const { recipesByIdsHandler } = await import("./by-ids.js");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/recipes/by-ids", recipesByIdsHandler());
  return app;
}

function recipeFixture(id: number) {
  return {
    id,
    name: `Receta ${id}`,
    desiredMargin: 30,
    fixedCostsPercentage: 10,
    ingredients: [],
    presentations: [],
    recipeFixedCosts: [],
  };
}

describe("recipesByIdsHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetRecipesByIds.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/by-ids?ids=1,2");
    expect(res.status).toBe(401);
    expect(mockGetRecipesByIds).not.toHaveBeenCalled();
  });

  it("returns 400 when ids is missing", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes/by-ids");
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(mockGetRecipesByIds).not.toHaveBeenCalled();
  });

  it("returns 400 when ids is empty after parsing", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes/by-ids?ids=,,,");
    expect(res.status).toBe(400);
    expect(mockGetRecipesByIds).not.toHaveBeenCalled();
  });

  it("returns 400 when all ids are invalid", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/recipes/by-ids?ids=abc,-1,0");
    expect(res.status).toBe(400);
    expect(mockGetRecipesByIds).not.toHaveBeenCalled();
  });

  it("returns 400 when more than 100 ids are provided", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const ids = Array.from({ length: 101 }, (_, i) => i + 1).join(",");
    const res = await buildApp().request(`/api/recipes/by-ids?ids=${ids}`);
    expect(res.status).toBe(400);
    expect(mockGetRecipesByIds).not.toHaveBeenCalled();
  });

  it("filters out non-numeric and non-positive entries, calls db with valid ids", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipesByIds.mockResolvedValueOnce([recipeFixture(1), recipeFixture(3)]);

    const res = await buildApp().request("/api/recipes/by-ids?ids=1,abc,3,-2,0,4");
    expect(res.status).toBe(200);
    expect(mockGetRecipesByIds).toHaveBeenCalledWith([1, 3, 4], "user-1");

    const body = (await res.json()) as Array<{ id: number }>;
    expect(body.map((r) => r.id)).toEqual([1, 3]);
  });

  it("returns an empty array when no recipes match the owner", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipesByIds.mockResolvedValueOnce([]);

    const res = await buildApp().request("/api/recipes/by-ids?ids=99,100");
    expect(res.status).toBe(200);
    const body = (await res.json()) as unknown[];
    expect(body).toEqual([]);
    expect(mockGetRecipesByIds).toHaveBeenCalledWith([99, 100], "user-1");
  });

  it("passes the session userId to getRecipesByIds (ownerId enforcement lives in @recetario/db)", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipesByIds.mockResolvedValueOnce([recipeFixture(1)]);

    const res = await buildApp().request("/api/recipes/by-ids?ids=1,2,3", {
      headers: { cookie: "session=abc" },
    });
    expect(res.status).toBe(200);
    expect(mockGetRecipesByIds).toHaveBeenCalledWith([1, 2, 3], "user-1");
  });

  it("caches the response for 60s and hits the cache on the second call", async () => {
    mockGetSession.mockResolvedValue(sessionFixture);
    mockGetRecipesByIds.mockResolvedValue([recipeFixture(1)]);

    const app = buildApp();
    const res1 = await app.request("/api/recipes/by-ids?ids=7777");
    const res2 = await app.request("/api/recipes/by-ids?ids=7777");

    expect(res1.status).toBe(200);
    expect(res2.status).toBe(200);
    expect(mockGetRecipesByIds).toHaveBeenCalledTimes(1);
  });

  it("treats reordered ids as the same cache key", async () => {
    mockGetSession.mockResolvedValue(sessionFixture);
    mockGetRecipesByIds.mockResolvedValue([recipeFixture(1)]);

    const app = buildApp();
    await app.request("/api/recipes/by-ids?ids=7778,7779");
    await app.request("/api/recipes/by-ids?ids=7779,7778");

    expect(mockGetRecipesByIds).toHaveBeenCalledTimes(1);
  });
});
