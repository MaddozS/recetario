import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockGetUserPreferences, mockUserPreferencesCreate } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetUserPreferences = vi.fn();
  const mockUserPreferencesCreate = vi.fn();
  return { mockGetSession, mockAuth, mockGetUserPreferences, mockUserPreferencesCreate };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => ({
    userPreferences: {
      create: (args: unknown) => mockUserPreferencesCreate(args),
    },
  }),
  getUserPreferences: (userId: string, db: unknown) =>
    mockGetUserPreferences(userId, db),
}));

const { preferencesGetHandler } = await import("./get.js");

function buildApp(): Hono {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/preferences", preferencesGetHandler());
  return app;
}

function sessionFor(userId: string) {
  return {
    user: { id: userId, email: "ada@example.com", name: "Ada", image: null },
    session: { id: "sess-1", userId, token: "tok" },
  };
}

async function getAs(userId: string): Promise<Response> {
  return buildApp().request("/api/preferences", {
    headers: { cookie: `session=${userId}` },
  });
}

describe("preferencesGetHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetUserPreferences.mockReset();
    mockUserPreferencesCreate.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await getAs("anon");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockGetUserPreferences).not.toHaveBeenCalled();
  });

  it("creates defaults on first GET and returns them", async () => {
    const userId = `user-defaults-${Date.now()}`;
    mockGetSession.mockResolvedValueOnce(sessionFor(userId));
    mockGetUserPreferences.mockResolvedValueOnce(null);
    mockUserPreferencesCreate.mockResolvedValueOnce({
      userId,
      theme: "system",
      accentColor: "coral",
    });

    const res = await getAs(userId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      userId: string;
      theme: string;
      accentColor: string;
    };
    expect(body.userId).toBe(userId);
    expect(body.theme).toBe("system");
    expect(body.accentColor).toBe("coral");
    expect(mockGetUserPreferences).toHaveBeenCalledTimes(1);
    expect(mockUserPreferencesCreate).toHaveBeenCalledTimes(1);
  });

  it("returns existing preferences without creating a row", async () => {
    const userId = `user-existing-${Date.now()}`;
    mockGetSession.mockResolvedValueOnce(sessionFor(userId));
    mockGetUserPreferences.mockResolvedValueOnce({
      userId,
      theme: "dark",
      accentColor: "violet",
    });

    const res = await getAs(userId);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      theme: string;
      accentColor: string;
    };
    expect(body.theme).toBe("dark");
    expect(body.accentColor).toBe("violet");
    expect(mockUserPreferencesCreate).not.toHaveBeenCalled();
  });
});
