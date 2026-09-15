import { describe, expect, it } from "vitest";
import {
  addIngredientRow,
  buildFinancialEditFields,
  buildUnitOptions,
  EMPTY_ROWS_MESSAGE,
  emptyIngredientRow,
  formFromDetail,
  formatIngredientLabel,
  getUnitOptionsForValue,
  INVALID_ROWS_MESSAGE,
  invalidRows,
  NAME_ERROR_MESSAGE,
  parseDecimal,
  removeIngredientRow,
  toIngredientRows,
  toRecipeUpdatePayload,
  updateIngredientRow,
  validateRecipeForm,
} from "../../app/features/recipes/recipe-detail-form";
import type {
  IngredientRow,
  RecipeDetailForm,
  RecipeDetailRecord,
} from "../../app/features/recipes/recipe-detail-form";

function keyFactory(): () => string {
  let index = 0;
  return () => `k${++index}`;
}

const HARINA = {
  id: 1,
  name: "Harina de trigo",
  unit: "kg",
  price: 25,
  purchaseQuantity: 1,
  brand: "Del Campo",
};

const PLATANO = {
  id: 2,
  name: "Plátano",
  unit: "kg",
  price: 18,
  purchaseQuantity: 2,
};

const DETAIL: RecipeDetailRecord = {
  id: 1,
  name: "Tarta de Chocolate",
  category: "Postres",
  desiredMargin: 30,
  fixedCostsPercentage: 10,
  ingredients: [
    {
      ingredientId: 1,
      quantity: 0.5,
      unit: "kg",
      comment: "Para la masa",
      ingredient: HARINA,
    },
    { ingredientId: 2, quantity: 2, unit: "kg", ingredient: PLATANO },
  ],
  presentations: [],
  recipeFixedCosts: [],
};

function form(overrides: Partial<RecipeDetailForm> = {}): RecipeDetailForm {
  return {
    name: "Tarta de Chocolate",
    category: "Postres",
    desiredMargin: "30",
    fixedCostsPercentage: "10",
    rows: [
      {
        key: "k1",
        ingredientId: 1,
        label: "Harina de trigo (Del Campo)",
        quantity: "0.5",
        unit: "kg",
        comment: "",
      },
    ],
    ...overrides,
  };
}

describe("parseDecimal", () => {
  it("acepta coma y punto, y rechaza el vacío", () => {
    expect(parseDecimal("12,5")).toBe(12.5);
    expect(parseDecimal("12.5")).toBe(12.5);
    expect(parseDecimal(" 7 ")).toBe(7);
    expect(parseDecimal("")).toBeNaN();
    expect(parseDecimal("   ")).toBeNaN();
    expect(parseDecimal("abc")).toBeNaN();
  });
});

describe("formatIngredientLabel", () => {
  it("añade la marca entre paréntesis cuando existe", () => {
    expect(formatIngredientLabel(HARINA)).toBe("Harina de trigo (Del Campo)");
    expect(formatIngredientLabel(PLATANO)).toBe("Plátano");
  });
});

describe("unidades", () => {
  it("une el catálogo estándar con las unidades descubiertas", () => {
    const options = buildUnitOptions(
      [{ unit: "kg" }, { unit: "sobres" }, { unit: "  " }],
      [{ unit: "lata" }, { unit: "kg" }],
    );

    expect(options.slice(0, 9)).toEqual([
      "kg",
      "g",
      "lt",
      "ml",
      "pza",
      "pieza",
      "cdita",
      "cda",
      "taza",
    ]);
    expect(options).toContain("sobres");
    expect(options).toContain("lata");
    expect(options.filter((unit) => unit === "kg")).toHaveLength(1);
  });

  it("antepone la unidad actual cuando no está en el catálogo", () => {
    expect(getUnitOptionsForValue(["kg", "g"], "kg")[0]).toEqual({
      value: "kg",
      label: "kg",
    });

    expect(getUnitOptionsForValue(["kg"], "lata")[0]).toEqual({
      value: "lata",
      label: "lata",
    });

    expect(getUnitOptionsForValue(["kg"], "")[0]).toEqual({
      value: "",
      label: "Sin unidad",
    });
  });
});

describe("filas del editor", () => {
  it("arranca una fila nueva con cantidad 1 y sin ingrediente", () => {
    expect(emptyIngredientRow("k9")).toEqual({
      key: "k9",
      ingredientId: null,
      label: "",
      quantity: "1",
      unit: "",
      comment: "",
    });
  });

  it("convierte el detalle en filas editables", () => {
    expect(toIngredientRows(DETAIL.ingredients, keyFactory())).toEqual([
      {
        key: "k1",
        ingredientId: 1,
        label: "Harina de trigo (Del Campo)",
        quantity: "0.5",
        unit: "kg",
        comment: "Para la masa",
      },
      {
        key: "k2",
        ingredientId: 2,
        label: "Plátano",
        quantity: "2",
        unit: "kg",
        comment: "",
      },
    ]);
  });

  it("añade, edita y elimina filas sin mutar la anterior", () => {
    const rows = toIngredientRows(DETAIL.ingredients, keyFactory());

    const added = addIngredientRow(rows, "k3");
    expect(added).toHaveLength(3);
    expect(rows).toHaveLength(2);
    expect(added[2]?.key).toBe("k3");

    const updated = updateIngredientRow(rows, 0, { quantity: "1", unit: "g" });
    expect(updated[0]?.quantity).toBe("1");
    expect(updated[0]?.unit).toBe("g");
    expect(rows[0]?.quantity).toBe("0.5");

    const removed = removeIngredientRow(rows, 0);
    expect(removed).toHaveLength(1);
    expect(removed[0]?.ingredientId).toBe(2);
    expect(rows).toHaveLength(2);
  });

  it("señala filas sin ingrediente o con cantidad no positiva", () => {
    const rows: IngredientRow[] = [
      { ...emptyIngredientRow("a"), ingredientId: 1, quantity: "1" },
      { ...emptyIngredientRow("b"), ingredientId: null, quantity: "1" },
      { ...emptyIngredientRow("c"), ingredientId: 2, quantity: "0" },
      { ...emptyIngredientRow("d"), ingredientId: 2, quantity: "" },
    ];

    expect(invalidRows(rows).map((row) => row.key)).toEqual(["b", "c", "d"]);
  });
});

