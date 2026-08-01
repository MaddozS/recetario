import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockGetCredentialAccount } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockGetCredentialAccount = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  return { mockGetSession, mockAuth, mockGetCredentialAccount };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  getCredentialAccount: (userId: string) => mockGetCredentialAccount(userId),
}));

const { credentialStatusHandler } = await import("./credential-status");

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
    mockGetCredentialAccount.mockReset();
  });

  it("returns 401 when there is no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/auth/credential-status");
    expect(res.status).toBe(401);
    expect(mockGetCredentialAccount).not.toHaveBeenCalled();
  });

  it("returns hasPasswordAuth: true when a credential account exists", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetCredentialAccount.mockResolvedValueOnce({ id: "a1" });

    const res = await buildApp().request("/api/auth/credential-status");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hasPasswordAuth: true });
    expect(mockGetCredentialAccount).toHaveBeenCalledWith("user-1");
  });

  it("returns hasPasswordAuth: false when no credential account exists", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetCredentialAccount.mockResolvedValueOnce(null);

    const res = await buildApp().request("/api/auth/credential-status");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hasPasswordAuth: false });
  });
});
