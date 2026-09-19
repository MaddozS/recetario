import { describe, expect, it } from "vitest";
import {
  ACCENT_FAMILIES,
  ACCENT_LABELS,
  ACCENT_SHADES,
  getAccentCssVars,
  getAccentPreviewColor,
} from "../../app/utils/accent-colors";

/**
 * Fondos de página de cada tema (`--tw-bg` en `tokens.css`): claro `#f8fafc` y
 * oscuro `oklch(0.176 0.008 258)`.
 */
const THEME_BACKGROUND = { light: "#f8fafc", dark: "#0f1114" } as const;

const luminance = (hex: string): number => {
  const [r, g, b] = [1, 3, 5].map((index) => {
    const channel = parseInt(hex.slice(index, index + 2), 16) / 255;
    return channel <= 0.04045
      ? channel / 12.92
      : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** Contraste WCAG entre dos colores (el que mide axe en el barrido de a11y). */
const contrast = (a: string, b: string): number => {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
};

/** Valor hex de una custom property emitida, p. ej. `--aw-accent-solid-hover`. */
const shadeOf = (css: string, name: string): string =>
  css.match(new RegExp(`--aw-accent-${name}:(#[0-9a-f]{6})`))?.[1] ?? "";

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

  it("genera las custom properties de cada shade en light, más el relleno sólido", () => {
    for (const family of ACCENT_FAMILIES) {
      const css = getAccentCssVars(family, "light");
      expect(css.split(";")).toHaveLength(ACCENT_SHADES.length * 2 + 6);
      for (const shade of ACCENT_SHADES) {
        expect(css).toContain(`--aw-accent-${shade}:`);
        expect(css).toContain(`--color-accent-${shade}:`);
      }
      expect(css).toContain("--color-accent-solid:");
    }
  });

  it("en light usa el shade base de la familia", () => {
    expect(getAccentCssVars("coral", "light")).toContain(
      "--aw-accent-50:#fef2f1",
    );
    expect(getAccentCssVars("coral", "light")).toContain(
      "--aw-accent-600:#e84f4f",
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

  it("mantiene el relleno del coral igual en claro y oscuro", () => {
    // El mapa oscuro aclaraba el 700 al 400: el botón pasaba de coral con texto
    // blanco a salmón con texto casi negro, es decir otra marca.
    for (const theme of ["light", "dark"]) {
      const css = getAccentCssVars("coral", theme);
      expect(css).toContain("--aw-accent-solid:#c94445");
      expect(css).toContain("--aw-accent-solid-hover:#b33b3c");
    }
  });

  it("en oscuro sube del 700 al 600 sólo si el 700 no despega del fondo", () => {
    for (const family of ACCENT_FAMILIES) {
      const lightCss = getAccentCssVars(family, "light");
      const darkCss = getAccentCssVars(family, "dark");
      const family700 = shadeOf(lightCss, "700");
      const family600 = shadeOf(lightCss, "600");
      const solidLight = shadeOf(lightCss, "solid");
      const solidDark = shadeOf(darkCss, "solid");

      expect(solidLight, family).toBe(family700);
      expect(solidDark, family).toBe(
        contrast(family700, THEME_BACKGROUND.dark) >= 3 ? family700 : family600,
      );
      expect(
        contrast(solidDark, THEME_BACKGROUND.dark),
        `${family} relleno/fondo`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        contrast(solidLight, THEME_BACKGROUND.light),
        `${family} relleno/fondo claro`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it("sostiene la etiqueta blanca sobre el relleno en las 7 familias y ambos temas", () => {
    for (const family of ACCENT_FAMILIES) {
      for (const theme of ["light", "dark"] as const) {
        const css = getAccentCssVars(family, theme);

        expect(css, `${family} ${theme}`).toContain(
          "--tw-text-on-accent:#ffffff",
        );
        expect(
          contrast("#ffffff", shadeOf(css, "solid")),
          `${family} ${theme} relleno`,
        ).toBeGreaterThanOrEqual(4.5);
        expect(
          contrast("#ffffff", shadeOf(css, "solid-hover")),
          `${family} ${theme} hover`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("deja la rampa intacta: la tinta y el tinte conservan su par en oscuro", () => {
    // El override de paridad pisaba el rol de tinta y dejaba `text-accent-800`
    // en #b33b3c sobre el tinte #6b1f20 (1.95:1 medido con axe).
    const darkCss = getAccentCssVars("coral", "dark");
    const ink = shadeOf(darkCss, "800");
    const tint = shadeOf(darkCss, "50");

    expect(ink).toBe("#faa7a1");
    expect(shadeOf(darkCss, "700")).toBe("#f97f7a");
    expect(tint).toBe("#6b1f20");
    expect(contrast(ink, tint), "tinta sobre tinte").toBeGreaterThanOrEqual(
      4.5,
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
