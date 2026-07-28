import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockListRecipeSummaries = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: { api: { getSession: (args: unknown) => mockGetSession(args) } },
}));

vi.mock("@recetario/db", () => ({
  listRecipeSummaries: (ownerId: string) => mockListRecipeSummaries(ownerId),
}));

const { recipesListHandler } = await import("./list.js");

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
    mockListRecipeSummaries.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/recipes");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockListRecipeSummaries).not.toHaveBeenCalled();
  });

  it("returns the recipe list scoped to the session user", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockListRecipeSummaries.mockResolvedValueOnce([
      { id: 1, name: "Tarta", category: "Postres", ingredientCount: 3, updatedAt: null },
      { id: 2, name: "Pan", category: null, ingredientCount: 0, updatedAt: null },
    ]);

    const res = await buildApp().request("/api/recipes", {
      headers: { cookie: "session=abc" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Array<{ id: number; name: string }>;
    expect(body).toHaveLength(2);
    expect(body[0].name).toBe("Tarta");
    expect(mockListRecipeSummaries).toHaveBeenCalledWith("user-1");
  });
});
