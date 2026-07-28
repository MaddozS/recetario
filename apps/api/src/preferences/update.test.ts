import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";
import * as cache from "../cache.js";

const mockGetSession = vi.fn();
const mockUserPreferencesFindUnique = vi.fn();
const mockUserPreferencesUpsert = vi.fn();

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
      upsert: (args: unknown) => mockUserPreferencesUpsert(args),
    },
  },
}));

const { preferencesUpdateHandler } = await import("./update.js");

const sessionFixture = {
  user: {
    id: "user-prefs-2",
    email: "ada@example.com",
    name: "Ada",
    image: null,
  },
  session: { id: "sess-1", userId: "user-prefs-2", token: "tok" },
};

function buildApp(): Hono {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.put("/api/preferences", preferencesUpdateHandler());
  return app;
}

async function putJson(uid: string, body: unknown): Promise<Response> {
  return buildApp().request("/api/preferences", {
    method: "PUT",
    headers: {
      cookie: `session=${uid}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("preferencesUpdateHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockUserPreferencesFindUnique.mockReset();
    mockUserPreferencesUpsert.mockReset();
    cache.set(`prefs:user-prefs-2`, { stale: true }, 60_000);
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await putJson("user-prefs-2", { theme: "dark" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockUserPreferencesUpsert).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR with issues on invalid body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await putJson("user-prefs-2", { theme: "neon", accentColor: 42 });
    expect(res.status).toBe(400);
    const body = (await res.json()) as {
      error: { code: string; issues?: unknown[] };
    };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect(Array.isArray(body.error.issues)).toBe(true);
    expect((body.error.issues as unknown[]).length).toBeGreaterThan(0);
    expect(mockUserPreferencesUpsert).not.toHaveBeenCalled();
  });

  it("upserts and refreshes the cache on valid body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockUserPreferencesFindUnique.mockResolvedValueOnce(null);
    mockUserPreferencesUpsert.mockResolvedValueOnce({
      userId: "user-prefs-2",
      theme: "dark",
      accentColor: "indigo",
    });

    const res = await putJson("user-prefs-2", {
      theme: "dark",
      accentColor: "indigo",
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { theme: string; accentColor: string };
    expect(body.theme).toBe("dark");
    expect(body.accentColor).toBe("indigo");
    expect(mockUserPreferencesUpsert).toHaveBeenCalledTimes(1);

    const cached = cache.get<{ theme: string; accentColor: string }>(
      "prefs:user-prefs-2",
    );
    expect(cached).toBeDefined();
    expect(cached?.theme).toBe("dark");
    expect(cached?.accentColor).toBe("indigo");
  });

  it("merges partial updates with the existing row", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockUserPreferencesFindUnique.mockResolvedValueOnce({
      userId: "user-prefs-2",
      theme: "light",
      accentColor: "emerald",
    });
    mockUserPreferencesUpsert.mockResolvedValueOnce({
      userId: "user-prefs-2",
      theme: "light",
      accentColor: "rose",
    });

    const res = await putJson("user-prefs-2", { accentColor: "rose" });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { theme: string; accentColor: string };
    expect(body.theme).toBe("light");
    expect(body.accentColor).toBe("rose");
  });
});
