import { describe, expect, it } from "vitest";
import {
  ACCENT_COOKIE,
  DEFAULT_ACCENT,
  DEFAULT_THEME,
  SIDEBAR_COOKIE,
  THEME_COOKIE,
  isDarkTheme,
  resolveAccent,
  resolveTheme,
} from "../../shared/utils/preferences";

describe("cookies de presentación", () => {
  it("conserva los nombres de cookie del producto", () => {
    expect(THEME_COOKIE).toBe("kitchcalc-theme");
    expect(ACCENT_COOKIE).toBe("kitchcalc-accent");
    expect(SIDEBAR_COOKIE).toBe("kitchcalc-sidebar-collapsed");
  });

  it("usa system + coral por defecto", () => {
    expect(DEFAULT_THEME).toBe("system");
    expect(DEFAULT_ACCENT).toBe("coral");
  });
});

describe("resolveTheme", () => {
  it("acepta los valores válidos de la cookie", () => {
    expect(resolveTheme("light")).toBe("light");
    expect(resolveTheme("dark")).toBe("dark");
    expect(resolveTheme("system")).toBe("system");
  });

  it("cae al fallback de la sesión cuando la cookie no sirve", () => {
    expect(resolveTheme(undefined, "dark")).toBe("dark");
    expect(resolveTheme("chartreuse", "dark")).toBe("dark");
    expect(resolveTheme(null, "neón")).toBe("system");
  });

  it("cae a system sin cookie ni sesión", () => {
    expect(resolveTheme(undefined)).toBe("system");
    expect(resolveTheme("")).toBe("system");
  });
});

describe("resolveAccent", () => {
  it("acepta las 7 familias", () => {
    for (const accent of [
      "indigo",
      "violet",
      "blue",
      "emerald",
      "rose",
      "amber",
      "coral",
    ]) {
      expect(resolveAccent(accent)).toBe(accent);
    }
  });

  it("cae al fallback o a coral", () => {
    expect(resolveAccent("turquesa", "emerald")).toBe("emerald");
    expect(resolveAccent("turquesa", "turquesa")).toBe("coral");
    expect(resolveAccent(undefined)).toBe("coral");
  });
});

describe("isDarkTheme", () => {
  it("sólo `dark` o `system` con el sistema en oscuro", () => {
    expect(isDarkTheme("dark", false)).toBe(true);
    expect(isDarkTheme("dark", true)).toBe(true);
    expect(isDarkTheme("light", true)).toBe(false);
    expect(isDarkTheme("system", true)).toBe(true);
    expect(isDarkTheme("system", false)).toBe(false);
  });
});
