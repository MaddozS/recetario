import { describe, expect, it } from "vitest";
import {
  aplicarRedondeoUnidadPequena,
  buildFinancialRows,
  calcularCostoDirecto,
  calcularSubtotalIngrediente,
  computeFixedCostAmount,
  getCostoBaseCompra,
} from "../../app/features/recipes/recipe-financials";
import type {
  IngredientRecord,
  RecipeDetailRecord,
} from "../../app/features/recipes/recipe-detail-form";

const HARINA: IngredientRecord = {
  id: 1,
  name: "Harina de trigo",
  unit: "kg",
  price: 25,
  purchaseQuantity: 1,
  brand: "Del Campo",
};

const PLATANO: IngredientRecord = {
  id: 2,
  name: "Plátano",
  unit: "kg",
  price: 18,
  purchaseQuantity: 2,
};

function row(
  quantity: number,
  unit: string,
  ingredient: IngredientRecord,
): RecipeDetailRecord["ingredients"][number] {
  return { ingredientId: ingredient.id, quantity, unit, ingredient };
}

describe("getCostoBaseCompra", () => {
  it("divide el precio del empaque entre su contenido", () => {
    expect(getCostoBaseCompra(HARINA)).toBe(25);
    expect(getCostoBaseCompra(PLATANO)).toBe(9);
  });

  it("no divide entre cero", () => {
    expect(getCostoBaseCompra({ price: 25, purchaseQuantity: 0 })).toBe(0);
  });
});

describe("aplicarRedondeoUnidadPequena", () => {
  it("redondea g/ml con half-up y deja el resto intacto", () => {
    expect(aplicarRedondeoUnidadPequena(33.4, "g")).toBe(33);
    expect(aplicarRedondeoUnidadPequena(33.5, "g")).toBe(34);
    expect(aplicarRedondeoUnidadPequena(10.25, "ml")).toBe(10);
    expect(aplicarRedondeoUnidadPequena(0.5, "kg")).toBe(0.5);
    expect(aplicarRedondeoUnidadPequena(2.75, "unidad")).toBe(2.75);
  });
});

describe("calcularSubtotalIngrediente", () => {
  it("cobra por la cantidad usada", () => {
    expect(calcularSubtotalIngrediente(row(0.5, "kg", HARINA), HARINA, 1)).toBe(
      12.5,
    );
    expect(calcularSubtotalIngrediente(row(2, "kg", PLATANO), PLATANO, 1)).toBe(
      18,
    );
  });

  it("convierte g/ml del insumo comprado en kg/lt", () => {
    expect(calcularSubtotalIngrediente(row(100, "g", HARINA), HARINA, 1)).toBe(
      2.5,
    );
    expect(calcularSubtotalIngrediente(row(500, "ml", HARINA), HARINA, 1)).toBe(
      12.5,
    );
  });

  it("escala con el multiplicador de mezclas", () => {
    expect(calcularSubtotalIngrediente(row(0.5, "kg", HARINA), HARINA, 2)).toBe(
      25,
    );
  });
});

describe("calcularCostoDirecto", () => {
  it("suma los subtotales de todas las filas", () => {
    const ingredients = [
      row(0.5, "kg", HARINA),
      row(2, "kg", PLATANO),
      row(100, "g", HARINA),
    ];

    expect(calcularCostoDirecto(ingredients, 1)).toBe(33);
    expect(calcularCostoDirecto(ingredients, 2)).toBe(66);
    expect(calcularCostoDirecto([], 1)).toBe(0);
  });
});

describe("computeFixedCostAmount", () => {
  it("multiplica el monto por las mezclas", () => {
    expect(
      computeFixedCostAmount(
        { type: "AMOUNT", base: "PER_BATCH", value: 10 },
        100,
        2,
      ),
    ).toBe(20);
  });

  it("cobra las horas en los costos por hora", () => {
    expect(
      computeFixedCostAmount(
        { type: "AMOUNT", base: "PER_HOUR", value: 50, hours: 3 },
        100,
        2,
      ),
    ).toBe(150);
    expect(
      computeFixedCostAmount(
        { type: "AMOUNT", base: "PER_HOUR", value: 50 },
        100,
        1,
      ),
    ).toBe(50);
  });

  it("calcula el porcentaje sobre el costo directo", () => {
    expect(
      computeFixedCostAmount(
        { type: "PERCENTAGE", base: "PER_BATCH", value: 10 },
        100,
        5,
      ),
    ).toBe(10);
  });
});

describe("buildFinancialRows", () => {
  it("sin advanced_costs muestra el gasto operativo y edita % y margen", () => {
    const { rows, highlightIndex, editRowIndices } = buildFinancialRows({
      hasAdvancedCosts: false,
      costoDirectoTotal: 33,
      recipeFixedCosts: [],
      multiplier: 1,
      fixedCostsPercentageValue: 10,
      desiredMarginValue: 30,
    });

    expect(rows.map((row) => row.label)).toEqual([
      "Costo Insumos",
      "Gastos Operativos",
      "Costo Total Real",
      "Margen Utilidad",
    ]);
    expect(rows[0]?.value).toBe("$33.00");
    expect(rows[1]?.secondaryValue).toBe("+$3.30");
    expect(rows[2]?.value).toBe("$36.30");
    expect(rows[3]?.value).toBe("30%");
    expect(highlightIndex).toBe(2);
    expect(editRowIndices).toEqual([1, 3]);
  });

  it("con advanced_costs suma los costos fijos y sólo edita el margen", () => {
    const { rows, highlightIndex, editRowIndices } = buildFinancialRows({
      hasAdvancedCosts: true,
      costoDirectoTotal: 33,
      recipeFixedCosts: [
        { type: "AMOUNT", base: "PER_BATCH", value: 10 },
        { type: "PERCENTAGE", base: "PER_BATCH", value: 10 },
      ],
      multiplier: 1,
      fixedCostsPercentageValue: 10,
      desiredMarginValue: 30,
    });

    expect(rows.map((row) => row.label)).toEqual([
      "Costo Insumos",
      "Total Costos Fijos",
      "Costo Total Receta",
      "Margen Deseado",
    ]);
    expect(rows[1]?.value).toBe("$13.30");
    expect(rows[2]?.value).toBe("$46.30");
    expect(rows[3]?.value).toBe("30%");
    expect(highlightIndex).toBe(2);
    expect(editRowIndices).toEqual([3]);
  });
});
