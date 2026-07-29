import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockPrisma } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockFindFirstRecipe = vi.fn();
  const mockFindManyPresentations = vi.fn();
  const mockFindFirstPresentation = vi.fn();
  const mockCreatePresentation = vi.fn();
  const mockUpdatePresentation = vi.fn();
  const mockDeletePresentation = vi.fn();
  const mockPrisma = {
    recipe: { findFirst: mockFindFirstRecipe },
    recipePresentation: {
      findMany: mockFindManyPresentations,
      findFirst: mockFindFirstPresentation,
      create: mockCreatePresentation,
      update: mockUpdatePresentation,
      delete: mockDeletePresentation,
    },
  };
  return {
    mockGetSession,
    mockAuth,
    mockPrisma,
    mockFindFirstRecipe,
    mockFindManyPresentations,
    mockFindFirstPresentation,
    mockCreatePresentation,
    mockUpdatePresentation,
    mockDeletePresentation,
  };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => mockPrisma,
}));

const {
  presentationsListHandler,
  presentationsCreateHandler,
  presentationsUpdateHandler,
  presentationsDeleteHandler,
} = await import("./presentations.js");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/recipes/:id/presentations", presentationsListHandler());
  app.post("/api/recipes/:id/presentations", presentationsCreateHandler());
  app.patch("/api/recipes/:id/presentations/:pid", presentationsUpdateHandler());
  app.delete("/api/recipes/:id/presentations/:pid", presentationsDeleteHandler());
  return app;
}

describe("presentationsListHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockPrisma.recipe.findFirst.mockReset();
    mockPrisma.recipePresentation.findMany.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/presentations");
    expect(res.status).toBe(401);
  });

  it("returns the presentations for a recipe owned by the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipe.findFirst.mockResolvedValueOnce({ id: 1 });
    mockPrisma.recipePresentation.findMany.mockResolvedValueOnce([
      {
        id: 10,
        name: "Individual",
        unitsPerBatch: 12,
        salePrice: 25,
        fixedCosts: [],
      },
    ]);

    const res = await buildApp().request("/api/recipes/1/presentations");
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number; name: string }>;
    expect(body).toHaveLength(1);
    expect(body[0].name).toBe("Individual");
  });

  it("returns 404 when the recipe is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipe.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42/presentations");
    expect(res.status).toBe(404);
    expect(mockPrisma.recipePresentation.findMany).not.toHaveBeenCalled();
  });
});

describe("presentationsCreateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockPrisma.recipe.findFirst.mockReset();
    mockPrisma.recipePresentation.create.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/presentations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Docena", unitsPerBatch: 12 }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the recipe is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipe.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42/presentations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Docena", unitsPerBatch: 12 }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.recipePresentation.create).not.toHaveBeenCalled();
  });

  it("creates a presentation when the recipe is owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipe.findFirst.mockResolvedValueOnce({ id: 1 });
    mockPrisma.recipePresentation.create.mockResolvedValueOnce({
      id: 10,
      name: "Docena",
      unitsPerBatch: 12,
      salePrice: 30,
    });

    const res = await buildApp().request("/api/recipes/1/presentations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Docena", unitsPerBatch: 12, salePrice: 30 }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; recipeId: number; salePrice: number };
    expect(body.id).toBe(10);
    expect(body.recipeId).toBe(1);
    expect(body.salePrice).toBe(30);
  });

  it("returns 400 on invalid body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipe.findFirst.mockResolvedValueOnce({ id: 1 });

    const res = await buildApp().request("/api/recipes/1/presentations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ unitsPerBatch: 12 }),
    });
    expect(res.status).toBe(400);
  });
});

describe("presentationsUpdateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockPrisma.recipePresentation.findFirst.mockReset();
    mockPrisma.recipePresentation.update.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the presentation is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.recipePresentation.update).not.toHaveBeenCalled();
  });

  it("updates a presentation when owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce({ id: 10 });
    mockPrisma.recipePresentation.update.mockResolvedValueOnce({
      id: 10,
      name: "Docena mod",
      unitsPerBatch: 12,
      salePrice: 30,
    });

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Docena mod" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.recipePresentation.update).toHaveBeenCalled();
  });

  it("returns 400 when the body has no fields", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce({ id: 10 });

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});

describe("presentationsDeleteHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockPrisma.recipePresentation.findFirst.mockReset();
    mockPrisma.recipePresentation.delete.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "DELETE",
    });
    expect(res.status).toBe(401);
  });

  it("returns 404 when the presentation is not owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    expect(mockPrisma.recipePresentation.delete).not.toHaveBeenCalled();
  });

  it("deletes a presentation when owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockPrisma.recipePresentation.findFirst.mockResolvedValueOnce({ id: 10 });
    mockPrisma.recipePresentation.delete.mockResolvedValueOnce({ id: 10 });

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(mockPrisma.recipePresentation.delete).toHaveBeenCalledWith({
      where: { id: 10 },
    });
  });
});

