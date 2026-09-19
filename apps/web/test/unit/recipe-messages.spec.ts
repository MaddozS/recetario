import { describe, expect, it } from "vitest";
import {
  DELETED_RECIPE_MESSAGE,
  DUPLICATE_FEATURE_MESSAGE,
  FIXED_COST_NOT_FOUND_MESSAGE,
  PRESENTATION_NOT_FOUND_MESSAGE,
  RECIPE_NOT_FOUND_MESSAGE,
  recipeLimitMessage,
  resolveRecipeFinancialsError,
  resolveRecipeMutationError,
} from "../../app/features/recipes/recipe-messages";

const PLAN_LIMIT = {
  status: 403,
  code: "PLAN_LIMIT",
  message: "Recipe limit reached for your plan (10)",
};

const FEATURE_REQUIRED = {
  status: 403,
  code: "FEATURE_REQUIRED",
  message: "Feature not available in your plan: recipe_duplicate",
};

const NOT_FOUND = {
  status: 404,
  code: "NOT_FOUND",
  message: "Recipe not found",
};

describe("recipeLimitMessage", () => {
  it("incluye el límite del plan con las tildes corregidas", () => {
    expect(recipeLimitMessage(10)).toBe(
      "Has alcanzado el límite de 10 recetas de tu plan Free. Actualiza tu plan para crear más.",
    );
  });

  it("omite el rango cuando el plan es ilimitado (defensivo)", () => {
    expect(recipeLimitMessage(null)).toBe(
      "Has alcanzado el límite de recetas de tu plan Free. Actualiza tu plan para crear más.",
    );
  });
});

describe("resolveRecipeMutationError", () => {
  it("marca planLimit sólo con el código PLAN_LIMIT", () => {
    expect(
      resolveRecipeMutationError(PLAN_LIMIT, { action: "create", limit: 10 }),
    ).toEqual({ message: recipeLimitMessage(10), planLimit: true });
  });

  it("no ofrece upgrade cuando falta la feature de duplicar", () => {
    expect(
      resolveRecipeMutationError(FEATURE_REQUIRED, {
        action: "duplicate",
        limit: 10,
      }),
    ).toEqual({ message: DUPLICATE_FEATURE_MESSAGE });
  });

  it("distingue el 404 de duplicar del de eliminar", () => {
    expect(
      resolveRecipeMutationError(NOT_FOUND, {
        action: "duplicate",
        limit: null,
      }),
    ).toEqual({ message: RECIPE_NOT_FOUND_MESSAGE });
    expect(
      resolveRecipeMutationError(NOT_FOUND, { action: "delete", limit: null }),
    ).toEqual({ message: DELETED_RECIPE_MESSAGE });
  });

  it("cae al mensaje por acción cuando el 404 no aplica", () => {
    expect(
      resolveRecipeMutationError(NOT_FOUND, { action: "create", limit: null }),
    ).toEqual({ message: "No se pudo crear la receta." });
  });

  it("usa el mensaje del API cuando es un error de respuesta", () => {
    expect(
      resolveRecipeMutationError(
        {
          status: 400,
          code: "VALIDATION_ERROR",
          message: "Invalid recipe input",
        },
        { action: "create", limit: null },
      ),
    ).toEqual({ message: "Invalid recipe input" });
  });

  it("no filtra mensajes internos de fallos de red", () => {
    expect(
      resolveRecipeMutationError(
        new Error("[POST] /api/recipes: fetch failed"),
        {
          action: "duplicate",
          limit: null,
        },
      ),
    ).toEqual({ message: "Error al duplicar la receta." });
  });

  it("cae al mensaje por acción cuando el error no es reconocible", () => {
    expect(
      resolveRecipeMutationError("boom", { action: "create", limit: null }),
    ).toEqual({ message: "No se pudo crear la receta." });
    expect(
      resolveRecipeMutationError(undefined, { action: "delete", limit: null }),
    ).toEqual({ message: "No se pudo eliminar la receta." });
  });

  it("trata la receta desaparecida al guardar como eliminada", () => {
    expect(
      resolveRecipeMutationError(NOT_FOUND, { action: "update", limit: 10 }),
    ).toEqual({ message: DELETED_RECIPE_MESSAGE });
  });

  it("cae al mensaje de guardado cuando el error no es reconocible", () => {
    expect(
      resolveRecipeMutationError(undefined, { action: "update", limit: null }),
    ).toEqual({ message: "No se pudo actualizar la receta." });
  });
});

describe("resolveRecipeFinancialsError", () => {
  it("traduce el 404 según el recurso", () => {
    expect(
      resolveRecipeFinancialsError(NOT_FOUND, { action: "update-fixed-cost" }),
    ).toEqual({ message: FIXED_COST_NOT_FOUND_MESSAGE });
    expect(
      resolveRecipeFinancialsError(NOT_FOUND, {
        action: "delete-presentation",
      }),
    ).toEqual({ message: PRESENTATION_NOT_FOUND_MESSAGE });
  });

  it("nunca ofrece upgrade: ni costos fijos ni presentaciones están gateados", () => {
    const planLimit = resolveRecipeFinancialsError(PLAN_LIMIT, {
      action: "create-presentation",
    });
    const feature = resolveRecipeFinancialsError(FEATURE_REQUIRED, {
      action: "create-fixed-cost",
    });

    expect(planLimit.planLimit).toBeUndefined();
    expect(feature.planLimit).toBeUndefined();
  });

  it("usa el mensaje del API cuando es un error de respuesta", () => {
    expect(
      resolveRecipeFinancialsError(
        {
          status: 500,
          code: "INTERNAL",
          message: "Fallo simulado del servidor",
        },
        { action: "create-fixed-cost" },
      ),
    ).toEqual({ message: "Fallo simulado del servidor" });
  });

  it("cae al mensaje en español por acción", () => {
    expect(
      resolveRecipeFinancialsError(new Error("fetch failed"), {
        action: "update-fixed-cost",
      }),
    ).toEqual({ message: "No se pudo guardar el costo fijo." });
    expect(
      resolveRecipeFinancialsError(undefined, {
        action: "delete-fixed-cost",
      }),
    ).toEqual({ message: "No se pudo eliminar el costo fijo." });
    expect(
      resolveRecipeFinancialsError(undefined, {
        action: "create-presentation",
      }),
    ).toEqual({ message: "No se pudo crear la presentación." });
    expect(
      resolveRecipeFinancialsError(undefined, {
        action: "update-presentation",
      }),
    ).toEqual({ message: "No se pudo actualizar la presentación." });
    expect(
      resolveRecipeFinancialsError(undefined, {
        action: "delete-presentation",
      }),
    ).toEqual({ message: "No se pudo eliminar la presentación." });
  });
});
