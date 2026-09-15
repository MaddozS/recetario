import { describe, expect, it } from "vitest";
import {
  createEmptyIngredientForm,
  formatUnitCost,
  ingredientFormFrom,
  isIngredientFormValid,
  isValidIngredientPrice,
  isValidIngredientQuantity,
  parseIngredientNumber,
  toIngredientInput,
  validateIngredientInput,
} from "../../app/features/ingredients/ingredient-form";
import {
  DEFAULT_UNIT,
  UNIT_OPTIONS,
} from "../../app/features/ingredients/ingredient-units";

describe("parseIngredientNumber", () => {
  it("acepta coma y punto como separador decimal", () => {
    expect(parseIngredientNumber("12,5")).toBe(12.5);
    expect(parseIngredientNumber("12.5")).toBe(12.5);
    expect(parseIngredientNumber(" 7 ")).toBe(7);
    expect(parseIngredientNumber("0")).toBe(0);
    expect(parseIngredientNumber("0,25")).toBe(0.25);
  });

  it("devuelve NaN cuando no hay número", () => {
    expect(parseIngredientNumber("")).toBeNaN();
    expect(parseIngredientNumber("   ")).toBeNaN();
    expect(parseIngredientNumber("abc")).toBeNaN();
    expect(parseIngredientNumber(null)).toBeNaN();
    expect(parseIngredientNumber(undefined)).toBeNaN();
  });
});

describe("validez de los campos numéricos", () => {
  it("el precio debe ser finito y no negativo", () => {
    expect(isValidIngredientPrice("0")).toBe(true);
    expect(isValidIngredientPrice("12,5")).toBe(true);
    expect(isValidIngredientPrice("-1")).toBe(false);
    expect(isValidIngredientPrice("")).toBe(false);
    expect(isValidIngredientPrice("abc")).toBe(false);
  });

  it("la cantidad de empaque debe ser mayor a 0", () => {
    expect(isValidIngredientQuantity("1")).toBe(true);
    expect(isValidIngredientQuantity("0,5")).toBe(true);
    expect(isValidIngredientQuantity("0")).toBe(false);
    expect(isValidIngredientQuantity("-2")).toBe(false);
    expect(isValidIngredientQuantity("")).toBe(false);
  });
});

describe("isIngredientFormValid", () => {
  const valid = { ...createEmptyIngredientForm(), name: "Harina", price: "25" };

  it("exige nombre, precio y cantidad válidos (gate del submit)", () => {
    expect(isIngredientFormValid(valid)).toBe(true);
    expect(isIngredientFormValid({ ...valid, name: "   " })).toBe(false);
    expect(isIngredientFormValid({ ...valid, price: "" })).toBe(false);
    expect(isIngredientFormValid({ ...valid, purchaseQuantity: "0" })).toBe(
      false,
    );
  });

  it("no exige proveedor ni marca", () => {
    expect(isIngredientFormValid({ ...valid, supplier: "", brand: "" })).toBe(
      true,
    );
  });
});

describe("validateIngredientInput", () => {
  const valid = { ...createEmptyIngredientForm(), name: "Harina", price: "25" };

  it("devuelve los mensajes verbatim del formulario heredado", () => {
    expect(validateIngredientInput({ ...valid, name: "" })).toBe(
      "Nombre, unidad y precio empaque son obligatorios.",
    );
    expect(validateIngredientInput({ ...valid, unit: "" })).toBe(
      "Nombre, unidad y precio empaque son obligatorios.",
    );
    expect(validateIngredientInput({ ...valid, price: "" })).toBe(
      "Nombre, unidad y precio empaque son obligatorios.",
    );
    expect(validateIngredientInput({ ...valid, purchaseQuantity: "0" })).toBe(
      "La cantidad de empaque debe ser mayor a 0 (puedes usar decimales).",
    );
  });

  it("acepta un formulario completo", () => {
    expect(validateIngredientInput(valid)).toBeNull();
  });
});

describe("formatUnitCost", () => {
  it("divide el precio del empaque entre su contenido", () => {
    expect(formatUnitCost(25, 2)).toBe("$12.50");
    expect(formatUnitCost(10, 1)).toBe("$10.00");
    expect(formatUnitCost(0, 3)).toBe("$0.00");
    expect(formatUnitCost(12.345, 1)).toBe("$12.35");
  });

  it("devuelve $0.00 cuando el par no es calculable", () => {
    expect(formatUnitCost(Number.NaN, 2)).toBe("$0.00");
    expect(formatUnitCost(25, Number.NaN)).toBe("$0.00");
    expect(formatUnitCost(25, 0)).toBe("$0.00");
    expect(formatUnitCost(-5, 2)).toBe("$0.00");
  });
});

describe("toIngredientInput", () => {
  it("recorta, parsea coma decimal y omite marca/proveedor vacíos", () => {
    expect(
      toIngredientInput({
        name: "  Harina  ",
        supplier: "  ",
        brand: "",
        price: "12,5",
        purchaseQuantity: "2,5",
        unit: " kg ",
      }),
    ).toEqual({
      name: "Harina",
      unit: "kg",
      price: 12.5,
      purchaseQuantity: 2.5,
      brand: undefined,
      supplier: undefined,
    });
  });

  it("conserva marca y proveedor cuando existen", () => {
    expect(
      toIngredientInput({
        name: "Harina",
        supplier: "Casa Santos",
        brand: "Del Campo",
        price: "25",
        purchaseQuantity: "1",
        unit: "kg",
      }),
    ).toEqual({
      name: "Harina",
      unit: "kg",
      price: 25,
      purchaseQuantity: 1,
      brand: "Del Campo",
      supplier: "Casa Santos",
    });
  });
});

describe("ingredientFormFrom", () => {
  it("convierte números a strings y nulos a vacío", () => {
    expect(
      ingredientFormFrom({
        name: "Plátano",
        unit: "kg",
        price: 12.5,
        purchaseQuantity: 2,
        brand: null,
        supplier: "Frutería",
      }),
    ).toEqual({
      name: "Plátano",
      supplier: "Frutería",
      brand: "",
      price: "12.5",
      purchaseQuantity: "2",
      unit: "kg",
    });
  });
});

describe("createEmptyIngredientForm", () => {
  it("arranca con cantidad 1 y la unidad por defecto", () => {
    expect(createEmptyIngredientForm()).toEqual({
      name: "",
      supplier: "",
      brand: "",
      price: "",
      purchaseQuantity: "1",
      unit: DEFAULT_UNIT,
    });
  });
});

describe("unidades", () => {
  it("conserva las nueve unidades heredadas en orden", () => {
    expect([...UNIT_OPTIONS]).toEqual([
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
    expect(DEFAULT_UNIT).toBe("kg");
  });
});
