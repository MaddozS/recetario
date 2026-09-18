import { describe, expect, it } from "vitest";
import {
  bestPresentationId,
  calculateProduction,
  presentationMargin,
} from "../../app/features/production/production-calculator";
import type {
  ProductionRecipeRecord,
  ProductionSelection,
} from "../../app/features/production/production-types";

/**
 * Cálculo del planificador. Los números están calculados a mano con los precios
 * de los fixtures para que el test documente la fórmula, no que la replique.
 */

type IngredientFixture =
  ProductionRecipeRecord["ingredients"][number]["ingredient"];

const HARINA: IngredientFixture = {
  id: 1,
  name: "Harina de trigo",
  unit: "kg",
  price: 25,
  purchaseQuantity: 1,
};
const PLATANO: IngredientFixture = {
  id: 2,
  name: "Plátano",
  unit: "kg",
  price: 18,
  purchaseQuantity: 2,
};
const LECHE: IngredientFixture = {
  id: 3,
  name: "Leche",
  unit: "lt",
  price: 20,
  purchaseQuantity: 1,
};
const AZUCAR_GRAMO: IngredientFixture = {
  id: 4,
  name: "Azúcar",
  unit: "g",
  price: 0.05,
  purchaseQuantity: 1,
};

function row(
  ingredient: IngredientFixture,
  quantity: number,
  unit: string,
): ProductionRecipeRecord["ingredients"][number] {
  return { ingredientId: ingredient.id, quantity, unit, ingredient };
}

function recipe(
  id: number,
  overrides: Partial<ProductionRecipeRecord> = {},
): ProductionRecipeRecord {
  return {
    id,
    name: `Receta ${id}`,
    desiredMargin: 0,
    fixedCostsPercentage: 0,
    ingredients: [],
    presentations: [],
    recipeFixedCosts: [],
    ...overrides,
  };
}

function selection(
  recipeId: number,
  overrides: Partial<ProductionSelection> = {},
): ProductionSelection {
  return { recipeId, batches: 1, ...overrides };
}

const TARTA = recipe(1, {
  name: "Tarta de Chocolate",
  category: "Postres",
  fixedCostsPercentage: 10,
  desiredMargin: 30,
  ingredients: [row(HARINA, 0.5, "kg"), row(HARINA, 100, "g")],
});
const PAN = recipe(2, {
  name: "Pan de Masa Madre",
  category: "Panes",
  fixedCostsPercentage: 5,
  ingredients: [row(HARINA, 1, "kg"), row(PLATANO, 0.5, "kg")],
});

