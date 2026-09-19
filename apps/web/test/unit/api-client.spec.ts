import { describe, expect, it, vi } from "vitest";
import { apiFetch, csrfHeaderFor } from "../../app/utils/api-client";
import { ApiError } from "../../app/utils/api-error";

describe("csrfHeaderFor", () => {
  it("añade el token en mutaciones", () => {
    expect(csrfHeaderFor("POST", "abc")).toEqual({ "x-csrf-token": "abc" });
    expect(csrfHeaderFor("PUT", "abc")).toEqual({ "x-csrf-token": "abc" });
    expect(csrfHeaderFor("PATCH", "abc")).toEqual({ "x-csrf-token": "abc" });
    expect(csrfHeaderFor("DELETE", "abc")).toEqual({ "x-csrf-token": "abc" });
  });

  it("no añade nada en lecturas ni sin token", () => {
    expect(csrfHeaderFor("GET", "abc")).toEqual({});
    expect(csrfHeaderFor("POST", null)).toEqual({});
    expect(csrfHeaderFor("POST", "")).toEqual({});
  });
});

describe("apiFetch", () => {
  it("devuelve el JSON validado por el schema", async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true }));
    const schema = { parse: (value: unknown) => value as { ok: boolean } };

    await expect(
      apiFetch(fetchImpl, "/api/health", { schema: schema as never }),
    ).resolves.toEqual({ ok: true });
  });

  it("manda JSON y content-type en mutaciones", async () => {
    const fetchImpl = vi.fn(async () => undefined);

    await apiFetch(fetchImpl, "/api/preferences", {
      method: "PUT",
      body: { theme: "dark" },
      headers: { "x-csrf-token": "abc" },
    });

    const [path, init] = fetchImpl.mock.calls[0] as [
      string,
      { method: string; headers: Record<string, string>; body?: string },
    ];
    expect(path).toBe("/api/preferences");
    expect(init.method).toBe("PUT");
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.headers["x-csrf-token"]).toBe("abc");
    expect(init.body).toBe(JSON.stringify({ theme: "dark" }));
  });

  it("manda JSON vacío en mutaciones sin body", async () => {
    const fetchImpl = vi.fn(async () => undefined);

    await apiFetch(fetchImpl, "/api/auth/sign-out", { method: "POST" });

    const [, init] = fetchImpl.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body?: string },
    ];
    // Better Auth responde 415 si el body llega sin `content-type`.
    expect(init.headers["content-type"]).toBe("application/json");
    expect(init.body).toBe("{}");
  });

  it("no manda body ni content-type en GET", async () => {
    const fetchImpl = vi.fn(async () => null);

    await apiFetch(fetchImpl, "/api/recipes");

    const [, init] = fetchImpl.mock.calls[0] as [
      string,
      { headers: Record<string, string>; body?: string },
    ];
    expect(init.body).toBeUndefined();
    expect(init.headers["content-type"]).toBeUndefined();
  });

  it("traduce un FetchError con envelope al ApiError tipado", async () => {
    const fetchImpl = vi.fn(async () => {
      throw {
        status: 403,
        data: {
          error: {
            code: "PLAN_LIMIT",
            message: "Límite alcanzado",
            reason: "recipe_limit",
          },
        },
      };
    });

    await expect(apiFetch(fetchImpl, "/api/recipes", { method: "POST" })).rejects.toMatchObject(
      {
        name: "ApiError",
        code: "PLAN_LIMIT",
        message: "Límite alcanzado",
        reason: "recipe_limit",
        status: 403,
      },
    );
  });

  it("normaliza a INTERNAL un error sin envelope", async () => {
    const fetchImpl = vi.fn(async () => {
      throw { status: 500, data: "<html>boom</html>" };
    });

    const error = await apiFetch(fetchImpl, "/api/recipes").catch((err: unknown) => err);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("INTERNAL");
    expect((error as ApiError).status).toBe(500);
    expect((error as ApiError).traceId).toMatch(/^web-/);
  });

  it("propaga errores sin status (fallo de red)", async () => {
    const networkError = new Error("fetch failed");
    const fetchImpl = vi.fn(async () => {
      throw networkError;
    });

    await expect(apiFetch(fetchImpl, "/api/recipes")).rejects.toBe(networkError);
  });
});
