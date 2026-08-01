import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockGetUserPreferences, mockCreateUserPreferences } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockGetUserPreferences = vi.fn();
  const mockCreateUserPreferences = vi.fn();
  return { mockGetSession, mockAuth, mockGetUserPreferences, mockCreateUserPreferences };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getUserPreferences: (userId: string) => mockGetUserPreferences(userId),
  createUserPreferences: (userId: string, prefs: unknown) =>
    mockCreateUserPreferences(userId, prefs),
}));

const { preferencesGetHandler } = await import("./get");

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
    mockCreateUserPreferences.mockReset();
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
    mockCreateUserPreferences.mockResolvedValueOnce({
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
    expect(mockCreateUserPreferences).toHaveBeenCalledTimes(1);
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
    expect(mockCreateUserPreferences).not.toHaveBeenCalled();
  });
});
