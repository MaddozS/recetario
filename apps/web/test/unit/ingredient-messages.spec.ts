import { describe, expect, it } from "vitest";
import {
  DELETED_INGREDIENT_MESSAGE,
  INGREDIENT_IN_USE_MESSAGE,
  ingredientLimitMessage,
  isIngredientInUse,
  resolveIngredientMutationError,
} from "../../app/features/ingredients/ingredient-messages";

const CONFLICT = {
  status: 409,
  code: "DOMAIN_ERROR",
  reason: "ingredient_in_use",
  message: "Ingredient is in use by existing recipes",
};

describe("ingredientLimitMessage", () => {
  it("conserva el copy heredado (sin tildes) con el límite del plan", () => {
    expect(ingredientLimitMessage(30)).toBe(
      "Has alcanzado el limite de 30 ingredientes de tu plan Free. Actualiza tu plan para crear mas.",
    );
  });

  it("omite el rango cuando el plan es ilimitado (defensivo)", () => {
    expect(ingredientLimitMessage(null)).toBe(
      "Has alcanzado el limite de ingredientes de tu plan Free. Actualiza tu plan para crear mas.",
    );
  });
});

describe("isIngredientInUse", () => {
  it("reconoce el 409 con reason ingredient_in_use", () => {
    expect(isIngredientInUse(CONFLICT)).toBe(true);
    expect(isIngredientInUse({ status: 409, reason: "otro" })).toBe(false);
    expect(
      isIngredientInUse({ status: 404, reason: "ingredient_in_use" }),
    ).toBe(false);
    expect(isIngredientInUse(new Error("boom"))).toBe(false);
    expect(isIngredientInUse(null)).toBe(false);
  });
});

describe("resolveIngredientMutationError", () => {
  it("mapea el conflicto de uso con la lista de recetas local", () => {
    expect(
      resolveIngredientMutationError(CONFLICT, {
        action: "delete",
        limit: 30,
        usedRecipes: ["Tarta", "Flan"],
      }),
    ).toEqual({
      message: INGREDIENT_IN_USE_MESSAGE,
      recipes: ["Tarta", "Flan"],
    });
  });

  it("mapea el conflicto sin recetas locales (fallback vacío)", () => {
    expect(
      resolveIngredientMutationError(CONFLICT, { action: "delete", limit: 30 }),
    ).toEqual({ message: INGREDIENT_IN_USE_MESSAGE, recipes: undefined });
  });

  it("mapea el 404 al ingrediente que ya no existe", () => {
    expect(
      resolveIngredientMutationError(
        { status: 404, code: "NOT_FOUND", message: "Ingredient not found" },
        { action: "update", limit: null },
      ),
    ).toEqual({ message: DELETED_INGREDIENT_MESSAGE });
  });

  it("marca planLimit sólo con el código PLAN_LIMIT", () => {
    expect(
      resolveIngredientMutationError(
        {
          status: 403,
          code: "PLAN_LIMIT",
          message: "Ingredient limit reached for your plan (30)",
        },
        { action: "create", limit: 30 },
      ),
    ).toEqual({
      message: ingredientLimitMessage(30),
      planLimit: true,
    });
  });

  it("usa el mensaje del API cuando es un error de respuesta", () => {
    expect(
      resolveIngredientMutationError(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid ingredient input",
        },
        { action: "create", limit: null },
      ),
    ).toEqual({ message: "Invalid ingredient input" });
  });

  it("no filtra mensajes internos de fallos de red", () => {
    expect(
      resolveIngredientMutationError(
        new Error("[POST] /api/ingredients: fetch failed"),
        {
          action: "create",
          limit: null,
        },
      ),
    ).toEqual({ message: "No se pudo crear el ingrediente." });
  });

  it("cae al mensaje por acción cuando el error no es reconocible", () => {
    expect(
      resolveIngredientMutationError("boom", { action: "update", limit: null }),
    ).toEqual({ message: "No se pudo actualizar el ingrediente." });
    expect(
      resolveIngredientMutationError(undefined, {
        action: "delete",
        limit: null,
      }),
    ).toEqual({ message: "No se pudo eliminar el ingrediente." });
  });
});
