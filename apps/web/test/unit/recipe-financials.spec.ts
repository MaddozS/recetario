import { describe, expect, it } from 'vitest';
import {
  aplicarRedondeoUnidadPequena,
  buildFinancialRows,
  calcularCostoDirecto,
  calcularSubtotalIngrediente,
  COST_GROUP,
  computeFixedCostAmount,
  computeRecipeBatchCost,
  computeRecipeFixedCostsTotal,
  computeSuggestedBatchPrice,
  getCostoBaseCompra,
  PRICE_GROUP,
} from '../../app/features/recipes/recipe-financials';
import type {
  IngredientRecord,
  RecipeDetailRecord,
} from '../../app/features/recipes/recipe-detail-form';

const HARINA: IngredientRecord = {
  id: 1,
  name: 'Harina de trigo',
  unit: 'kg',
  price: 25,
  purchaseQuantity: 1,
  brand: 'Del Campo',
};

const PLATANO: IngredientRecord = {
  id: 2,
  name: 'Plátano',
  unit: 'kg',
  price: 18,
  purchaseQuantity: 2,
};

function row(
  quantity: number,
  unit: string,
  ingredient: IngredientRecord
): RecipeDetailRecord['ingredients'][number] {
  return { ingredientId: ingredient.id, quantity, unit, ingredient };
}

describe('getCostoBaseCompra', () => {
  it('divide el precio del empaque entre su contenido', () => {
    expect(getCostoBaseCompra(HARINA)).toBe(25);
    expect(getCostoBaseCompra(PLATANO)).toBe(9);
  });

  it('no divide entre cero', () => {
    expect(getCostoBaseCompra({ price: 25, purchaseQuantity: 0 })).toBe(0);
  });
});

describe('aplicarRedondeoUnidadPequena', () => {
  it('redondea g/ml con half-up y deja el resto intacto', () => {
    expect(aplicarRedondeoUnidadPequena(33.4, 'g')).toBe(33);
    expect(aplicarRedondeoUnidadPequena(33.5, 'g')).toBe(34);
    expect(aplicarRedondeoUnidadPequena(10.25, 'ml')).toBe(10);
    expect(aplicarRedondeoUnidadPequena(0.5, 'kg')).toBe(0.5);
    expect(aplicarRedondeoUnidadPequena(2.75, 'unidad')).toBe(2.75);
  });
});

describe('calcularSubtotalIngrediente', () => {
  it('cobra por la cantidad usada', () => {
    expect(calcularSubtotalIngrediente(row(0.5, 'kg', HARINA), HARINA, 1)).toBe(12.5);
    expect(calcularSubtotalIngrediente(row(2, 'kg', PLATANO), PLATANO, 1)).toBe(18);
  });

  it('convierte g/ml del insumo comprado en kg/lt', () => {
    expect(calcularSubtotalIngrediente(row(100, 'g', HARINA), HARINA, 1)).toBe(2.5);
    expect(calcularSubtotalIngrediente(row(500, 'ml', HARINA), HARINA, 1)).toBe(12.5);
  });

  it('escala con el multiplicador de mezclas', () => {
    expect(calcularSubtotalIngrediente(row(0.5, 'kg', HARINA), HARINA, 2)).toBe(25);
  });
});

describe('calcularCostoDirecto', () => {
  it('suma los subtotales de todas las filas', () => {
    const ingredients = [row(0.5, 'kg', HARINA), row(2, 'kg', PLATANO), row(100, 'g', HARINA)];

    expect(calcularCostoDirecto(ingredients, 1)).toBe(33);
    expect(calcularCostoDirecto(ingredients, 2)).toBe(66);
    expect(calcularCostoDirecto([], 1)).toBe(0);
  });
});

