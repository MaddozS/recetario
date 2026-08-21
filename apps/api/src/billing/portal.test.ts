import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { envelope } from "../envelope";
import { errorHandler } from "../error-handler";
import { hostAllowlist } from "../host-allowlist";
import type { AuthVariables } from "../middleware/auth";

const { mockValidateCsrf, mockGetStripeCustomerId, mockCreatePortalSession } =
  vi.hoisted(() => ({
    mockValidateCsrf: vi.fn(),
    mockGetStripeCustomerId: vi.fn(),
    mockCreatePortalSession: vi.fn(),
  }));

vi.mock("@recetario/auth/server", () => ({
  validateCsrf: mockValidateCsrf,
}));

vi.mock("@recetario/db", () => ({
  getStripeCustomerId: mockGetStripeCustomerId,
}));

vi.mock("@recetario/stripe/server", () => ({
  createPortalSession: mockCreatePortalSession,
}));

const { stripePortalHandler } = await import("./portal");

const mockUser = {
  id: "user_123",
  email: "test@recetario.io",
};

function buildApp() {
  const app = new Hono<{ Variables: AuthVariables }>();
  app.onError(errorHandler());
  app.use("*", envelope());
  app.use("*", hostAllowlist());
  app.use("*", async (c, next) => {
    c.set("user", mockUser as any);
    c.set("session", { id: "sess_1" } as any);
    await next();
  });
  app.post("/api/stripe/portal", stripePortalHandler());
  return app;
}

describe("stripePortalHandler", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mockValidateCsrf.mockReturnValue(true);
  });

  it("returns 403 when CSRF validation fails", async () => {
    mockValidateCsrf.mockReturnValue(false);
    const res = await buildApp().request(
      "/api/stripe/portal",
      { method: "POST" },
      {},
    );
    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.error).toBe("CSRF validation failed");
  });

  it("returns 404 if no customer ID is associated with the user", async () => {
    mockGetStripeCustomerId.mockResolvedValueOnce(null);
    const res = await buildApp().request(
      "/api/stripe/portal",
      { method: "POST" },
      {},
    );
    expect(res.status).toBe(404);
    const data = (await res.json()) as any;
    expect(data.error).toBe("No subscription found");
  });

  it("returns portal URL when customer exists", async () => {
    mockGetStripeCustomerId.mockResolvedValueOnce("cus_test789");
    mockCreatePortalSession.mockResolvedValueOnce({
      url: "https://billing.stripe.com/p/session/test",
    });

    const res = await buildApp().request(
      "/api/stripe/portal",
      { method: "POST" },
      {},
    );

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      url: "https://billing.stripe.com/p/session/test",
    });
    expect(mockCreatePortalSession).toHaveBeenCalledWith(
      "cus_test789",
      "http://localhost/settings?tab=billing",
    );
  });
});
