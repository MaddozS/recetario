import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";

const { mockGetSession, mockAuth, mockLogAuditEvent } = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockLogAuditEvent = vi.fn();
  const mockAuth = { api: { getSession: (...args: unknown[]) => mockGetSession(...args) } };
  return { mockGetSession, mockAuth, mockLogAuditEvent };
});

vi.mock("@recetario/auth/server", () => ({
  auth: mockAuth,
}));

vi.mock("@recetario/db", () => ({
  logAuditEvent: (params: unknown) => mockLogAuditEvent(params),
}));

const { auditLogHandler } = await import("./log");

const sessionFixture = {
  user: { id: "user-1", email: "u@x.com" },
  session: { id: "sess-1" },
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.post("/api/audit/log", auditLogHandler());
  return app;
}

describe("auditLogHandler", () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockLogAuditEvent.mockReset();
  });

  it("returns 401 when no session", async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request("/api/audit/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign_in" }),
    });
    expect(res.status).toBe(401);
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it("writes the audit log row on a valid body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockLogAuditEvent.mockResolvedValueOnce(undefined);

    const res = await buildApp().request("/api/audit/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign_in", userAgent: "jest" }),
    });
    expect(res.status).toBe(200);
    expect(mockLogAuditEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: "user-1",
        action: "sign_in",
        userAgent: "jest",
      }),
    );
  });

  it("returns 400 on invalid body", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    const res = await buildApp().request("/api/audit/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    expect(mockLogAuditEvent).not.toHaveBeenCalled();
  });

  it("returns 200 even if the audit log insert throws (best-effort)", async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockLogAuditEvent.mockRejectedValueOnce(new Error("db down"));
    const res = await buildApp().request("/api/audit/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign_in" }),
    });
    expect(res.status).toBe(200);
  });
});
