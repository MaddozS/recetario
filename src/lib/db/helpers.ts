import type { RecipePresentation } from "./types";

export function normalizeOptionalText(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export const toNumber = (value: unknown) => Number(value ?? 0);

export const toFiniteNumber = (value: unknown, fallback = 0) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
};

export const roundToTwoDecimals = (value: number) =>
  Math.round(value * 100) / 100;

export const normalizeDesiredMargin = (value: unknown) =>
  Math.min(99.99, Math.max(0, roundToTwoDecimals(toFiniteNumber(value))));

export const normalizeFixedCostsPercentage = (value: unknown) =>
  Math.max(0, roundToTwoDecimals(toFiniteNumber(value)));

export const normalizeRecipeComment = (value: unknown) =>
  normalizeOptionalText(value) ?? null;

export function normalizeCategory(value: unknown): string | null {
  return normalizeOptionalText(value) ?? null;
}

export function normalizePresentationName(value: unknown): string {
  const name = normalizeOptionalText(value);
  if (!name) {
    throw new Error("Invalid presentation name");
  }
  return name;
}

export function normalizePresentationUnits(value: unknown): number {
  const unitsPerBatch = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(unitsPerBatch) || unitsPerBatch <= 0) {
    throw new Error("Invalid presentation units");
  }
  return unitsPerBatch;
}

export function normalizePresentationSalePrice(value: unknown): number {
  const salePrice = toFiniteNumber(value, Number.NaN);
  if (!Number.isFinite(salePrice) || salePrice < 0) {
    throw new Error("Invalid presentation sale price");
  }
  return roundToTwoDecimals(salePrice);
}

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
