/**
 * Definiciones de colores de acento y funciones para generar CSS variables.
 *
 * Cada familia de acento define sus tonos en hex para los shades 50-700 (light)
 * y también 950-300 para el mapeo en dark mode. Las funciones exportadas
 * generan el bloque de CSS custom properties que se aplica al :root o <html>.
 */

export const ACCENT_FAMILIES = [
  "indigo",
  "violet",
  "blue",
  "emerald",
  "rose",
  "amber",
  "coral",
] as const;

export type AccentFamily = (typeof ACCENT_FAMILIES)[number];

export const ACCENT_SHADES = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  // Sólo lo usa el hover de las acciones con texto: en light necesita un tono
  // más oscuro que el 700 para mantener AA con `text-on-accent`.
  "800",
] as const;

export type AccentShade = (typeof ACCENT_SHADES)[number];

/** Shades que define cada familia: los 8 de la UI más los profundos del dark. */
type AccentBaseShade = AccentShade | "800" | "900" | "950";

/** Tonos base de cada familia (light mode usa 50-700 directamente). */
const accentBaseColors: Record<
  AccentFamily,
  Record<AccentBaseShade, string>
> = {
  indigo: {
    "50": "#eef2ff",
    "100": "#e0e7ff",
    "200": "#c7d2fe",
    "300": "#a5b4fc",
    "400": "#818cf8",
    "500": "#6366f1",
    "600": "#4f46e5",
    "700": "#4338ca",
    "800": "#3730a3",
    "900": "#312e81",
    "950": "#1e1b4b",
  },
  violet: {
    "50": "#f5f3ff",
    "100": "#ede9fe",
    "200": "#ddd6fe",
    "300": "#c4b5fd",
    "400": "#a78bfa",
    "500": "#8b5cf6",
    "600": "#7c3aed",
    "700": "#6d28d9",
    "800": "#5b21b6",
    "900": "#4c1d95",
    "950": "#2e1065",
  },
  blue: {
    "50": "#eff6ff",
    "100": "#dbeafe",
    "200": "#bfdbfe",
    "300": "#93c5fd",
    "400": "#60a5fa",
    "500": "#3b82f6",
    "600": "#2563eb",
    "700": "#1d4ed8",
    "800": "#1e40af",
    "900": "#1e3a8a",
    "950": "#172554",
  },
  emerald: {
    "50": "#ecfdf5",
    "100": "#d1fae5",
    "200": "#a7f3d0",
    "300": "#6ee7b7",
    "400": "#34d399",
    "500": "#10b981",
    "600": "#059669",
    "700": "#047857",
    "800": "#065f46",
    "900": "#064e3b",
    "950": "#022c22",
  },
  rose: {
    "50": "#fff1f2",
    "100": "#ffe4e6",
    "200": "#fecdd3",
    "300": "#fda4af",
    "400": "#fb7185",
    "500": "#f43f5e",
    "600": "#e11d48",
    "700": "#be123c",
    "800": "#9f1239",
    "900": "#881337",
    "950": "#4c0519",
  },
  amber: {
    "50": "#fffbeb",
    "100": "#fef3c7",
    "200": "#fde68a",
    "300": "#fcd34d",
    "400": "#fbbf24",
    "500": "#f59e0b",
    "600": "#d97706",
    "700": "#b45309",
    "800": "#92400e",
    "900": "#78350f",
    "950": "#451a03",
  },
  // Rampa reconstruida en OKLCH a un único tono (H 24): los tints iban a H 34
  // (melocotón) y los vívidos a H 19 (rosa), así que el mismo acento cambiaba
  // de familia de color dentro de la escala. El chroma de 400/500 queda
  // recortado al 92% del máximo del gamut: antes tocaban el borde y el clip
  // empujaba el 500 al rosa.
  coral: {
    "50": "#fef2f1",
    "100": "#fddfdc",
    "200": "#fcc4bf",
    "300": "#faa7a1",
    "400": "#f97f7a",
    "500": "#f86865",
    "600": "#e84f4f",
    "700": "#c94445",
    "800": "#b33b3c",
    "900": "#962f30",
    "950": "#6b1f20",
  },
};

/**
 * Mapeo de shade en light mode → shade a usar en dark mode.
 * En dark mode se usan tonos más profundos y saturados para evitar
 * el aspecto pastel/deslavado. Los tonos base (50-300) se oscurecen
 * para fondos, mientras que los tonos de acción (400-700) apuntan
 * a los shades vibrantes en lugar de los claros.
 *   accent-50  → shade-950 (fondo muy oscuro)
 *   accent-100 → shade-900
 *   accent-200 → shade-800
 *   accent-300 → shade-700
 *   accent-400 → shade-600 (decoración, más rico)
 *   accent-500 → shade-600 (focus, más rico)
 *   accent-600 → shade-500 (botones, vibrante)
 *   accent-700 → shade-400 (hover, más claro que el botón)
 */
