/**
 * Unidades de medida de ingredientes (vocabulario heredado del baseline).
 *
 * Viven en `shared/` porque las consumen ingredientes y recetas: los módulos
 * puros las importan por `#shared/utils/units`, que resuelve tanto Nuxt como el
 * proyecto `unit` de Vitest.
 */
export const UNIT_OPTIONS = [
  'kg',
  'g',
  'lt',
  'ml',
  'pza',
  'pieza',
  'cdita',
  'cda',
  'taza',
] as const;

export type UnitOption = (typeof UNIT_OPTIONS)[number];

/** Unidad por defecto para los selects de unidad. */
export const DEFAULT_UNIT: UnitOption = UNIT_OPTIONS[0];
