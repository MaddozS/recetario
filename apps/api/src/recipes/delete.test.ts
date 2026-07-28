import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockDeleteRecipe = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: { api: { getSession: (args: unknown) => mockGetSession(args) } },
}));

vi.mock("@recetario/db", () => ({
  deleteRecipe: (id: number, ownerId: string) =>
    mockDeleteRecipe(id, ownerId),
}));

const { recipesDeleteHandler } = await import("./delete.js");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.delete("/api/recipes/:id", recipesDeleteHandler());
  return app;
}

describe("recipesDeleteHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockDeleteRecipe.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1", { method: "DELETE" });
    expect(res.status).toBe(401);
    expect(mockDeleteRecipe).not.toHaveBeenCalled();
  });

  it("deletes the recipe and returns 204", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockDeleteRecipe.mockResolvedValueOnce({ status: "deleted" });

    const res = await buildApp().request("/api/recipes/1", { method: "DELETE" });
    expect(res.status).toBe(204);
    expect(mockDeleteRecipe).toHaveBeenCalledWith(1, "user-1");
  });

  it("returns 404 when the recipe does not belong to the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockDeleteRecipe.mockResolvedValueOnce({ status: "not-found" });

    const res = await buildApp().request("/api/recipes/42", { method: "DELETE" });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("NOT_FOUND");
  });
});
