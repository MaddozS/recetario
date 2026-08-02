import { describe, it, expect, vi, beforeAll } from "vitest";
import { createTestEnv } from "./test-utils/index";

vi.mock("@recetario/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn().mockResolvedValue(null),
      requestPasswordReset: vi.fn(),
      changeEmail: vi.fn(),
      changePassword: vi.fn(),
    },
    handler: vi.fn(),
  },
  rateLimitCheck: vi.fn().mockResolvedValue({ allowed: true, remaining: 10 }),
  validateCsrf: vi.fn().mockReturnValue(true),
  validatePassword: vi.fn().mockReturnValue({ valid: true, errors: [] }),
  validatePasswordResetToken: vi.fn().mockResolvedValue({ valid: false }),
  markTokenAsUsed: vi.fn(),
  getRemainingSeconds: vi.fn().mockResolvedValue(0),
  formatTime: vi.fn().mockReturnValue("0 min"),
  hashPassword: vi.fn(),
}));

vi.mock("@recetario/db", () => ({
  stripe: { customers: { create: vi.fn() }, checkout: { sessions: { create: vi.fn() } }, billingPortal: { sessions: { create: vi.fn() } }, webhooks: { constructEvent: vi.fn() } },
  seedSubscriptionPlans: vi.fn(),
  logAuditEvent: vi.fn(),
  updateAccountPassword: vi.fn(),
  updateUserName: vi.fn(),
}));

vi.mock("@recetario/billing/server", () => ({
  getPlanByStripePriceId: vi.fn(),
  getStripeCustomerId: vi.fn(),
  getUserSubscription: vi.fn(),
  createOrUpdateSubscription: vi.fn(),
  cancelSubscription: vi.fn(),
  markSubscriptionPastDue: vi.fn(),
}));

beforeAll(() => {
  process.env.DATABASE_URL = "postgres://test:test@localhost:5432/test";
  process.env.BETTER_AUTH_SECRET = "test-secret";
  process.env.BETTER_AUTH_URL = "http://localhost:4321";
  process.env.GOOGLE_CLIENT_ID = "test-google-id";
  process.env.GOOGLE_CLIENT_SECRET = "test-google-secret";
  process.env.PUBLIC_APP_URL = "http://localhost:4321";
  process.env.RECIPES_STATIC_OWNER_EMAIL = "owner@test.local";
  process.env.RECIPES_STATIC_OWNER_ID = "owner-test-id";
  process.env.RESEND_API_KEY = "test-resend";
  process.env.SENDER_EMAIL = "test@test.local";
  process.env.STRIPE_SECRET_KEY = "sk_test";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
});

describe("health endpoint", () => {
  it("returns 200 and ok body", async () => {
    const { default: app } = await import("./index");
    const res = await app.request(
      "/health",
      {},
      createTestEnv() as unknown as Record<string, unknown>,
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { ok: boolean; service: string };
    expect(body.ok).toBe(true);
    expect(body.service).toBe("recetario-api");
  });
});
