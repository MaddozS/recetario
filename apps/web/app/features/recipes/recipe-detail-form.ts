import type {
  ingredientSchema,
  recipeWithIngredientsSchema,
} from "@recetario/types";
import { UNIT_OPTIONS } from "#shared/utils/units";
import type { z } from "zod";
import { isRecipeFormValid } from "./recipe-form";

/**
 * Modelo del formulario de edición del detalle de receta y su traducción al
 * contrato del API (`recipeUpdateSchema`).
 *
 * Módulo puro: cubierto en `test/unit`. Las cantidades viven como texto (lo que
 * el usuario escribe, con coma o punto) y se parsean al construir el payload,
 * igual que el `parseNumberInput` heredado.
 */
export type RecipeDetailRecord = z.infer<typeof recipeWithIngredientsSchema>;
export type IngredientRecord = z.infer<typeof ingredientSchema>;

export type IngredientRow = {
  /** Clave estable para `v-for`; se genera al crear o restaurar las filas. */
  key: string;
  ingredientId: number | null;
  /** Texto visible del picker (nombre con marca). */
  label: string;
  quantity: string;
  unit: string;
  comment: string;
};

export type RecipeDetailForm = {
  name: string;
  category: string;
  desiredMargin: string;
  fixedCostsPercentage: string;
  rows: IngredientRow[];
};

export type RecipeUpdateIngredient = {
  ingredientId: number;
  quantity: number;
  unit: string;
  comment?: string;
};

export type RecipeUpdatePayload = {
  name: string;
  category: string | null;
  desiredMargin: number;
  fixedCostsPercentage: number;
  ingredients: RecipeUpdateIngredient[];
};

export type FinancialEditField = {
  rowIndex: number;
  name: "desiredMargin" | "fixedCostsPercentage";
  suffix?: string;
};

export type UnitOptionItem = { value: string; label: string };

export type RecipeFormValidation =
  | { valid: true }
  | { valid: false; message: string };

export const NAME_ERROR_MESSAGE = "Escribe un nombre de hasta 120 caracteres.";
export const EMPTY_ROWS_MESSAGE =
  "Agrega al menos un ingrediente antes de guardar.";
export const INVALID_ROWS_MESSAGE =
  "Completa o elimina las filas sin ingrediente o con cantidad mayor a 0.";

/** Coma o punto como separador decimal; vacío o basura → NaN. */
export function parseDecimal(raw: string): number {
  const value = String(raw ?? "").trim();
  if (!value) return Number.NaN;
  return Number(value.replace(",", "."));
}

export function formatIngredientLabel(ingredient: {
  name: string;
  brand?: string | null;
}): string {
  return ingredient.brand
    ? `${ingredient.name} (${ingredient.brand})`
    : ingredient.name;
}

/**
 * Catálogo de unidades de la receta: las estándar más las descubiertas en los
 * ingredientes y en las filas de la receta, sin duplicados y en orden de
 * aparición (paridad con Astro).
 */
export function buildUnitOptions(
  allIngredients: ReadonlyArray<{ unit: string }>,
  recipeIngredients: ReadonlyArray<{ unit: string }>,
): string[] {
  const discovered = [...allIngredients, ...recipeIngredients]
    .map((item) => item.unit.trim())
    .filter((unit) => unit.length > 0);

  return [...new Set([...UNIT_OPTIONS, ...discovered])];
}

/** La unidad actual se antepone si no está en el catálogo (p. ej. «Sin unidad»). */
export function getUnitOptionsForValue(
  unitOptions: readonly string[],
  currentUnit: string,
): UnitOptionItem[] {
  if (unitOptions.includes(currentUnit)) {
    return unitOptions.map((unit) => ({ value: unit, label: unit }));
  }

  return [
    {
      value: currentUnit,
      label: currentUnit.trim().length > 0 ? currentUnit : "Sin unidad",
    },
    ...unitOptions.map((unit) => ({ value: unit, label: unit })),
  ];
}

export function emptyIngredientRow(key: string): IngredientRow {
  return {
    key,
    ingredientId: null,
    label: "",
    quantity: "1",
    unit: "",
    comment: "",
  };
}

