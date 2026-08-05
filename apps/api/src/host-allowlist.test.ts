import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { hostAllowlist } from "./host-allowlist";
import { envelope } from "./envelope";
import { errorHandler } from "./error-handler";

function makeEnv(overrides: Record<string, string | undefined> = {}): Record<string, unknown> {
  return { INTERNAL_API_HOST: "api.recetario.app", ...overrides };
}

describe("hostAllowlist middleware", () => {
  it("allows request when host matches INTERNAL_API_HOST", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.use("*", envelope(), hostAllowlist());
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request(
      "http://api.recetario.app/test",
      { headers: { Host: "api.recetario.app" } },
      makeEnv(),
    );
    expect(res.status).toBe(200);
  });

  it("blocks request when host does not match", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.use("*", envelope(), hostAllowlist());
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request(
      "http://evil.com/test",
      { headers: { Host: "evil.com" } },
      makeEnv(),
    );
    expect(res.status).toBe(403);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("FORBIDDEN");
  });

  it("allows request when Host header is absent (service binding)", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.use("*", envelope(), hostAllowlist());
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request(
      "http://internal/test",
      {},
      makeEnv(),
    );
    expect(res.status).toBe(200);
  });

  it("allows request when INTERNAL_API_HOST is not set", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.use("*", envelope(), hostAllowlist());
    app.get("/test", (c) => c.json({ ok: true }));

    const res = await app.request(
      "http://evil.com/test",
      { headers: { Host: "evil.com" } },
      { INTERNAL_API_HOST: undefined },
    );
    expect(res.status).toBe(200);
  });
});
