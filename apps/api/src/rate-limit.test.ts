import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { rateLimit } from "./rate-limit";
import { envelope } from "./envelope";
import { errorHandler } from "./error-handler";
import { set } from "./cache";

function makeEnv(): Record<string, unknown> {
  return {};
}

describe("rateLimit middleware", () => {
  function appWithRateLimit(): Hono {
    const app = new Hono();
    app.onError(errorHandler());
    app.use("*", envelope(), rateLimit());
    return app;
  }

  it("allows GET under limit (authenticated)", async () => {
    const app = appWithRateLimit();
    app.get("/test", (c) => c.json({ ok: true }));

    const uid = `rate-uid-1-${Date.now()}`;
    const res = await app.request(
      "/test",
      { headers: { "x-user-id": uid } },
      makeEnv(),
    );
    expect(res.status).toBe(200);
  });

  it("allows POST under limit (authenticated)", async () => {
    const app = appWithRateLimit();
    app.post("/test", (c) => c.json({ ok: true }));

    const uid = `rate-uid-2-${Date.now()}`;
    const res = await app.request(
      "/test",
      { method: "POST", headers: { "x-user-id": uid } },
      makeEnv(),
    );
    expect(res.status).toBe(200);
  });

  it("blocks authenticated writes after limit", async () => {
    const app = appWithRateLimit();
    app.post("/test", (c) => c.json({ ok: true }));

    const uid = `rate-uid-3-${Date.now()}`;
    for (let i = 0; i < 10; i++) {
      await app.request(
        "/test",
        { method: "POST", headers: { "x-user-id": uid } },
        makeEnv(),
      );
    }
    const res = await app.request(
      "/test",
      { method: "POST", headers: { "x-user-id": uid } },
      makeEnv(),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
  });

  it("serves stale for read overflow when stale key exists", async () => {
    const uid = `rate-uid-4-${Date.now()}`;
    set(`stale:ratelimit:user:${uid}:read`, { stale: "data" }, 60_000);

    const app = appWithRateLimit();
    app.get("/test", (c) => c.json({ fresh: true }));

    for (let i = 0; i < 60; i++) {
      await app.request(
        "/test",
        { headers: { "x-user-id": uid } },
        makeEnv(),
      );
    }
    const res = await app.request(
      "/test",
      { headers: { "x-user-id": uid } },
      makeEnv(),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("x-served-stale")).toBe("true");
    const body = await res.json();
    expect(body).toEqual({ stale: "data" });
  });

  it("blocks anonymous reads after limit (no stale)", async () => {
    const app = appWithRateLimit();
    app.get("/test", (c) => c.json({ ok: true }));

    for (let i = 0; i < 30; i++) {
      await app.request(
        "/test",
        {},
        makeEnv(),
      );
    }
    const res = await app.request(
      "/test",
      {},
      makeEnv(),
    );
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("60");
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("RATE_LIMITED");
  });
});
