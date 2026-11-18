/**
 * Normalización de texto para búsquedas y filtros.
 *
 * Vive en `shared/` porque la usan ingredientes y recetas (y la necesitará
 * producción): una sola definición, sin duplicados por feature. La
 * descomposición NFD con `\p{Diacritic}`/rango combinante hace la búsqueda
 * accent-insensitive: "platano" encuentra "Plátano".
 */
export function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
