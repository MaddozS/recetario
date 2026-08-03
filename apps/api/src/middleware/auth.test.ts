import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { requireAuth, getAuthUser, type AuthVariables } from "./auth";

const { mockGetSession, mockAuth } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = {
    api: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
  };
  return { mockGetSession, mockAuth };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

const sessionFixture = {
  user: { id: "user-123", email: "chef@example.com", name: "Chef" },
  session: { id: "session-456", userId: "user-123" },
};

function buildTestApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.onError(errorHandler());
  app.use("*", envelope());

  app.use("/api/protected/*", requireAuth());

  app.get("/api/protected/profile", (c) => {
    const user = c.get("user");
    return c.json({ ok: true, user });
  });

  app.get("/api/helper/profile", async (c) => {
    const user = await getAuthUser(c);
    return c.json({ ok: true, user });
  });

  return app;
}

describe("requireAuth middleware", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("returns 401 UNAUTHENTICATED when session is missing", async () => {
    mockGetSession.mockResolvedValueOnce(null);

    const res = await buildTestApp().request("/api/protected/profile");
    expect(res.status).toBe(401);

    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.message).toBe("Authentication required");
  });

  it("allows access and sets context user when session is valid", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);

    const res = await buildTestApp().request("/api/protected/profile", {
      headers: { cookie: "better-auth.session_token=abc" },
    });
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean; user: { id: string; email: string } };
    expect(body.ok).toBe(true);
    expect(body.user.id).toBe("user-123");
    expect(body.user.email).toBe("chef@example.com");
  });

  it("getAuthUser fallback returns user when middleware was not pre-executed", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);

    const res = await buildTestApp().request("/api/helper/profile");
    expect(res.status).toBe(200);

    const body = (await res.json()) as { ok: boolean; user: { id: string } };
    expect(body.user.id).toBe("user-123");
  });
});