describe("calculateProduction", () => {
  it("escala por mezclas, convierte g→kg y suma el porcentaje operativo", () => {
    const { summary } = calculateProduction(
      [selection(1, { batches: 2 })],
      [TARTA],
    );

    // 0.5 kg × 2 = 1 kg ($25) + 100 g × 2 = 0.2 kg ($5) = $30.
    expect(summary.totalIngredientsCost).toBeCloseTo(30);
    expect(summary.totalOperationalCost).toBeCloseTo(3);
    expect(summary.totalProductionCost).toBeCloseTo(33);

    const [tarta] = summary.perRecipe;
    expect(tarta?.batches).toBe(2);
    expect(tarta?.ingredientsCost).toBeCloseTo(30);
    expect(tarta?.operationalCost).toBeCloseTo(3);
    expect(tarta?.totalCost).toBeCloseTo(33);
  });

  it("consolida el mismo insumo repetido y entre recetas", () => {
    const { consolidatedIngredients, summary } = calculateProduction(
      [selection(1), selection(2)],
      [TARTA, PAN],
    );

    expect(consolidatedIngredients).toHaveLength(2);

    const harina = consolidatedIngredients.find(
      (item) => item.ingredientId === 1,
    );
    // Tarta: 0.5 kg + 0.1 kg; Pan: 1 kg → 1.6 kg a $25.
    expect(harina?.totalQuantity).toBeCloseTo(1.6);
    expect(harina?.totalCost).toBeCloseTo(40);
    // Cada fila de origen conserva su propia cantidad (no el acumulado).
    expect(harina?.sourceRecipes).toEqual([
      { recipeId: 1, recipeName: "Tarta de Chocolate", quantity: 0.5 },
      { recipeId: 1, recipeName: "Tarta de Chocolate", quantity: 0.1 },
      { recipeId: 2, recipeName: "Pan de Masa Madre", quantity: 1 },
    ]);

    const platano = consolidatedIngredients.find(
      (item) => item.ingredientId === 2,
    );
    // $18 por 2 kg → $9/kg.
    expect(platano?.unitCost).toBeCloseTo(9);
    expect(platano?.totalQuantity).toBeCloseTo(0.5);
    expect(platano?.totalCost).toBeCloseTo(4.5);

    // Tarta $15 + $1.5; Pan $29.5 + $1.475.
    expect(summary.totalIngredientsCost).toBeCloseTo(44.5);
    expect(summary.totalOperationalCost).toBeCloseTo(2.975);
    expect(summary.totalProductionCost).toBeCloseTo(47.475);
  });

  it("redondea g/ml a entero (half-up) sin tocar otras unidades", () => {
    const receta = recipe(3, {
      ingredients: [row(AZUCAR_GRAMO, 10.4, "g"), row(AZUCAR_GRAMO, 10.5, "g")],
    });

    const { consolidatedIngredients } = calculateProduction(
      [selection(3)],
      [receta],
    );

    // 10 + 11 = 21 g; 0.05 × 21 = 1.05.
    expect(consolidatedIngredients[0]?.totalQuantity).toBeCloseTo(21);
    expect(consolidatedIngredients[0]?.totalCost).toBeCloseTo(1.05);
  });

  it("convierte ml→lt cuando el insumo se compra por litro", () => {
    const receta = recipe(4, { ingredients: [row(LECHE, 2500, "ml")] });

    const { consolidatedIngredients } = calculateProduction(
      [selection(4)],
      [receta],
    );

    expect(consolidatedIngredients[0]?.totalQuantity).toBeCloseTo(2.5);
    expect(consolidatedIngredients[0]?.totalCost).toBeCloseTo(50);
  });

  it("acumula peso y volumen por receta", () => {
    const receta = recipe(5, {
      ingredients: [row(HARINA, 250, "g"), row(LECHE, 1.5, "lt")],
    });

    const { summary } = calculateProduction([selection(5)], [receta]);
    const [result] = summary.perRecipe;
    expect(result?.totalWeightGrams).toBeCloseTo(250);
    expect(result?.totalVolumeMl).toBeCloseTo(1500);
  });

  it("ignora lotes inválidos y recetas inexistentes", () => {
    const vacio = calculateProduction(
      [selection(1, { batches: 0 }), selection(99)],
      [TARTA],
    );

    expect(vacio.summary.perRecipe).toEqual([]);
    expect(vacio.summary.totalProductionCost).toBe(0);
    expect(vacio.consolidatedIngredients).toEqual([]);

    const negativo = calculateProduction(
      [selection(1, { batches: -2 })],
      [TARTA],
    );
    expect(negativo.summary.perRecipe).toEqual([]);
  });

  it("elige la presentación más rentable si no hay elección explícita", () => {
    const receta = recipe(6, {
      ingredients: [row(HARINA, 1, "kg")],
      presentations: [
        {
          id: 10,
          name: "Entera",
          unitsPerBatch: 8,
          salePrice: 12,
          fixedCosts: [],
        },
        {
          id: 11,
          name: "Porción",
          unitsPerBatch: 24,
          salePrice: 5,
          fixedCosts: [],
        },
      ],
    });

    const { summary } = calculateProduction([selection(6)], [receta]);
    const [result] = summary.perRecipe;

    // $25 de costo: Entera $96 vs Porción $120 → gana la porción.
    expect(result?.selectedPresentationId).toBe(11);
    expect(result?.presentations).toHaveLength(2);
    expect(result?.presentations[0]).toMatchObject({
      id: 10,
      totalUnits: 8,
      unitCost: 3.125,
      revenue: 96,
    });
    expect(result?.presentations[1]).toMatchObject({
      id: 11,
      totalUnits: 24,
      revenue: 120,
    });

    expect(summary.projectedRevenue).toBeCloseTo(120);
    expect(summary.estimatedProfit).toBeCloseTo(95);
    expect(summary.effectiveMargin).toBeCloseTo((95 / 120) * 100);
  });

  it("respeta la presentación elegida aunque no sea la más rentable", () => {
    const receta = recipe(6, {
      ingredients: [row(HARINA, 1, "kg")],
      presentations: [
        {
          id: 10,
          name: "Entera",
          unitsPerBatch: 8,
          salePrice: 12,
          fixedCosts: [],
        },
        {
          id: 11,
          name: "Porción",
          unitsPerBatch: 24,
          salePrice: 5,
          fixedCosts: [],
        },
      ],
    });

    const { summary } = calculateProduction(
      [selection(6, { presentationId: 10 })],
      [receta],
    );

    expect(summary.perRecipe[0]?.selectedPresentationId).toBe(10);
    expect(summary.projectedRevenue).toBeCloseTo(96);
  });

  it("sugiere el precio de venta por margen cuando la presentación no lo trae", () => {
    const receta = recipe(7, {
      ingredients: [row(HARINA, 1, "kg")],
      desiredMargin: 30,
      presentations: [
        { id: 20, name: "Caja", unitsPerBatch: 5, fixedCosts: [] },
      ],
    });

    const { summary } = calculateProduction([selection(7)], [receta]);
    const presentation = summary.perRecipe[0]?.presentations[0];

    // Costo $25 / (1 − 0.30) = $35.714… por mezcla repartido en 5 unidades.
    expect(presentation?.salePrice).toBeCloseTo(25 / 0.7 / 5);
    expect(summary.projectedRevenue).toBeCloseTo(25 / 0.7);
  });

  it("sin presentaciones no proyecta ingresos ni inventa margen", () => {
    const { summary } = calculateProduction([selection(2)], [PAN]);

    expect(summary.perRecipe[0]?.presentations).toEqual([]);
    expect(summary.perRecipe[0]?.selectedPresentationId).toBeUndefined();
    expect(summary.projectedRevenue).toBe(0);
    expect(summary.estimatedProfit).toBeCloseTo(-30.975);
    expect(summary.effectiveMargin).toBe(0);
  });

  it("recalcula el costo unitario con varias mezclas", () => {
    const receta = recipe(8, {
      ingredients: [row(HARINA, 1, "kg")],
      presentations: [
        {
          id: 30,
          name: "Docena",
          unitsPerBatch: 12,
          salePrice: 6,
          fixedCosts: [],
        },
      ],
    });

    const { summary } = calculateProduction(
      [selection(8, { batches: 3 })],
      [receta],
    );
    const presentation = summary.perRecipe[0]?.presentations[0];

    // Costo total $75 en 36 unidades → $2.0833 por unidad; ingreso $216.
    expect(presentation?.totalUnits).toBe(36);
    expect(presentation?.unitCost).toBeCloseTo(75 / 36);
    expect(presentation?.revenue).toBeCloseTo(216);
  });
});