describe("validateRecipeForm", () => {
  it("exige un nombre válido", () => {
    expect(validateRecipeForm(form({ name: "  " }))).toEqual({
      valid: false,
      message: NAME_ERROR_MESSAGE,
    });
    expect(validateRecipeForm(form({ name: "x".repeat(121) }))).toEqual({
      valid: false,
      message: NAME_ERROR_MESSAGE,
    });
  });

  it("exige al menos una fila", () => {
    expect(validateRecipeForm(form({ rows: [] }))).toEqual({
      valid: false,
      message: EMPTY_ROWS_MESSAGE,
    });
  });

  it("bloquea filas incompletas en vez de descartarlas al guardar", () => {
    const rows = [
      { ...emptyIngredientRow("k1"), ingredientId: 1, quantity: "1" },
      { ...emptyIngredientRow("k2"), quantity: "1" },
    ];

    expect(validateRecipeForm(form({ rows }))).toEqual({
      valid: false,
      message: INVALID_ROWS_MESSAGE,
    });
  });

  it("acepta el formulario completo", () => {
    expect(validateRecipeForm(form())).toEqual({ valid: true });
  });
});

describe("toRecipeUpdatePayload", () => {
  const current = {
    name: "Tarta",
    desiredMargin: 25,
    fixedCostsPercentage: 5,
  };

  it("recorta campos, usa «unidad» de respaldo y omite comentarios vacíos", () => {
    const rows: IngredientRow[] = [
      {
        key: "k1",
        ingredientId: 1,
        label: "Harina",
        quantity: "0,5",
        unit: "  ",
        comment: "  ",
      },
      {
        key: "k2",
        ingredientId: 1,
        label: "Harina",
        quantity: "100",
        unit: "g",
        comment: "Para la masa",
      },
    ];

    expect(
      toRecipeUpdatePayload(
        form({ name: "  Tarta v2  ", category: "  Postres  ", rows }),
        current,
      ),
    ).toEqual({
      name: "Tarta v2",
      category: "Postres",
      desiredMargin: 30,
      fixedCostsPercentage: 10,
      ingredients: [
        { ingredientId: 1, quantity: 0.5, unit: "unidad", comment: undefined },
        {
          ingredientId: 1,
          quantity: 100,
          unit: "g",
          comment: "Para la masa",
        },
      ],
    });
  });

  it("omite la categoría vacía y conserva el nombre actual sin nombre nuevo", () => {
    expect(
      toRecipeUpdatePayload(form({ name: "   ", category: "" }), current),
    ).toMatchObject({ name: "Tarta", category: null });
  });

  it("conserva los valores actuales si los porcentajes son inválidos", () => {
    expect(
      toRecipeUpdatePayload(
        form({ desiredMargin: "100", fixedCostsPercentage: "-1" }),
        current,
      ),
    ).toMatchObject({ desiredMargin: 25, fixedCostsPercentage: 5 });

    expect(
      toRecipeUpdatePayload(
        form({ desiredMargin: "", fixedCostsPercentage: "abc" }),
        current,
      ),
    ).toMatchObject({ desiredMargin: 25, fixedCostsPercentage: 5 });
  });
});

describe("buildFinancialEditFields", () => {
  it("sin advanced_costs edita el % operativo y el margen", () => {
    expect(buildFinancialEditFields(false)).toEqual([
      { rowIndex: 1, name: "fixedCostsPercentage", suffix: "%" },
      { rowIndex: 3, name: "desiredMargin", suffix: "%" },
    ]);
  });

  it("con advanced_costs sólo edita el margen", () => {
    expect(buildFinancialEditFields(true)).toEqual([
      { rowIndex: 3, name: "desiredMargin", suffix: "%" },
    ]);
  });
});

describe("formFromDetail", () => {
  it("lleva el detalle al formulario como texto", () => {
    expect(formFromDetail(DETAIL, keyFactory())).toEqual({
      name: "Tarta de Chocolate",
      category: "Postres",
      desiredMargin: "30",
      fixedCostsPercentage: "10",
      rows: [
        {
          key: "k1",
          ingredientId: 1,
          label: "Harina de trigo (Del Campo)",
          quantity: "0.5",
          unit: "kg",
          comment: "Para la masa",
        },
        {
          key: "k2",
          ingredientId: 2,
          label: "Plátano",
          quantity: "2",
          unit: "kg",
          comment: "",
        },
      ],
    });
  });

  it("usa cadena vacía cuando la receta no tiene categoría", () => {
    const { category, ...rest } = DETAIL;
    void category;

    expect(formFromDetail(rest, keyFactory()).category).toBe("");
  });
});
