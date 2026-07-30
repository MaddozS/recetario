import { describe, it, expect } from "vitest";
import { Hono } from "hono";
import { envelope } from "./envelope";
import { errorHandler } from "./error-handler";
import { ApiError } from "./errors";
import { createTestEnv } from "./test-utils/index";

describe("envelope middleware", () => {
  it("passes through 2xx responses", async () => {
    const app = new Hono();
    app.use("*", envelope());
    app.get("/ok", (c) => c.json({ ok: true }));

    const res = await app.request("/ok", {}, createTestEnv() as unknown as Record<string, unknown>);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("transforms Hono default 404 to ApiErrorResponse", async () => {
    const app = new Hono();
    app.use("*", envelope());
    app.get("/exists", (c) => c.body(null, 200));

    const res = await app.request("/nonexistent", {}, createTestEnv() as unknown as Record<string, unknown>);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "NOT_FOUND", message: "Not found" } });
  });

  it("leaves existing JSON error responses unchanged", async () => {
    const app = new Hono();
    app.use("*", envelope());
    app.get("/json-error", (c) =>
      c.json({ error: { code: "NOT_FOUND", message: "custom" } }, 404 as never),
    );

    const res = await app.request("/json-error", {}, createTestEnv() as unknown as Record<string, unknown>);
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "NOT_FOUND", message: "custom" } });
  });
});

describe("errorHandler", () => {
  it("wraps ApiError into ApiErrorResponse", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.get("/secret", () => { throw new ApiError("FORBIDDEN", "Not allowed"); });

    const res = await app.request("/secret", {}, createTestEnv() as unknown as Record<string, unknown>);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "FORBIDDEN", message: "Not allowed" } });
  });

  it("wraps unknown errors as 500 INTERNAL", async () => {
    const app = new Hono();
    app.onError(errorHandler());
    app.get("/crash", () => { throw new Error("db failure"); });

    const res = await app.request("/crash", {}, createTestEnv() as unknown as Record<string, unknown>);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "INTERNAL", message: "Internal server error" } });
  });
});
