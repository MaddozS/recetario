/**
 * Unidades de medida disponibles para ingredientes.
 *
 * Usado en los `<select>` de unidad en formularios de creación
 * y edición tanto en la página de ingredientes como en recetas.
 */
export const UNIT_OPTIONS = [
  "kg",
  "g",
  "lt",
  "ml",
  "pza",
  "pieza",
  "cdita",
  "cda",
  "taza",
] as const;

/** Unidad por defecto para selects de unidad. */
export const DEFAULT_UNIT = UNIT_OPTIONS[0]; // "kg"