describe('computeFixedCostAmount', () => {
  it('multiplica el monto por las mezclas', () => {
    expect(computeFixedCostAmount({ type: 'AMOUNT', base: 'PER_BATCH', value: 10 }, 100, 2)).toBe(
      20
    );
  });

  it('cobra las horas en los costos por hora', () => {
    expect(
      computeFixedCostAmount({ type: 'AMOUNT', base: 'PER_HOUR', value: 50, hours: 3 }, 100, 2)
    ).toBe(150);
    expect(computeFixedCostAmount({ type: 'AMOUNT', base: 'PER_HOUR', value: 50 }, 100, 1)).toBe(
      50
    );
  });

  it('calcula el porcentaje sobre el costo directo', () => {
    expect(
      computeFixedCostAmount({ type: 'PERCENTAGE', base: 'PER_BATCH', value: 10 }, 100, 5)
    ).toBe(10);
  });
});

describe('buildFinancialRows', () => {
  it('sin advanced_costs muestra el gasto operativo y edita % y margen', () => {
    const { rows, editRowIndices } = buildFinancialRows({
      hasAdvancedCosts: false,
      costoDirectoTotal: 33,
      recipeFixedCosts: [],
      multiplier: 1,
      fixedCostsPercentageValue: 10,
      desiredMarginValue: 30,
    });

    expect(rows.map((row) => row.label)).toEqual([
      'Insumos',
      'Gastos Operativos',
      'Costo Total',
      'Margen Deseado',
      'Costo Total',
      'Precio Sugerido',
      'Ganancia',
    ]);
    expect(rows[0]?.value).toBe('$33.00');
    expect(rows[1]?.secondaryValue).toBe('$3.30');
    expect(rows[2]?.value).toBe('$36.30');
    expect(rows[3]?.value).toBe('30%');
    // La banda se lee sola: el costo es su base y el precio su consecuencia.
    expect(rows[4]?.value).toBe('$36.30');
    expect(rows[4]?.subtitle).toBe('Lo que cuesta producir');
    expect(rows[5]?.value).toBe('$51.86');
    expect(rows[5]?.subtitle).toBe('Con 30% de margen');
    expect(rows[6]?.value).toBe('$15.56');
    expect(rows[6]?.subtitle).toBe('Después de costos');

    // La aritmética del tramo se declara con los signos.
    expect(rows[0]?.op).toBeUndefined();
    expect(rows[1]?.op).toBe('+');
    expect(rows[2]?.op).toBe('=');
    // Con una mezcla no hay promedio que traducir.
    expect(rows[2]?.secondaryValue).toBeUndefined();

    // Dos tramos: costo de la mezcla (con su total) y precio de venta.
    expect(rows.slice(0, 3).map((row) => row.group)).toEqual([COST_GROUP, COST_GROUP, COST_GROUP]);
    expect(rows.slice(3).map((row) => row.group)).toEqual([
      PRICE_GROUP,
      PRICE_GROUP,
      PRICE_GROUP,
      PRICE_GROUP,
    ]);
    expect(rows[2]?.emphasis).toBe('total');
    // La palanca gobierna el tramo desde su encabezado; la banda sólo responde.
    expect(rows[3]?.emphasis).toBe('control');
    expect(rows.slice(4).every((row) => row.emphasis === 'answer')).toBe(true);
    expect(editRowIndices).toEqual([1, 3]);
  });

  it('con advanced_costs suma los costos fijos y sólo edita el margen', () => {
    const { rows, editRowIndices } = buildFinancialRows({
      hasAdvancedCosts: true,
      costoDirectoTotal: 33,
      recipeFixedCosts: [
        { type: 'AMOUNT', base: 'PER_BATCH', value: 10 },
        { type: 'PERCENTAGE', base: 'PER_BATCH', value: 10 },
      ],
      multiplier: 1,
      fixedCostsPercentageValue: 10,
      desiredMarginValue: 30,
    });

    expect(rows.map((row) => row.label)).toEqual([
      'Insumos',
      'Costos Fijos',
      'Costo Total',
      'Margen Deseado',
      'Costo Total',
      'Precio Sugerido',
      'Ganancia',
    ]);
    expect(rows[1]?.value).toBe('$13.30');
    expect(rows[2]?.value).toBe('$46.30');
    expect(rows[3]?.value).toBe('30%');
    // 46.30 / (1 - 0.30), con el mismo nombre de margen que sin la feature.
    expect(rows[5]?.value).toBe('$66.14');
    expect(rows[6]?.value).toBe('$19.84');
    expect(rows[2]?.emphasis).toBe('total');
    expect(rows[3]?.emphasis).toBe('control');
    expect(editRowIndices).toEqual([3]);
  });

  it('con varias mezclas traduce el total a promedio por mezcla', () => {
    const { rows } = buildFinancialRows({
      hasAdvancedCosts: false,
      // El costo directo ya viene escalado por el multiplicador (4 × 33).
      costoDirectoTotal: 132,
      recipeFixedCosts: [],
      multiplier: 4,
      fixedCostsPercentageValue: 10,
      desiredMarginValue: 30,
    });

    expect(rows[2]?.value).toBe('$145.20');
    expect(rows[2]?.secondaryValue).toBe('≈ $36.30 por mezcla');
    // La ganancia también se traduce cuando la tanda tiene varias mezclas.
    expect(rows[5]?.value).toBe('$207.43');
    expect(rows[6]?.value).toBe('$62.23');
    expect(rows[6]?.subtitle).toBe('≈ $15.56 por mezcla');
  });
});

