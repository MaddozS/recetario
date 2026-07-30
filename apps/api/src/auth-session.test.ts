import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "./envelope";
import { errorHandler } from "./error-handler";

const { mockGetSession, mockAuth } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  return { mockGetSession, mockAuth };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

const { authSessionHandler } = await import("./auth-session");

const sessionFixture = {
  user: {
    id: "user-1",
    email: "ada@example.com",
    name: "Ada Lovelace",
    image: null,
  },
  session: {
    id: "sess-1",
    userId: "user-1",
    token: "tok-1",
    expiresAt: new Date("2030-01-01T00:00:00Z"),
  },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/auth/session", authSessionHandler());
  return app;
}

describe("authSessionHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
  });

  it("returns the session when the cookie is valid", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request(
      "/api/auth/session",
      { headers: { cookie: "better-auth.session_token=valid" } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { id: string };
      session: { token: string };
    };
    expect(body.user.id).toBe("user-1");
    expect(body.session.token).toBe("tok-1");
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    const callArg = mockGetSession.mock.calls[0]?.[0] as { headers: Headers };
    expect(callArg.headers.get("cookie")).toBe("better-auth.session_token=valid");
  });

  it("returns null when no cookie is present", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/auth/session");
    expect(res.status).toBe(200);
    const body = (await res.json()) as null;
    expect(body).toBeNull();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it("returns null when the cookie is invalid or expired", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request(
      "/api/auth/session",
      { headers: { cookie: "better-auth.session_token=garbage" } },
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as null;
    expect(body).toBeNull();
  });

  it("returns a 500 ApiErrorResponse when getSession throws", async () => {
    mockGetSession.mockRejectedValueOnce(new Error("db down"));
    const res = await buildApp().request("/api/auth/session");
    expect(res.status).toBe(500);
    const body = (await res.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("INTERNAL");
    expect(body.error.message).toBe("Internal server error");
  });
});
