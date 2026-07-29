import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope.js";
import { errorHandler } from "../error-handler.js";

const { mockGetSession, mockAuth, mockPrisma, mockAccountFindFirst } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAccountFindFirst = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  const mockPrisma = {
    account: { findFirst: mockAccountFindFirst },
  };
  return {
    mockGetSession,
    mockAuth,
    mockPrisma,
    mockAccountFindFirst,
  };
});

vi.mock("@recetario/auth/server", () => ({
  createAuth: () => mockAuth,
}));

vi.mock("@recetario/db", () => ({
  createPrismaClient: () => mockPrisma,
}));

const { credentialStatusHandler } = await import("./credential-status.js");

const sessionFixture = {
  user: { id: "user-1", email: "u@x.com" },
  session: { id: "sess-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.get("/api/auth/credential-status", credentialStatusHandler());
  return app;
}

describe("credentialStatusHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockAccountFindFirst.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/auth/credential-status");
    expect(res.status).toBe(401);
    expect(mockAccountFindFirst).not.toHaveBeenCalled();
  });

  it("returns hasPasswordAuth: true when a credential account exists", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockAccountFindFirst.mockResolvedValueOnce({ id: "a1" });

    const res = await buildApp().request("/api/auth/credential-status");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hasPasswordAuth: true });
    expect(mockAccountFindFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", providerId: "credential" },
      select: { id: true },
    });
  });

  it("returns hasPasswordAuth: false when no credential account exists", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockAccountFindFirst.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/auth/credential-status");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hasPasswordAuth: false });
  });
});