export function toIngredientRows(
  ingredients: ReadonlyArray<RecipeDetailRecord["ingredients"][number]>,
  nextKey: () => string,
): IngredientRow[] {
  return ingredients.map((ri) => ({
    key: nextKey(),
    ingredientId: ri.ingredientId,
    label: formatIngredientLabel(ri.ingredient),
    quantity: String(ri.quantity),
    unit: ri.unit,
    comment: ri.comment ?? "",
  }));
}

export function addIngredientRow(
  rows: readonly IngredientRow[],
  key: string,
): IngredientRow[] {
  return [...rows, emptyIngredientRow(key)];
}

export function updateIngredientRow(
  rows: readonly IngredientRow[],
  index: number,
  patch: Partial<Omit<IngredientRow, "key">>,
): IngredientRow[] {
  return rows.map((row, i) => (i === index ? { ...row, ...patch } : row));
}

export function removeIngredientRow(
  rows: readonly IngredientRow[],
  index: number,
): IngredientRow[] {
  return rows.filter((_, i) => i !== index);
}

/** Filas sin ingrediente elegido o con cantidad no positiva. */
export function invalidRows(rows: readonly IngredientRow[]): IngredientRow[] {
  return rows.filter((row) => {
    const quantity = parseDecimal(row.quantity);
    return row.ingredientId === null || !(quantity > 0);
  });
}

/**
 * Gate del guardado. Astro descartaba las filas inválidas en silencio y, si
 * todas lo eran, el `PATCH` borraba todos los ingredientes: aquí se avisa.
 */
export function validateRecipeForm(
  form: RecipeDetailForm,
): RecipeFormValidation {
  if (!isRecipeFormValid({ name: form.name })) {
    return { valid: false, message: NAME_ERROR_MESSAGE };
  }

  if (form.rows.length === 0) {
    return { valid: false, message: EMPTY_ROWS_MESSAGE };
  }

  if (invalidRows(form.rows).length > 0) {
    return { valid: false, message: INVALID_ROWS_MESSAGE };
  }

  return { valid: true };
}

/**
 * Payload del `PATCH`. Nombre vacío conserva el actual (regla heredada); el
 * margen fuera de rango o el porcentaje negativo conservan el valor actual.
 */
export function toRecipeUpdatePayload(
  form: RecipeDetailForm,
  current: {
    name: string;
    desiredMargin: number;
    fixedCostsPercentage: number;
  },
): RecipeUpdatePayload {
  const name = form.name.trim() || current.name || "Receta";
  const category = form.category.trim() || null;

  const parsedMargin = parseDecimal(form.desiredMargin);
  const desiredMargin =
    Number.isFinite(parsedMargin) && parsedMargin >= 0 && parsedMargin < 100
      ? parsedMargin
      : current.desiredMargin;

  const parsedFixedCosts = parseDecimal(form.fixedCostsPercentage);
  const fixedCostsPercentage =
    Number.isFinite(parsedFixedCosts) && parsedFixedCosts >= 0
      ? parsedFixedCosts
      : current.fixedCostsPercentage;

  return {
    name,
    category,
    desiredMargin,
    fixedCostsPercentage,
    ingredients: form.rows.map((row) => ({
      ingredientId: row.ingredientId as number,
      quantity: parseDecimal(row.quantity),
      unit: row.unit.trim() || "unidad",
      comment: row.comment.trim() || undefined,
    })),
  };
}

/** Con `advanced_costs` el % operativo no se edita; el margen siempre. */
export function buildFinancialEditFields(
  hasAdvancedCosts: boolean,
): FinancialEditField[] {
  if (hasAdvancedCosts) {
    return [{ rowIndex: 3, name: "desiredMargin", suffix: "%" }];
  }

  return [
    { rowIndex: 1, name: "fixedCostsPercentage", suffix: "%" },
    { rowIndex: 3, name: "desiredMargin", suffix: "%" },
  ];
}

export function formFromDetail(
  detail: RecipeDetailRecord,
  nextKey: () => string,
): RecipeDetailForm {
  return {
    name: detail.name,
    category: detail.category ?? "",
    desiredMargin: String(detail.desiredMargin),
    fixedCostsPercentage: String(detail.fixedCostsPercentage),
    rows: toIngredientRows(detail.ingredients, nextKey),
  };
}
