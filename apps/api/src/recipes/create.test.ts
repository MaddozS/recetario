import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockCreateRecipe } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockCreateRecipe = vi.fn();
  return { mockGetSession, mockAuth, mockCreateRecipe };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  prisma: {},
  createRecipe: (ownerId: string, input: unknown) =>
    mockCreateRecipe(ownerId, input),
}));

const { recipesCreateHandler } = await import("./create.js");

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

describe("recipesCreateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockCreateRecipe.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes", { method: "POST" });
    expect(res.status).toBe(401);
    expect(mockCreateRecipe).not.toHaveBeenCalled();
  });

  it("creates a recipe with the given name and scopes to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockCreateRecipe.mockResolvedValueOnce({ id: 99, name: "Tarta" });

    const res = await buildApp().request("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "Tarta" }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { id: number; name: string };
    expect(body.id).toBe(99);
    expect(mockCreateRecipe).toHaveBeenCalledWith("user-1", { name: "Tarta" });
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
    mockCreateRecipe.mockResolvedValueOnce({ id: 1, name: "Nueva Receta" });

    const res = await buildApp().request("/api/recipes", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    expect(mockCreateRecipe).toHaveBeenCalledWith("user-1", {});
  });
});
