import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockUpsertUserPreferences } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockUpsertUserPreferences = vi.fn();
  return { mockGetSession, mockAuth, mockUpsertUserPreferences };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  prisma: {},
  upsertUserPreferences: (userId: string, prefs: unknown) =>
    mockUpsertUserPreferences(userId, prefs),
}));

const { preferencesUpdateHandler } = await import("./update");

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
    mockUpsertUserPreferences.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await putJson("user-prefs-2", { theme: "dark" });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(mockUpsertUserPreferences).not.toHaveBeenCalled();
  });

  it("returns 400 on non-JSON body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/preferences", {
      method: "PUT",
      headers: { cookie: "session=user-prefs-2", "content-type": "text/plain" },
      body: "not-json",
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 400 on invalid payload shape", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await putJson("user-prefs-2", { theme: "invalid-theme" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string; issues: unknown } };
    expect(body.error.code).toBe("VALIDATION_ERROR");
    expect((body.error.issues as unknown[]).length).toBeGreaterThan(0);
    expect(mockUpsertUserPreferences).not.toHaveBeenCalled();
  });

  it("upserts user preferences on valid body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockUpsertUserPreferences.mockResolvedValueOnce({
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
    expect(mockUpsertUserPreferences).toHaveBeenCalledTimes(1);
  });
});
