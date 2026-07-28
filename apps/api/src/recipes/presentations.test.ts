import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockFindFirstRecipe = vi.fn();
const mockFindManyPresentations = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: { api: { getSession: (args: unknown) => mockGetSession(args) } },
}));

vi.mock("@recetario/db", () => ({
  prisma: {
    recipe: {
      findFirst: (args: unknown) => mockFindFirstRecipe(args),
    },
    recipePresentation: {
      findMany: (args: unknown) => mockFindManyPresentations(args),
    },
  },
}));

const { presentationsListHandler } = await import("./presentations.js");

const sessionFixture = {
  user: { id: "user-1", email: "ada@example.com" },
  session: { id: "sess-1", userId: "user-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/recipes/:id/presentations", presentationsListHandler());
  return app;
}

describe("presentationsListHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockFindFirstRecipe.mockReset();
    mockFindManyPresentations.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes/1/presentations");
    expect(res.status).toBe(401);
  });

  it("returns the presentations for a recipe owned by the user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockFindFirstRecipe.mockResolvedValueOnce({ id: 1 });
    mockFindManyPresentations.mockResolvedValueOnce([
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
    mockFindFirstRecipe.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/recipes/42/presentations");
    expect(res.status).toBe(404);
    expect(mockFindManyPresentations).not.toHaveBeenCalled();
  });
});
