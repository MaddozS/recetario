import type {
  ingredientSchema,
  recipeFixedCostSchema,
  recipeIngredientDetailSchema,
} from "@recetario/types";
import type { z } from "zod";

/**
 * Cálculos financieros del detalle de receta (costos de insumos, costos fijos y
 * filas del `FinancialSummary`).
 *
 * Puerto del `recipe-financials.ts` del baseline, con los mismos
 * nombres para poder comparar. Módulo puro: cubierto en `test/unit`.
 *
 * Los tipos se derivan de los schemas del API (`ingredientSchema`,
 * `recipeIngredientDetailSchema`, `recipeFixedCostSchema`) para no duplicar el
 * contrato.
 */
export type IngredientRecord = z.infer<typeof ingredientSchema>;
export type RecipeIngredientDetail = z.infer<
  typeof recipeIngredientDetailSchema
>;
export type RecipeFixedCostRecord = z.infer<typeof recipeFixedCostSchema>;

export type FinancialRow = {
  label: string;
  value: string;
  subtitle?: string;
  secondaryValue?: string;
  /** Rol semántico del borde izquierdo: danger | muted | accent | success. */
  color?: "danger" | "muted" | "accent" | "success";
};

export type FinancialRowsInput = {
  hasAdvancedCosts: boolean;
  costoDirectoTotal: number;
  recipeFixedCosts: ReadonlyArray<{
    type: string;
    base: string;
    value: number;
    hours?: number | null;
  }>;
  multiplier: number;
  fixedCostsPercentageValue: number;
  desiredMarginValue: number;
};

export type FinancialRowsResult = {
  rows: FinancialRow[];
  highlightIndex: number;
  /** Índices de fila con input editable (margen y, sin advanced, % operativo). */
  editRowIndices: number[];
};

/** Redondeo contable half-up (el que usaba el baseline). */
function roundHalfUp(value: number): number {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
}

/** g/ml se redondean a entero; el resto conserva decimales. */
export function aplicarRedondeoUnidadPequena(
  cantidad: number,
  unidad: string,
): number {
  const u = unidad.toLowerCase();
  if (u === "g" || u === "ml") {
    return roundHalfUp(cantidad);
  }
  return cantidad;
}

export function getCostoBaseCompra(insumo: {
  price: number;
  purchaseQuantity: number;
}): number {
  if (insumo.purchaseQuantity === 0) return 0;
  return insumo.price / insumo.purchaseQuantity;
}

export function calcularSubtotalIngrediente(
  ri: { quantity: number; unit: string },
  insumo: IngredientRecord,
  multiplier: number,
): number {
  if (!insumo) return 0;

  let cantidadAjustada = aplicarRedondeoUnidadPequena(
    ri.quantity * multiplier,
    ri.unit,
  );
  const unidadInsumo = insumo.unit.toLowerCase();
  const unidadReceta = ri.unit.toLowerCase();

  // Conversión: si el insumo se compra en kg/lt y la receta usa g/ml.
  if (
    (unidadInsumo === "kg" || unidadInsumo === "lt") &&
    (unidadReceta === "g" || unidadReceta === "ml")
  ) {
    cantidadAjustada = cantidadAjustada / 1000;
  }

  return getCostoBaseCompra(insumo) * cantidadAjustada;
}

export function calcularCostoDirecto(
  ingredients: ReadonlyArray<RecipeIngredientDetail>,
  multiplier: number,
): number {
  return ingredients.reduce(
    (total, ri) =>
      total + calcularSubtotalIngrediente(ri, ri.ingredient, multiplier),
    0,
  );
}

export function computeFixedCostAmount(
  fc: { type: string; base: string; value: number; hours?: number | null },
  costoDirectoTotal: number,
  multiplier: number,
): number {
  if (fc.type === "AMOUNT") {
    if (fc.base === "PER_HOUR") return fc.value * (fc.hours ?? 1);
    return fc.value * multiplier;
  }
  // PERCENTAGE
  return costoDirectoTotal * (fc.value / 100);
}

