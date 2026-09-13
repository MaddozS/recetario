import { describe, expect, it } from "vitest";
import {
  ACCENT_FAMILIES,
  ACCENT_LABELS,
  ACCENT_SHADES,
  getAccentCssVars,
  getAccentPreviewColor,
} from "../../app/utils/accent-colors";

describe("accent-colors", () => {
  it("declara las 7 familias de acento", () => {
    expect(ACCENT_FAMILIES).toEqual([
      "indigo",
      "violet",
      "blue",
      "emerald",
      "rose",
      "amber",
      "coral",
    ]);
  });

  it("genera las dos custom properties de cada shade en light", () => {
    for (const family of ACCENT_FAMILIES) {
      const css = getAccentCssVars(family, "light");
      expect(css.split(";")).toHaveLength(ACCENT_SHADES.length * 2);
      for (const shade of ACCENT_SHADES) {
        expect(css).toContain(`--aw-accent-${shade}:`);
        expect(css).toContain(`--color-accent-${shade}:`);
      }
    }
  });

  it("en light usa el shade base de la familia", () => {
    expect(getAccentCssVars("coral", "light")).toContain(
      "--aw-accent-50:#fef2ef",
    );
    expect(getAccentCssVars("coral", "light")).toContain(
      "--aw-accent-600:#e84d5a",
    );
  });

  it("en dark mapea a los shades profundos", () => {
    // 50 → 950, 600 → 500, 700 → 400, 800 → 300
    const css = getAccentCssVars("indigo", "dark");
    expect(css).toContain("--aw-accent-50:#1e1b4b");
    expect(css).toContain("--aw-accent-600:#6366f1");
    expect(css).toContain("--aw-accent-700:#818cf8");
    expect(css).toContain("--aw-accent-800:#a5b4fc");
  });

  it("expone el shade 800 de acción (hover del botón primario)", () => {
    // En light es el único tono que sostiene AA con `text-on-accent` en hover;
    // en dark, el mapeo aclara para que el hover se note con texto oscuro.
    expect(getAccentCssVars("coral", "light")).toContain(
      "--aw-accent-800:#b33a46",
    );
    expect(getAccentCssVars("coral", "dark")).toContain(
      "--aw-accent-800:#faa898",
    );
  });

  it("trata `system` como light y sólo `dark` activa el mapeo oscuro", () => {
    expect(getAccentCssVars("blue", "system")).toBe(
      getAccentCssVars("blue", "light"),
    );
    expect(getAccentCssVars("blue", "system")).not.toBe(
      getAccentCssVars("blue", "dark"),
    );
  });

  it("cae a indigo cuando la familia no existe", () => {
    expect(getAccentCssVars("chartreuse", "light")).toBe(
      getAccentCssVars("indigo", "light"),
    );
    expect(getAccentCssVars("", "dark")).toBe(
      getAccentCssVars("indigo", "dark"),
    );
  });

  it("devuelve el shade 600 como color de preview", () => {
    expect(getAccentPreviewColor("emerald")).toBe("#059669");
    expect(getAccentPreviewColor("amber")).toBe("#d97706");
    for (const family of ACCENT_FAMILIES) {
      expect(getAccentPreviewColor(family)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("etiqueta las 7 familias en español", () => {
    expect(Object.keys(ACCENT_LABELS).sort()).toEqual(
      [...ACCENT_FAMILIES].sort(),
    );
    expect(ACCENT_LABELS.indigo).toBe("Índigo");
    expect(ACCENT_LABELS.coral).toBe("Coral");
  });
});