const darkShadeMap: Record<AccentShade, AccentBaseShade> = {
  "50": "950",
  "100": "900",
  "200": "800",
  "300": "700",
  "400": "600",
  "500": "600",
  "600": "500",
  "700": "400",
  // Hover de acciones en dark: aclara en vez de oscurecer.
  "800": "300",
};

/** Texto sobre el relleno de acción: blanco en los dos temas (ver `solidShades`). */
const ON_ACCENT = "#ffffff";

/**
 * Relleno de acción por familia y tema: botón primario, ítem activo y banda CTA.
 *
 * El claro usa siempre el 700 (etiqueta blanca entre 4.78:1 y 7.90:1). El oscuro
 * arranca en ese mismo 700 para que el acento no cambie de tono al cambiar de
 * tema, y sólo sube al 600 cuando el 700 no llega a 3:1 contra el fondo oscuro
 * (`oklch(0.176 0.008 258)` ≈ `#0f1114`), donde el relleno se confundiría con la
 * página: indigo 2.39:1, violet 2.66:1 y blue 2.82:1. Con el 600 quedan en
 * 3.01–3.66:1 y la etiqueta sigue en blanco (5.17–7.90:1).
 *
 * La rampa 50…950 no interviene: sirve tinta, tinte, borde y decoración y sigue
 * el `darkShadeMap`. La regla está medida en `test/unit/accent-colors.spec.ts`.
 */
const solidShades: Record<
  AccentFamily,
  { light: AccentBaseShade; dark: AccentBaseShade }
> = {
  indigo: { light: "700", dark: "600" },
  violet: { light: "700", dark: "600" },
  blue: { light: "700", dark: "600" },
  emerald: { light: "700", dark: "700" },
  rose: { light: "700", dark: "700" },
  amber: { light: "700", dark: "700" },
  coral: { light: "700", dark: "700" },
};

/**
 * Hover del relleno: un paso más profundo, como en claro (600 → 700, 700 → 800).
 * Mantiene la etiqueta blanca por encima de AA en las 7 familias.
 */
const solidHoverShades: Partial<Record<AccentBaseShade, AccentBaseShade>> = {
  "600": "700",
  "700": "800",
};

/**
 * Rol de **texto** del acento: la tinta con la que el acento escribe sobre
 * superficies neutras (`bg-background`, `bg-muted`, `bg-card` y los lavados de
 * degradado). En claro usa el 800 de la familia; en oscuro, el tono al que ese
 * 800 mapea (el 300), que ya superaba AA.
 *
 * El 600 no sirve como texto en claro: 3.54:1 sobre `bg-background` con coral
 * (axe `serious` en el navbar activo) y 3.02:1 sobre el lavado del eyebrow. Para
 * iconos y decoración no aplica: ahí el umbral es 3:1 y la rampa sigue valiendo.
 * La regla está medida en `test/unit/accent-colors.spec.ts`.
 */
const TEXT_SHADE: AccentShade = "800";

/**
 * Genera un string de CSS custom properties para un color de acento y tema dados.
 * Ejemplo de salida: "--aw-accent-50:#eef2ff;--aw-accent-100:#e0e7ff;..."
 */
export function getAccentCssVars(accent: string, theme: string): string {
  const family = ACCENT_FAMILIES.includes(accent as AccentFamily)
    ? (accent as AccentFamily)
    : "indigo";
  const isDark = theme === "dark";
  const colors = accentBaseColors[family];

  const vars = ACCENT_SHADES.flatMap((shade) => {
    const value = colors[isDark ? darkShadeMap[shade] : shade];
    return [
      `--aw-accent-${shade}:${value}`,
      `--color-accent-${shade}:${value}`,
    ];
  });

  const solidShade = isDark
    ? solidShades[family].dark
    : solidShades[family].light;
  const solid = colors[solidShade];
  const solidHover = colors[solidHoverShades[solidShade] ?? solidShade];
  const text = colors[isDark ? darkShadeMap[TEXT_SHADE] : TEXT_SHADE];

  vars.push(
    `--aw-accent-solid:${solid}`,
    `--color-accent-solid:${solid}`,
    `--aw-accent-solid-hover:${solidHover}`,
    `--color-accent-solid-hover:${solidHover}`,
    `--aw-accent-text:${text}`,
    `--color-accent-text:${text}`,
    `--tw-text-on-accent:${ON_ACCENT}`,
    `--color-text-on-accent:${ON_ACCENT}`,
  );

  return vars.join(";");
}

/**
 * Devuelve el color base (shade 600) para usar como vista previa en la UI de settings.
 */
export function getAccentPreviewColor(accent: AccentFamily): string {
  return accentBaseColors[accent]["600"];
}

/**
 * Devuelve los nombres en español de las familias de acento.
 */
export const ACCENT_LABELS: Record<AccentFamily, string> = {
  indigo: "Índigo",
  violet: "Violeta",
  blue: "Azul",
  emerald: "Esmeralda",
  rose: "Rosa",
  amber: "Ámbar",
  coral: "Coral",
};
