import { describe, it, expect, vi, afterEach } from "vitest";
import {
  extractCsrfCookie,
  getTrustedOrigins,
  resolveRequestOrigin,
  validateCsrf,
} from "./csrf";

const TOKEN = "a".repeat(64);

function request(headers: Record<string, string>): Request {
  return new Request("http://api.local/api/recipes", { method: "POST", headers });
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("extractCsrfCookie", () => {
  it("reads the token from the cookie header", () => {
    expect(extractCsrfCookie(request({ cookie: `other=1; csrf_token=${TOKEN}` }))).toBe(TOKEN);
  });

  it("returns null when the cookie is absent", () => {
    expect(extractCsrfCookie(request({ cookie: "other=1" }))).toBeNull();
    expect(extractCsrfCookie(request({}))).toBeNull();
  });
});

describe("resolveRequestOrigin", () => {
  it("prefers the Origin header", () => {
    expect(
      resolveRequestOrigin(
        request({ origin: "https://app.example", referer: "https://other.example/x" }),
      ),
    ).toBe("https://app.example");
  });

  it("falls back to the Referer origin", () => {
    expect(
      resolveRequestOrigin(request({ referer: "https://app.example/settings?tab=billing" })),
    ).toBe("https://app.example");
  });

  it("returns null when neither header is present", () => {
    expect(resolveRequestOrigin(request({}))).toBeNull();
  });

  it("keeps the literal null origin so callers can reject it", () => {
    expect(resolveRequestOrigin(request({ origin: "null" }))).toBe("null");
  });

  it("returns null for a malformed referer", () => {
    expect(resolveRequestOrigin(request({ referer: "not-a-url" }))).toBeNull();
  });
});

describe("getTrustedOrigins", () => {
  it("uses WEB_ORIGIN and BETTER_AUTH_URL", () => {
    vi.stubEnv("WEB_ORIGIN", "https://app.kitchcalc.com");
    vi.stubEnv("BETTER_AUTH_URL", "https://api.kitchcalc.com");

    expect(getTrustedOrigins()).toEqual([
      "https://api.kitchcalc.com",
      "https://app.kitchcalc.com",
    ]);
  });

  it("defaults to the local dev origins", () => {
    vi.stubEnv("WEB_ORIGIN", undefined);
    vi.stubEnv("BETTER_AUTH_URL", undefined);

    expect(getTrustedOrigins()).toEqual([
      "http://localhost:8787",
      "http://localhost:4321",
    ]);
  });
});

describe("validateCsrf", () => {
  it("accepts a matching header token", () => {
    expect(
      validateCsrf(request({ cookie: `csrf_token=${TOKEN}`, "x-csrf-token": TOKEN })),
    ).toBe(true);
  });

  it("accepts a matching form field token", () => {
    const form = new FormData();
    form.append("_csrf", TOKEN);

    expect(validateCsrf(request({ cookie: `csrf_token=${TOKEN}` }), form)).toBe(true);
  });

  it("accepts the header even when a form is present", () => {
    const form = new FormData();
    form.append("_csrf", "different-token");

    expect(
      validateCsrf(request({ cookie: `csrf_token=${TOKEN}`, "x-csrf-token": TOKEN }), form),
    ).toBe(true);
  });

  it("rejects a mismatched header token", () => {
    expect(
      validateCsrf(request({ cookie: `csrf_token=${TOKEN}`, "x-csrf-token": "b".repeat(64) })),
    ).toBe(false);
  });

  it("rejects a token of a different length", () => {
    expect(
      validateCsrf(request({ cookie: `csrf_token=${TOKEN}`, "x-csrf-token": "short" })),
    ).toBe(false);
  });

  it("rejects a mismatched form field token", () => {
    const form = new FormData();
    form.append("_csrf", "different-token");

    expect(validateCsrf(request({ cookie: `csrf_token=${TOKEN}` }), form)).toBe(false);
  });

  it("rejects when the cookie is missing", () => {
    expect(
      validateCsrf(request({ "x-csrf-token": TOKEN })),
    ).toBe(false);
  });

  it("rejects when only the cookie is present", () => {
    expect(validateCsrf(request({ cookie: `csrf_token=${TOKEN}` }))).toBe(false);
  });
});
