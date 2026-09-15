/**
 * Unidades de medida de ingredientes (vocabulario heredado de
 * `src/lib/constants.ts` del árbol Astro).
 *
 * Módulo puro y sin aliases (`#shared`/`~`) para poder cubrirlo en `test/unit`;
 * cuando recetas o producción necesiten la misma lista se promueve a `shared/`.
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

export type UnitOption = (typeof UNIT_OPTIONS)[number];

/** Unidad por defecto para los selects de unidad. */
export const DEFAULT_UNIT: UnitOption = UNIT_OPTIONS[0];
