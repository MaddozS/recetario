import { formatCurrency } from "@recetario/stripe/formatters";

/**
 * Formato de presentación del planificador.
 *
 * Puerto de los helpers del `<ProductionCalculations>` del baseline
 * (`formatQty`, `smartQty`, etiquetas y tono del margen). Módulo puro:
 * cubierto en `test/unit`.
 */

export { formatCurrency };

export function formatQty(value: number): string {
  if (value < 1) return value.toFixed(3);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(2);
}

/** g/ml ≥ 1000 se muestran como kg/lt. */
export function smartQty(value: number, unit: string): string {
  const normalized = unit.toLowerCase();
  if ((normalized === "g" || normalized === "ml") && value >= 1000) {
    return `${formatQty(value / 1000)} ${normalized === "g" ? "kg" : "lt"}`;
  }
  return `${formatQty(value)} ${unit}`;
}

export function formatUnitCost(value: number, unit: string): string {
  return `${formatCurrency(value)}/${unit}`;
}

/** Cantidad de una receta fuente dentro del pill de un insumo. */
export function formatSourceQuantity(value: number): string {
  if (value < 1) return value.toFixed(2);
  if (Number.isInteger(value)) return String(value);
  return value.toFixed(1);
}

export function recipeCountLabel(count: number): string {
  return `${count} receta${count !== 1 ? "s" : ""}`;
}

export function batchesCountLabel(count: number): string {
  return `${count} mezcla${count !== 1 ? "s" : ""}`;
}

export function ingredientsCountLabel(count: number): string {
  return `${count} insumo${count !== 1 ? "s" : ""} en total`;
}

/** Contador de la toolbar de resultados: «2 recetas · 3 mezclas». */
export function selectionCountLabel(
  recipeCount: number,
  batches: number,
): string {
  return `${recipeCountLabel(recipeCount)} · ${batchesCountLabel(batches)}`;
}

export function marginText(margin: number): string {
  return `${margin.toFixed(1)}%`;
}

/** Tono del margen, con los mismos cortes que el baseline (30 / 15). */
export function marginTone(margin: number): string {
  if (margin > 30) return "text-success";
  if (margin > 15) return "text-warning";
  return "text-danger";
}
