/**
 * Funciones puras de normalización y validación de datos.
 *
 * Estas utilidades no acceden a la base de datos ni tienen efectos
 * secundarios. Se usan tanto en la capa de conexión como en los
 * módulos CRUD para sanitizar inputs antes de escribir a la DB.
 */

import type { RecipePresentation } from "./types";

/**
 * Convierte un valor desconocido a `string | undefined`.
 * Retorna `undefined` si el valor no es string o está vacío tras trim.
 */
export function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

/**
 * Normaliza un email a minúsculas.
 * Útil para comparaciones case-insensitive de owner.
 */
export function normalizeEmail(value: unknown): string | undefined {
  const normalized = normalizeOptionalText(value);
  return normalized ? normalized.toLowerCase() : undefined;
}

/**
 * Valida que el ownerId no esté vacío; lanza error si lo está.
 * Usado como guard en todas las funciones que requieren scope de owner.
 */
export function requireOwnerId(ownerId: string): string {
  const normalized = normalizeOptionalText(ownerId);
  if (!normalized) {
    throw new Error("Missing recipe data owner");
  }
  return normalized;
}

/** Conversión segura de valor desconocido a número (0 como fallback). */
export const toNumber = (value: unknown) => Number(value ?? 0);

/**
 * Conversión a número finito con fallback explícito.
 * Si el resultado no es finito (NaN, Infinity), retorna el fallback.
 */
export const toFiniteNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

/** Redondea a dos decimales usando aritmética entera para evitar floating-point errors. */
export const roundToTwoDecimals = (value: number) => Math.round(value * 100) / 100;

/**
 * Normaliza el margen deseado (0% – 99.99%).
 * Valores negativos se truncan a 0, valores > 99.99 se truncan a 99.99.
 */
export const normalizeDesiredMargin = (value: unknown) =>
  Math.min(99.99, Math.max(0, roundToTwoDecimals(toFiniteNumber(value))));

/** Normaliza el porcentaje de costos fijos (mínimo 0%, sin tope superior). */
export const normalizeFixedCostsPercentage = (value: unknown) =>
  Math.max(0, roundToTwoDecimals(toFiniteNumber(value)));

/**
 * Normaliza un comentario de ingrediente en receta.
 * Retorna el texto limpio o `null` si está vacío.
 */
export const normalizeRecipeComment = (value: unknown) =>
  normalizeOptionalText(value) ?? null;

export function normalizeCategory(value: unknown): string | null {
  return normalizeOptionalText(value) ?? null;
}

/**
 * Valida y normaliza el nombre de una presentación.
 * Lanza error si el nombre está vacío.
 */
export function normalizePresentationName(value: unknown): string {
  const name = normalizeOptionalText(value);
  if (!name) {
    throw new Error("Invalid presentation name");
  }
  return name;
}

/**
 * Valida y normaliza las unidades por lote de una presentación.
 * Debe ser un número finito mayor a 0.
 */
export function normalizePresentationUnits(value: unknown): number {
  const unitsPerBatch = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(unitsPerBatch) || unitsPerBatch <= 0) {
    throw new Error("Invalid presentation units");
  }
  return unitsPerBatch;
}

/**
 * Valida y normaliza el precio de venta de una presentación.
 * Debe ser un número finito >= 0.
 */
export function normalizePresentationSalePrice(value: unknown): number {
  const salePrice = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    throw new Error("Invalid presentation sale price");
  }
  return roundToTwoDecimals(salePrice);
}

/**
 * Mapea un registro de BD (snake_case) a un objeto `RecipePresentation`.
 * Convierte los campos numéricos desde string/number a number.
 */
export function toRecipePresentation(record: {
  id: number | string;
  name: string;
  units_per_batch: number | string;
  sale_price: number | string | null;
}): RecipePresentation {
  return {
    id: Number(record.id),
    name: record.name,
    unitsPerBatch: toNumber(record.units_per_batch),
    salePrice:
      record.sale_price !== null ? toNumber(record.sale_price) : undefined,
  };
}
