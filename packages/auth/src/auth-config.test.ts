import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { captured, mockLogAuditEvent } = vi.hoisted(() => ({
  captured: { options: null as Record<string, any> | null },
  mockLogAuditEvent: vi.fn(),
}));

vi.mock("better-auth", () => ({
  betterAuth: (options: Record<string, unknown>) => {
    captured.options = options;
    return { api: { getSession: vi.fn() }, handler: vi.fn() };
  },
}));

vi.mock("better-auth/adapters/prisma", () => ({
  prismaAdapter: vi.fn(() => ({})),
}));

vi.mock("./email", () => ({ sendEmail: vi.fn() }));

vi.mock("@recetario/db", () => ({
  prisma: {},
  logAuditEvent: mockLogAuditEvent,
}));

const { createAuth } = await import("./auth");
const { recordSignInAudit } = await import("./session-audit");

describe("createAuth configuration", () => {
  beforeEach(() => {
    captured.options = null;
    mockLogAuditEvent.mockReset();
    vi.stubEnv("GOOGLE_CLIENT_ID", "test-google-id");
    vi.stubEnv("GOOGLE_CLIENT_SECRET", "test-google-secret");
    vi.stubEnv("WEB_ORIGIN", "https://app.kitchcalc.com");
    vi.stubEnv("BETTER_AUTH_URL", "https://api.kitchcalc.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("trusts the web and api origins", () => {
    createAuth();

    expect(captured.options?.trustedOrigins).toEqual([
      "https://api.kitchcalc.com",
      "https://app.kitchcalc.com",
    ]);
  });

  it("records every new session as a sign-in", async () => {
    createAuth();

    const hook = captured.options?.databaseHooks?.session?.create?.after;
    expect(hook).toBe(recordSignInAudit);

    await hook({ userId: "user-1" }, null);
    expect(mockLogAuditEvent).toHaveBeenCalledWith({
      userId: "user-1",
      action: "sign_in",
      ipAddress: null,
      userAgent: null,
    });
  });
});