const RECIPE_FIXED_COSTS = [
  { type: 'AMOUNT', base: 'PER_BATCH', value: 10 },
  { type: 'AMOUNT', base: 'PER_HOUR', value: 50, hours: 2 },
  { type: 'PERCENTAGE', base: 'PER_BATCH', value: 10 },
];

describe('computeRecipeFixedCostsTotal', () => {
  it('suma montos por mezcla, por hora y porcentajes del costo directo', () => {
    // 10 por mezcla + 50 × 2 h + 10 % de 100.
    expect(computeRecipeFixedCostsTotal(RECIPE_FIXED_COSTS, 100, 1)).toBe(120);
    // Las horas no escalan con las mezclas: 20 + 100 + 10.
    expect(computeRecipeFixedCostsTotal(RECIPE_FIXED_COSTS, 100, 2)).toBe(130);
  });

  it('sin costos fijos es 0', () => {
    expect(computeRecipeFixedCostsTotal([], 100, 1)).toBe(0);
  });
});

describe('computeRecipeBatchCost', () => {
  it('sin advanced_costs usa el porcentaje de gastos operativos', () => {
    expect(
      computeRecipeBatchCost({
        hasAdvancedCosts: false,
        costoDirectoTotal: 33,
        recipeFixedCosts: RECIPE_FIXED_COSTS,
        multiplier: 1,
        fixedCostsPercentageValue: 10,
      })
    ).toBe(36.3);
  });

  it('con advanced_costs usa los costos fijos explícitos', () => {
    expect(
      computeRecipeBatchCost({
        hasAdvancedCosts: true,
        costoDirectoTotal: 33,
        recipeFixedCosts: [
          { type: 'AMOUNT', base: 'PER_BATCH', value: 10 },
          { type: 'PERCENTAGE', base: 'PER_BATCH', value: 10 },
        ],
        multiplier: 1,
        fixedCostsPercentageValue: 99,
      })
    ).toBe(46.3);
  });

  it('escala los montos con el multiplicador', () => {
    // El costo directo ya llega escalado por quien llama: aquí sólo escalan los FC.
    expect(
      computeRecipeBatchCost({
        hasAdvancedCosts: true,
        costoDirectoTotal: 33,
        recipeFixedCosts: [{ type: 'AMOUNT', base: 'PER_BATCH', value: 10 }],
        multiplier: 2,
        fixedCostsPercentageValue: 0,
      })
    ).toBe(53);
  });
});

describe('computeSuggestedBatchPrice', () => {
  it('despeja el precio con el margen deseado', () => {
    expect(computeSuggestedBatchPrice(70, 30)).toBeCloseTo(100, 10);
    expect(computeSuggestedBatchPrice(33, 0)).toBe(33);
  });

  it('con el margen al límite (99.99) no divide entre cero', () => {
    expect(computeSuggestedBatchPrice(33, 99.99)).toBeCloseTo(330000, 6);
  });
});
