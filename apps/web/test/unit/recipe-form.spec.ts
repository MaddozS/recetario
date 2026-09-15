import { describe, expect, it } from "vitest";
import {
  MAX_RECIPE_NAME_LENGTH,
  createEmptyRecipeForm,
  isRecipeFormValid,
  toRecipeInput,
} from "../../app/features/recipes/recipe-form";

describe("createEmptyRecipeForm", () => {
  it("arranca con el nombre vacío", () => {
    expect(createEmptyRecipeForm()).toEqual({ name: "" });
  });
});

describe("isRecipeFormValid", () => {
  it("exige un nombre no vacío", () => {
    expect(isRecipeFormValid({ name: "" })).toBe(false);
    expect(isRecipeFormValid({ name: "   " })).toBe(false);
    expect(isRecipeFormValid({ name: "Tarta" })).toBe(true);
  });

  it("respeta el máximo del contrato del API", () => {
    expect(
      isRecipeFormValid({ name: "a".repeat(MAX_RECIPE_NAME_LENGTH) }),
    ).toBe(true);
    expect(
      isRecipeFormValid({ name: "a".repeat(MAX_RECIPE_NAME_LENGTH + 1) }),
    ).toBe(false);
  });

  it("ignora los espacios al medir", () => {
    const name = ` ${"a".repeat(MAX_RECIPE_NAME_LENGTH)} `;
    expect(isRecipeFormValid({ name })).toBe(true);
  });
});

describe("toRecipeInput", () => {
  it("recorta el nombre antes de enviarlo", () => {
    expect(toRecipeInput({ name: "  Brownie clásico  " })).toEqual({
      name: "Brownie clásico",
    });
  });
});
