import { describe, expect, it } from "vitest";
import {
  getSafeRedirect,
  queryEmail,
  queryString,
  safeCallbackPath,
} from "../../app/features/auth/auth-redirect";

describe("queryString", () => {
  it("colapsa arrays y descarta valores vacíos", () => {
    expect(queryString("abc")).toBe("abc");
    expect(queryString(["abc", "def"])).toBe("abc");
    expect(queryString(["", "def"])).toBe("def");
    expect(queryString([""])).toBeNull();
    expect(queryString("")).toBeNull();
    expect(queryString(undefined)).toBeNull();
    expect(queryString(42)).toBeNull();
  });
});

describe("getSafeRedirect", () => {
  it("acepta rutas locales con query", () => {
    expect(getSafeRedirect("/recipes")).toBe("/recipes");
    expect(getSafeRedirect("/recipes?category=pan")).toBe(
      "/recipes?category=pan",
    );
    expect(getSafeRedirect("/pricing")).toBe("/pricing");
  });

  it("cae a /recipes con destinos externos o vacíos", () => {
    for (const value of [
      "https://evil.example",
      "//evil.example",
      "/recipes:8080",
      "recipes",
      "",
      null,
      undefined,
      ["https://evil.example"],
      [undefined],
    ]) {
      expect(getSafeRedirect(value)).toBe("/recipes");
    }
  });
});

describe("safeCallbackPath", () => {
  it("acepta rutas locales distintas de la raíz", () => {
    expect(safeCallbackPath("/recipes")).toBe("/recipes");
    expect(safeCallbackPath("/settings?tab=billing")).toBe(
      "/settings?tab=billing",
    );
  });

  it("cae a /sign-in con la raíz, rutas externas o vacías", () => {
    for (const value of [
      "/",
      "https://evil.example",
      "//evil.example",
      "/a:b",
      "",
      null,
      [undefined],
    ]) {
      expect(safeCallbackPath(value)).toBe("/sign-in");
    }
  });
});

describe("queryEmail", () => {
  it("acepta emails de la query para prellenar el formulario", () => {
    expect(queryEmail("qa@example.com")).toBe("qa@example.com");
    expect(queryEmail(["qa@example.com", "otro@example.com"])).toBe(
      "qa@example.com",
    );
  });

  it("descarta lo que no tiene forma de email", () => {
    for (const value of ["", "basura", null, undefined, 42, [""]]) {
      expect(queryEmail(value)).toBeNull();
    }
  });
});