/** Suma de los costos fijos de la receta para el costo directo y el multiplicador dados. */
export function computeRecipeFixedCostsTotal(
  recipeFixedCosts: FinancialRowsInput["recipeFixedCosts"],
  costoDirectoTotal: number,
  multiplier: number,
): number {
  return recipeFixedCosts.reduce(
    (sum, fc) =>
      sum + computeFixedCostAmount(fc, costoDirectoTotal, multiplier),
    0,
  );
}

export type RecipeBatchCostInput = {
  hasAdvancedCosts: boolean;
  costoDirectoTotal: number;
  recipeFixedCosts: FinancialRowsInput["recipeFixedCosts"];
  multiplier: number;
  fixedCostsPercentageValue: number;
};

/**
 * Costo de una mezcla: insumos más los costos fijos explícitos con
 * `advanced_costs`, o más el porcentaje de gastos operativos sin la feature.
 * Es la base del precio sugerido de las presentaciones.
 */
export function computeRecipeBatchCost(input: RecipeBatchCostInput): number {
  const indirectCosts = input.hasAdvancedCosts
    ? computeRecipeFixedCostsTotal(
        input.recipeFixedCosts,
        input.costoDirectoTotal,
        input.multiplier,
      )
    : input.costoDirectoTotal * (input.fixedCostsPercentageValue / 100);

  return input.costoDirectoTotal + indirectCosts;
}

/** Precio de venta sugerido de la mezcla para el margen deseado (0-99.99). */
export function computeSuggestedBatchPrice(
  batchCost: number,
  desiredMarginValue: number,
): number {
  return batchCost / (1 - desiredMarginValue / 100);
}

/**
 * Filas del resumen financiero. Con `advanced_costs` la receta usa costos fijos
 * explícitos; sin la feature, un porcentaje de gastos operativos.
 */
export function buildFinancialRows(
  input: FinancialRowsInput,
): FinancialRowsResult {
  const {
    hasAdvancedCosts,
    costoDirectoTotal,
    recipeFixedCosts,
    multiplier,
    fixedCostsPercentageValue,
    desiredMarginValue,
  } = input;

  if (hasAdvancedCosts) {
    const recipeFixedCostsTotal = computeRecipeFixedCostsTotal(
      recipeFixedCosts,
      costoDirectoTotal,
      multiplier,
    );

    return {
      rows: [
        {
          label: "Costo Insumos",
          value: `$${costoDirectoTotal.toFixed(2)}`,
          subtitle: "Costo base de materiales",
          color: "danger",
        },
        {
          label: "Total Costos Fijos",
          value: `$${recipeFixedCostsTotal.toFixed(2)}`,
          subtitle: "Suma de costos fijos de la receta",
          color: "muted",
        },
        {
          label: "Costo Total Receta",
          value: `$${(costoDirectoTotal + recipeFixedCostsTotal).toFixed(2)}`,
          subtitle: "Insumos + Costos Fijos",
          color: "accent",
        },
        {
          label: "Margen Deseado",
          value: `${desiredMarginValue}%`,
          subtitle: "Objetivo de ganancia",
          color: "success",
        },
      ],
      highlightIndex: 2,
      editRowIndices: [3],
    };
  }

  const costoOperativo = costoDirectoTotal * (fixedCostsPercentageValue / 100);

  return {
    rows: [
      {
        label: "Costo Insumos",
        value: `$${costoDirectoTotal.toFixed(2)}`,
        subtitle: "Costo base de materiales",
        color: "danger",
      },
      {
        label: "Gastos Operativos",
        value: `${fixedCostsPercentageValue}%`,
        subtitle: "Servicios, labor, etc.",
        secondaryValue: `+$${costoOperativo.toFixed(2)}`,
        color: "muted",
      },
      {
        label: "Costo Total Real",
        value: `$${(costoDirectoTotal + costoOperativo).toFixed(2)}`,
        subtitle: "Insumos + Operativos",
        color: "accent",
      },
      {
        label: "Margen Utilidad",
        value: `${desiredMarginValue}%`,
        subtitle: "Objetivo de ganancia",
        color: "success",
      },
    ],
    highlightIndex: 2,
    editRowIndices: [1, 3],
  };
}
