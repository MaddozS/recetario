import type {
  Ingredient,
  RecipeIngredient,
  RecipeIngredientWithData,
} from "@recetario/types";

/**
 * Cálculos financieros de la receta (costos de insumos, costos fijos y
 * resumen del FinancialSummary). Compartidos entre el render de la página
 * de receta y el handler de POST, que recalcula el resumen tras guardar
 * un costo fijo para actualizar la cabecera sin recargar.
 */

const roundHalfUp = (value: number) => {
  return value >= 0 ? Math.floor(value + 0.5) : Math.ceil(value - 0.5);
};

export const aplicarRedondeoUnidadPequena = (cantidad: number, unidad: string) => {
  const u = unidad.toLowerCase();
  if (u === "g" || u === "ml") {
    return roundHalfUp(cantidad);
  }
  return cantidad;
};

export const getCostoBaseCompra = (insumo: Ingredient) => {
  if (insumo.purchaseQuantity === 0) return 0;
  return insumo.price / insumo.purchaseQuantity;
};

export const calcularSubtotalIngrediente = (
  ri: RecipeIngredient,
  insumo: Ingredient,
  multiplier: number,
) => {
  if (!insumo) return 0;

  let cantidadAjustada = aplicarRedondeoUnidadPequena(
    ri.quantity * multiplier,
    ri.unit,
  );
  const unidadInsumo = insumo.unit.toLowerCase();
  const unidadReceta = ri.unit.toLowerCase();

  // Conversión inteligente: si el insumo es kg/lt y la receta usa g/ml
  if (
    (unidadInsumo === "kg" || unidadInsumo === "lt") &&
    (unidadReceta === "g" || unidadReceta === "ml")
  ) {
    cantidadAjustada = cantidadAjustada / 1000;
  }

  return getCostoBaseCompra(insumo) * cantidadAjustada;
};

export const calcularCostoDirecto = (
  ingredients: RecipeIngredientWithData[],
  multiplier: number,
) => {
  return ingredients.reduce((total, ri) => {
    return total + calcularSubtotalIngrediente(ri, ri.ingredient, multiplier);
  }, 0);
};

export const computeFixedCostAmount = (
  fc: { type: string; base: string; value: number; hours?: number | null },
  costoDirectoTotal: number,
  multiplier: number,
): number => {
  if (fc.type === "AMOUNT") {
    if (fc.base === "PER_HOUR") return fc.value * (fc.hours ?? 1);
    return fc.value * multiplier;
  }
  // PERCENTAGE
  return costoDirectoTotal * (fc.value / 100);
};

export function buildFinancialRows(input: {
  hasAdvancedCosts: boolean;
  costoDirectoTotal: number;
  recipeFixedCosts: Array<{
    type: string;
    base: string;
    value: number;
    hours?: number | null;
  }>;
  multiplier: number;
  fixedCostsPercentageValue: number;
  desiredMarginValue: number;
}) {
  const {
    hasAdvancedCosts,
    costoDirectoTotal,
    recipeFixedCosts,
    multiplier,
    fixedCostsPercentageValue,
    desiredMarginValue,
  } = input;

  if (hasAdvancedCosts) {
    const baseRows: Array<{
      label: string;
      value: string;
      subtitle?: string;
      secondaryValue?: string;
      color?: string;
    }> = [
      {
        label: "Costo Insumos",
        value: `$${costoDirectoTotal.toFixed(2)}`,
        subtitle: "Costo base de materiales",
        color: "danger",
      },
    ];

    const recipeFixedCostsTotal = recipeFixedCosts.reduce(
      (sum, fc) => sum + computeFixedCostAmount(fc, costoDirectoTotal, multiplier),
      0,
    );

    baseRows.push({
      label: "Total Costos Fijos",
      value: `$${recipeFixedCostsTotal.toFixed(2)}`,
      subtitle: "Suma de costos fijos de la receta",
      color: "muted",
    });

    baseRows.push({
      label: "Costo Total Receta",
      value: `$${(costoDirectoTotal + recipeFixedCostsTotal).toFixed(2)}`,
      subtitle: "Insumos + Costos Fijos",
      color: "accent",
    });

    baseRows.push({
      label: "Margen Deseado",
      value: `${desiredMarginValue}%`,
      subtitle: "Objetivo de ganancia",
      color: "success",
    });

    return { rows: baseRows, highlightIndex: 2, editRowIndices: [3] };
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
