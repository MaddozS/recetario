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
] as const;

export type AccentShade = (typeof ACCENT_SHADES)[number];

/** Tonos base de cada familia (light mode usa 50-700 directamente). */
const accentBaseColors: Record<AccentFamily, Record<string, string>> = {
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
};

/**
 * Mapeo de shade en light mode → shade a usar en dark mode.
 * En dark mode se usan tonos más claros para mantener contraste.
 *   accent-50  → shade-950 (fondo muy oscuro)
 *   accent-100 → shade-900
 *   accent-200 → shade-800
 *   accent-300 → shade-700
 *   accent-400 → shade-500
 *   accent-500 → shade-400
 *   accent-600 → shade-400 (botones primarios, más claros en dark)
 *   accent-700 → shade-300 (texto primario, más claro en dark)
 */
const darkShadeMap: Record<string, string> = {
  "50": "950",
  "100": "900",
  "200": "800",
  "300": "700",
  "400": "500",
  "500": "400",
  "600": "400",
  "700": "300",
};

/**
 * Genera un string de CSS custom properties para un color de acento y tema dados.
 * Ejemplo de salida: "--aw-accent-50:#eef2ff;--aw-accent-100:#e0e7ff;..."
 */
export function getAccentCssVars(accent: string, theme: string): string {
  const family = ACCENT_FAMILIES.includes(accent as AccentFamily) ? (accent as AccentFamily) : "indigo";
  const isDark = theme === "dark";
  const colors = accentBaseColors[family];
  return ACCENT_SHADES.map((shade) => {
    const mappedShade = isDark ? darkShadeMap[shade] : shade;
    const value = colors[mappedShade] ?? colors[shade];
    return `--aw-accent-${shade}:${value}`;
  }).join(";");
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
};
