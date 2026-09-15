import type { CreateIngredientInput, Ingredient } from "@recetario/types";
import { DEFAULT_UNIT } from "./ingredient-units";

/**
 * Formulario de ingrediente en su forma de UI (todo strings) y su traducción al
 * contrato del API. Módulo puro y sin aliases: cubierto en `test/unit`.
 *
 * `price`/`purchaseQuantity` se mantienen como strings porque el usuario escribe
 * decimales con coma (locale es-MX) y el input no debe pelearse con el valor.
 */
export type IngredientFormValues = {
  name: string;
  supplier: string;
  brand: string;
  price: string;
  purchaseQuantity: string;
  unit: string;
};

type IngredientFormSource = Pick<
  Ingredient,
  "name" | "unit" | "price" | "purchaseQuantity"
> & {
  brand?: string | null;
  supplier?: string | null;
};

export function createEmptyIngredientForm(): IngredientFormValues {
  return {
    name: "",
    supplier: "",
    brand: "",
    price: "",
    purchaseQuantity: "1",
    unit: DEFAULT_UNIT,
  };
}

export function ingredientFormFrom(
  ingredient: IngredientFormSource,
): IngredientFormValues {
  return {
    name: ingredient.name,
    supplier: ingredient.supplier ?? "",
    brand: ingredient.brand ?? "",
    price: String(ingredient.price),
    purchaseQuantity: String(ingredient.purchaseQuantity),
    unit: ingredient.unit,
  };
}

/** Paridad con `parseNumberInput` de Astro: trim, coma → punto y `""` → NaN. */
export function parseIngredientNumber(raw: string | null | undefined): number {
  const normalized = String(raw ?? "")
    .trim()
    .replace(",", ".");
  if (!normalized) return Number.NaN;
  return Number(normalized);
}

export function isValidIngredientPrice(raw: string): boolean {
  const price = parseIngredientNumber(raw);
  return Number.isFinite(price) && price >= 0;
}

export function isValidIngredientQuantity(raw: string): boolean {
  const quantity = parseIngredientNumber(raw);
  return Number.isFinite(quantity) && quantity > 0;
}

/** Gate del botón de submit (paridad con el script de Astro). */
export function isIngredientFormValid(values: IngredientFormValues): boolean {
  return (
    values.name.trim().length > 0 &&
    isValidIngredientPrice(values.price) &&
    isValidIngredientQuantity(values.purchaseQuantity)
  );
}

/** Mensajes verbatim del formulario de Astro. */
export function validateIngredientInput(
  values: IngredientFormValues,
): string | null {
  if (
    !values.name.trim() ||
    !values.unit.trim() ||
    !isValidIngredientPrice(values.price)
  ) {
    return "Nombre, unidad y precio empaque son obligatorios.";
  }

  if (!isValidIngredientQuantity(values.purchaseQuantity)) {
    return "La cantidad de empaque debe ser mayor a 0 (puedes usar decimales).";
  }

  return null;
}

/** Costo por unidad para el preview vivo; `$0.00` cuando el par no es válido. */
export function formatUnitCost(
  price: number,
  purchaseQuantity: number,
): string {
  if (
    !Number.isFinite(price) ||
    price < 0 ||
    !Number.isFinite(purchaseQuantity) ||
    purchaseQuantity <= 0
  ) {
    return "$0.00";
  }

  return `$${(price / purchaseQuantity).toFixed(2)}`;
}

export function toIngredientInput(
  values: IngredientFormValues,
): CreateIngredientInput {
  const brand = values.brand.trim();
  const supplier = values.supplier.trim();

  return {
    name: values.name.trim(),
    unit: values.unit.trim(),
    price: parseIngredientNumber(values.price),
    purchaseQuantity: parseIngredientNumber(values.purchaseQuantity),
    brand: brand || undefined,
    supplier: supplier || undefined,
  };
}
