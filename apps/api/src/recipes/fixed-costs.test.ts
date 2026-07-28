import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockFindFirstRecipe = vi.fn();
const mockFindFirstFixedCost = vi.fn();
const mockCreateFixedCost = vi.fn();
const mockUpdateFixedCost = vi.fn();
const mockDeleteFixedCost = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: { api: { getSession: (args: unknown) => mockGetSession(args) } },
}));

vi.mock("@recetario/db", () => ({
  prisma: {
    recipe: {
      findFirst: (args: unknown) => mockFindFirstRecipe(args),
    },
    recipeFixedCost: {
      findFirst: (args: unknown) => mockFindFirstFixedCost(args),
      create: (args: unknown) => mockCreateFixedCost(args),
      update: (args: unknown) => mockUpdateFixedCost(args),
      delete: (args: unknown) => mockDeleteFixedCost(args),
    },
  },
}));

const {
  fixedCostsCreateHandler,
  fixedCostsUpdateHandler,
  fixedCostsDeleteHandler,
} = await import("./fixed-costs.js");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.post("/api/recipes/:id/fixed-costs", fixedCostsCreateHandler());
  app.patch("/api/recipes/:id/fixed-costs/:fid", fixedCostsUpdateHandler());
  app.delete("/api/recipes/:id/fixed-costs/:fid", fixedCostsDeleteHandler());
  return app;
}

describe("fixedCostsCreateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockFindFirstRecipe.mockReset();
    mockCreateFixedCost.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/fixed-costs", {
      method: "POST",
    });
    expect(res.status).toBe(401);
  });

  it("creates a fixed cost when the recipe is owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstRecipe.mockResolvedValueOnce({ id: 1 });
    mockCreateFixedCost.mockResolvedValueOnce({
      id: 7,
      recipeId: 1,
      name: "Luz",
      type: "AMOUNT",
      base: "PER_BATCH",
      value: 12.5,
      hours: null,
    });

    const res = await buildApp().request("/api/recipes/1/fixed-costs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name: "Luz",
        type: "AMOUNT",
        base: "PER_BATCH",
        value: 12.5,
      }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; name: string };
    expect(body.id).toBe(7);
    expect(mockCreateFixedCost).toHaveBeenCalledWith({
      data: {
        recipeId: 1,
        name: "Luz",
        type: "AMOUNT",
        base: "PER_BATCH",
        value: 12.5,
        hours: null,
      },
    });
  });

  it("returns 404 when the recipe is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstRecipe.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42/fixed-costs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        type: "AMOUNT",
        base: "PER_BATCH",
        value: 10,
      }),
    });
    expect(res.status).toBe(404);
    expect(mockCreateFixedCost).not.toHaveBeenCalled();
  });

  it("returns 400 on invalid input", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstRecipe.mockResolvedValueOnce({ id: 1 });

    const res = await buildApp().request("/api/recipes/1/fixed-costs", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ type: "AMOUNT" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("fixedCostsUpdateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockFindFirstFixedCost.mockReset();
    mockUpdateFixedCost.mockReset();
  });

  it("updates a fixed cost when owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstFixedCost.mockResolvedValueOnce({
      id: 7,
      recipeId: 1,
      recipe: { ownerId: "user-1" },
    });
    mockUpdateFixedCost.mockResolvedValueOnce({
      id: 7,
      recipeId: 1,
      name: "Luz mod",
      type: "AMOUNT",
      base: "PER_BATCH",
      value: 20,
      hours: null,
    });

    const res = await buildApp().request(
      "/api/recipes/1/fixed-costs/7",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "Luz mod", value: 20 }),
      },
    );
    expect(res.status).toBe(200);
    expect(mockUpdateFixedCost).toHaveBeenCalled();
  });

  it("returns 404 when the fixed cost does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstFixedCost.mockResolvedValueOnce(null);

    const res = await buildApp().request(
      "/api/recipes/1/fixed-costs/7",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 when the fixed cost belongs to a different user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstFixedCost.mockResolvedValueOnce({
      id: 7,
      recipeId: 1,
      recipe: { ownerId: "other-user" },
    });

    const res = await buildApp().request(
      "/api/recipes/1/fixed-costs/7",
      {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: "X" }),
      },
    );
    expect(res.status).toBe(404);
  });
});

describe("fixedCostsDeleteHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockFindFirstFixedCost.mockReset();
    mockDeleteFixedCost.mockReset();
  });

  it("deletes a fixed cost when owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstFixedCost.mockResolvedValueOnce({
      id: 7,
      recipeId: 1,
      recipe: { ownerId: "user-1" },
    });
    mockDeleteFixedCost.mockResolvedValueOnce({});

    const res = await buildApp().request(
      "/api/recipes/1/fixed-costs/7",
      { method: "DELETE" },
    );
    expect(res.status).toBe(204);
    expect(mockDeleteFixedCost).toHaveBeenCalledWith({ where: { id: 7 } });
  });

  it("returns 404 when the fixed cost does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstFixedCost.mockResolvedValueOnce(null);

    const res = await buildApp().request(
      "/api/recipes/1/fixed-costs/7",
      { method: "DELETE" },
    );
    expect(res.status).toBe(404);
    expect(mockDeleteFixedCost).not.toHaveBeenCalled();
  });
});
