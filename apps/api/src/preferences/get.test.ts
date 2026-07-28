import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const mockGetSession = vi.fn();
const mockUserPreferencesFindUnique = vi.fn();
const mockUserPreferencesCreate = vi.fn();

vi.mock("@recetario/auth/server", () => ({
  auth: {
    api: {
      getSession: (args: unknown) => mockGetSession(args),
    },
  },
}));

vi.mock("@recetario/db", () => ({
  prisma: {
    userPreferences: {
      findUnique: (args: unknown) => mockUserPreferencesFindUnique(args),
      create: (args: unknown) => mockUserPreferencesCreate(args),
    },
  },
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
    mockUserPreferencesFindUnique.mockReset();
    mockUserPreferencesCreate.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await getAs("anon");
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockUserPreferencesFindUnique).not.toHaveBeenCalled();
  });

  it("creates defaults on first GET and returns them", async () => {
    const userId = `user-defaults-${Date.now()}`;
    mockGetSession.mockResolvedValueOnce(sessionFor(userId));
    mockUserPreferencesFindUnique.mockResolvedValueOnce(null);
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
    expect(mockUserPreferencesFindUnique).toHaveBeenCalledTimes(1);
    expect(mockUserPreferencesCreate).toHaveBeenCalledTimes(1);
  });

  it("returns existing preferences without creating a row", async () => {
    const userId = `user-existing-${Date.now()}`;
    mockGetSession.mockResolvedValueOnce(sessionFor(userId));
    mockUserPreferencesFindUnique.mockResolvedValueOnce({
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
