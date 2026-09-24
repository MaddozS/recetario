import { describe, expect, it, vi } from "vitest";

type CsrfModule = typeof import("../../app/utils/csrf");

/**
 * El estado de single-flight vive en el módulo, así que cada test carga una
 * copia limpia (y así también se prueba el compartido entre instancias).
 */
async function loadCsrfModule(): Promise<CsrfModule> {
  vi.resetModules();
  return await import("../../app/utils/csrf");
}

function deferred(): { promise: Promise<void>; resolve: () => void } {
  let resolve: () => void = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe("createCsrfEnsurer", () => {
  it("no pide token cuando la cookie ya está", async () => {
    const { createCsrfEnsurer } = await loadCsrfModule();
    const refresh = vi.fn(async () => undefined);
    const ensureCsrfToken = createCsrfEnsurer({
      getToken: () => "a".repeat(64),
      refresh,
    });

    await expect(ensureCsrfToken()).resolves.toBeUndefined();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("renueva cuando falta el token y comparte una sola petición", async () => {
    const { createCsrfEnsurer } = await loadCsrfModule();
    const pending = deferred();
    let token: string | null = null;
    const refresh = vi.fn(async () => {
      await pending.promise;
      token = "b".repeat(64);
    });
    const ensureCsrfToken = createCsrfEnsurer({
      getToken: () => token,
      refresh,
    });

    const first = ensureCsrfToken();
    const second = ensureCsrfToken();
    expect(refresh).toHaveBeenCalledTimes(1);

    pending.resolve();
    await Promise.all([first, second]);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(token).toBe("b".repeat(64));
  });

  it("comparte la renovación entre instancias de la misma página", async () => {
    const { createCsrfEnsurer } = await loadCsrfModule();
    const pending = deferred();
    let token: string | null = null;
    const refresh = vi.fn(async () => {
      await pending.promise;
      token = "c".repeat(64);
    });
    const first = createCsrfEnsurer({ getToken: () => token, refresh });
    const second = createCsrfEnsurer({ getToken: () => token, refresh });

    const requests = [first(), second()];
    expect(refresh).toHaveBeenCalledTimes(1);

    pending.resolve();
    await Promise.all(requests);

    expect(refresh).toHaveBeenCalledTimes(1);
    expect(token).toBe("c".repeat(64));
  });

  it("propaga el fallo y permite reintentar en la siguiente mutación", async () => {
    const { createCsrfEnsurer } = await loadCsrfModule();
    const refresh = vi
      .fn<() => Promise<unknown>>()
      .mockRejectedValueOnce(new Error("sin red"))
      .mockResolvedValueOnce(undefined);
    const ensureCsrfToken = createCsrfEnsurer({
      getToken: () => null,
      refresh,
    });

    await expect(ensureCsrfToken()).rejects.toThrow("sin red");
    await expect(ensureCsrfToken()).resolves.toBeUndefined();
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
