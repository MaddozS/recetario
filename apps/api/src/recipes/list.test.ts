import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockGetRecipeSummaries } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetRecipeSummaries = vi.fn();
  return { mockGetSession, mockAuth, mockGetRecipeSummaries };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getRecipeSummaries: (ownerId: string) => mockGetRecipeSummaries(ownerId),
}));

const { recipesListHandler } = await import("./list");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/recipes", recipesListHandler());
  return app;
}

describe("recipesListHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetRecipeSummaries.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockGetRecipeSummaries).not.toHaveBeenCalled();
  });

  it("returns the recipe list scoped to the session user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetRecipeSummaries.mockResolvedValueOnce([
      {
        id: 1,
        name: "Tarta",
        category: "Postres",
        updatedAt: new Date("2026-01-01T00:00:00Z"),
        recipeIngredients: [{ id: 1 }, { id: 2 }, { id: 3 }],
      },
      {
        id: 2,
        name: "Pan",
        category: null,
        updatedAt: null,
        recipeIngredients: [],
      },
    ]);

    const res = await buildApp().request("/api/recipes", {
      headers: { cookie: "session=abc" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number; name: string; ingredientCount: number }>;
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Tarta");
    expect(body[0].ingredientCount).toBe(3);
    expect(mockGetRecipeSummaries).toHaveBeenCalledWith("user-1");
  });
});
