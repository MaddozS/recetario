import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { z } from "zod";
import { ApiError, apiFetch, setApiBinding } from "./api-client.js";

const ENV_KEY = "INTERNAL_API_URL";

function makeRequest(cookie?: string): Request {
  const headers = new Headers();
  if (cookie) headers.set("cookie", cookie);
  return new Request("https://example.com/", { headers });
}

function jsonResponse(
  status: number,
  body: unknown,
  headers: HeadersInit = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function makeBinding(
  impl: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>,
) {
  return { fetch: vi.fn(impl) };
}

beforeEach(() => {
  setApiBinding(undefined);
  vi.unstubAllEnvs();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("apiFetch — 2xx", () => {
  it("returns the parsed body without a schema", async () => {
    const binding = makeBinding(async () =>
      jsonResponse(200, { ok: true, n: 1 }),
    );
    setApiBinding(binding);

    const data = await apiFetch<{ ok: boolean; n: number }>(
      "/api/x",
      {},
      makeRequest("sid=abc"),
    );
    expect(data).toEqual({ ok: true, n: 1 });
    expect(binding.fetch).toHaveBeenCalledWith("/api/x", expect.any(Object));
  });

  it("validates the body with a Zod schema when provided", async () => {
    const binding = makeBinding(async () =>
      jsonResponse(200, { name: "Tarta", count: 3 }),
    );
    setApiBinding(binding);

    const schema = z.object({ name: z.string(), count: z.number() });
    const data = await apiFetch("/api/x", { schema }, makeRequest());
    expect(data).toEqual({ name: "Tarta", count: 3 });
  });

  it("throws a ZodError when the schema rejects the body", async () => {
    const binding = makeBinding(async () =>
      jsonResponse(200, { wrong: "shape" }),
    );
    setApiBinding(binding);

    const schema = z.object({ name: z.string() });
    await expect(
      apiFetch("/api/x", { schema }, makeRequest()),
    ).rejects.toThrow();
  });
});

describe("apiFetch — non-2xx", () => {
  it("throws ApiError with code UNAUTHENTICATED on 401", async () => {
    setApiBinding(
      makeBinding(async () =>
        jsonResponse(401, {
          error: { code: "UNAUTHENTICATED", message: "login" },
        }),
      ),
    );

    await expect(apiFetch("/api/x", {}, makeRequest())).rejects.toMatchObject({
      name: "ApiError",
      code: "UNAUTHENTICATED",
      status: 401,
      message: "login",
    });
  });

  it("throws ApiError carrying Zod issues on 422", async () => {
    const issues = [{ path: ["name"], message: "Required" }];
    setApiBinding(
      makeBinding(async () =>
        jsonResponse(422, {
          error: { code: "VALIDATION_ERROR", message: "bad", issues },
        }),
      ),
    );

    try {
      await apiFetch("/api/x", {}, makeRequest());
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.code).toBe("VALIDATION_ERROR");
      expect(e.issues).toEqual(issues);
      expect(e.status).toBe(422);
    }
  });

  it("throws ApiError INTERNAL with traceId when the envelope doesn't match", async () => {
    setApiBinding(
      makeBinding(async () => jsonResponse(500, { not: "an envelope" })),
    );

    try {
      await apiFetch("/api/x", {}, makeRequest());
      throw new Error("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const e = err as ApiError;
      expect(e.code).toBe("INTERNAL");
      expect(e.status).toBe(500);
      expect(e.traceId).toMatch(/^web-/);
    }
  });

  it("uses the traceId from the envelope when present", async () => {
    setApiBinding(
      makeBinding(async () =>
        jsonResponse(500, {
          error: { code: "INTERNAL", message: "boom", traceId: "srv-xyz" },
        }),
      ),
    );

    try {
      await apiFetch("/api/x", {}, makeRequest());
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as ApiError).traceId).toBe("srv-xyz");
    }
  });

  it("includes DOMAIN_ERROR reason on the ApiError", async () => {
    setApiBinding(
      makeBinding(async () =>
        jsonResponse(409, {
          error: {
            code: "DOMAIN_ERROR",
            message: "blocked",
            reason: "ingredient_in_use",
          },
        }),
      ),
    );

    try {
      await apiFetch("/api/x", {}, makeRequest());
      throw new Error("should have thrown");
    } catch (err) {
      expect((err as ApiError).reason).toBe("ingredient_in_use");
    }
  });
});

describe("apiFetch — cookie forwarding", () => {
  it("forwards the cookie header to the binding fetch", async () => {
    const binding = makeBinding(async () => jsonResponse(200, {}));
    setApiBinding(binding);

    await apiFetch("/api/x", {}, makeRequest("session=abc; csrf=xyz"));
    const init = binding.fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.cookie).toBe("session=abc; csrf=xyz");
  });

  it("omits the cookie header when none is set on the request", async () => {
    const binding = makeBinding(async () => jsonResponse(200, {}));
    setApiBinding(binding);

    await apiFetch("/api/x", {}, makeRequest());
    const init = binding.fetch.mock.calls[0]?.[1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.cookie).toBeUndefined();
  });
});

describe("apiFetch — dev fallback (INTERNAL_API_URL)", () => {
  it("hits INTERNAL_API_URL when no binding is set", async () => {
    vi.stubEnv(ENV_KEY, "http://api.local:8787");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(jsonResponse(200, { ok: 1 }));

    const data = await apiFetch<{ ok: number }>("/api/x", {}, makeRequest());
    expect(data).toEqual({ ok: 1 });
    expect(fetchSpy).toHaveBeenCalledWith(
      "http://api.local:8787/api/x",
      expect.any(Object),
    );
  });

  it("throws when no binding and no INTERNAL_API_URL are set", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    await expect(apiFetch("/api/x", {}, makeRequest())).rejects.toThrow(
      /INTERNAL_API_URL/,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe("apiFetch — body and method", () => {
  it("serializes body and sets content-type for POST", async () => {
    const binding = makeBinding(async () => jsonResponse(200, {}));
    setApiBinding(binding);

    await apiFetch("/api/x", { method: "POST", body: { a: 1 } }, makeRequest());
    const init = binding.fetch.mock.calls[0]?.[1] as RequestInit;
    expect(init.method).toBe("POST");
    expect(init.body).toBe(JSON.stringify({ a: 1 }));
    const headers = init.headers as Record<string, string>;
    expect(headers["content-type"]).toBe("application/json");
  });
});