describe("presentationMargin", () => {
  it("devuelve null sin ingresos o sin costo", () => {
    expect(presentationMargin(0, 25)).toBeNull();
    expect(presentationMargin(120, 0)).toBeNull();
  });

  it("calcula el margen sobre los ingresos", () => {
    expect(presentationMargin(120, 25)).toBeCloseTo((95 / 120) * 100);
  });
});

describe("bestPresentationId", () => {
  it("elige el mayor margen con ingresos", () => {
    const result = {
      recipeId: 1,
      recipeName: "Tarta",
      batches: 1,
      ingredientsCost: 25,
      operationalCost: 0,
      totalCost: 25,
      presentations: [
        {
          id: 1,
          name: "A",
          totalUnits: 8,
          unitCost: 3.125,
          salePrice: 12,
          revenue: 96,
        },
        {
          id: 2,
          name: "B",
          totalUnits: 24,
          unitCost: 1.04,
          salePrice: 5,
          revenue: 120,
        },
        { id: 3, name: "C", totalUnits: 5, unitCost: 5, revenue: 0 },
      ],
    };

    expect(bestPresentationId(result)).toBe(2);
  });

  it("devuelve null cuando nada genera ingresos", () => {
    const result = {
      recipeId: 1,
      recipeName: "Tarta",
      batches: 1,
      ingredientsCost: 25,
      operationalCost: 0,
      totalCost: 25,
      presentations: [
        { id: 1, name: "A", totalUnits: 8, unitCost: 3.125, revenue: 0 },
      ],
    };

    expect(bestPresentationId(result)).toBeNull();
  });
});
