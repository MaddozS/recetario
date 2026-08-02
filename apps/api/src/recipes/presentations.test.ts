import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const {
  mockGetSession,
  mockAuth,
  mockGetPresentationsByRecipeId,
  mockCreatePresentation,
  mockUpdatePresentation,
  mockDeletePresentation,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetPresentationsByRecipeId = vi.fn();
  const mockCreatePresentation = vi.fn();
  const mockUpdatePresentation = vi.fn();
  const mockDeletePresentation = vi.fn();
  return {
    mockGetSession,
    mockAuth,
    mockGetPresentationsByRecipeId,
    mockCreatePresentation,
    mockUpdatePresentation,
    mockDeletePresentation,
  };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getPresentationsByRecipeId: (recipeId: number, ownerId: string) =>
    mockGetPresentationsByRecipeId(recipeId, ownerId),
  createPresentation: (recipeId: number, ownerId: string, input: unknown) =>
    mockCreatePresentation(recipeId, ownerId, input),
  updatePresentation: (pid: number, recipeId: number, ownerId: string, input: unknown) =>
    mockUpdatePresentation(pid, recipeId, ownerId, input),
  deletePresentation: (recipeId: number, pid: number, ownerId: string) =>
    mockDeletePresentation(recipeId, pid, ownerId),
}));

const {
  presentationsListHandler,
  presentationsCreateHandler,
  presentationsUpdateHandler,
  presentationsDeleteHandler,
} = await import("./presentations");

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
    mockGetPresentationsByRecipeId.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/presentations");
    expect(res.status).toBe(401);
  });

  it("returns the presentations for a recipe owned by the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetPresentationsByRecipeId.mockResolvedValueOnce([
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
    mockGetPresentationsByRecipeId.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42/presentations");
    expect(res.status).toBe(404);
    expect(mockGetPresentationsByRecipeId).toHaveBeenCalledWith(42, "user-1");
  });
});

describe("presentationsCreateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockCreatePresentation.mockReset();
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
    mockCreatePresentation.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42/presentations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Docena", unitsPerBatch: 12 }),
    });
    expect(res.status).toBe(404);
    expect(mockCreatePresentation).toHaveBeenCalled();
  });

  it("creates a presentation when the recipe is owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockCreatePresentation.mockResolvedValueOnce({
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
    mockUpdatePresentation.mockReset();
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
    mockUpdatePresentation.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "X" }),
    });
    expect(res.status).toBe(404);
    expect(mockUpdatePresentation).toHaveBeenCalled();
  });

  it("updates a presentation when owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockUpdatePresentation.mockResolvedValueOnce({
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
    expect(mockUpdatePresentation).toHaveBeenCalledWith(
      10,
      1,
      "user-1",
      { name: "Docena mod" },
    );
  });

  it("returns 400 when the body has no fields", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);

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
    mockDeletePresentation.mockReset();
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
    mockDeletePresentation.mockResolvedValueOnce({ status: "not-found" });

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "DELETE",
    });
    expect(res.status).toBe(404);
    expect(mockDeletePresentation).toHaveBeenCalledWith(1, 10, "user-1");
  });

  it("deletes a presentation when owned", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockDeletePresentation.mockResolvedValueOnce({ status: "deleted" });

    const res = await buildApp().request("/api/recipes/1/presentations/10", {
      method: "DELETE",
    });
    expect(res.status).toBe(204);
    expect(mockDeletePresentation).toHaveBeenCalledWith(1, 10, "user-1");
  });
});
