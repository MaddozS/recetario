import { describe, expect, it } from "vitest";
import {
  emptyRecipesSnapshot,
  toRecipeSummary,
  withCreated,
  withRemoved,
} from "../../app/features/recipes/recipe-state";

const TARTA = {
  id: 1,
  name: "Tarta de Chocolate",
  category: "Postres",
  ingredientCount: 3,
  updatedAt: "2026-09-14T10:00:00.000Z",
};
const PAN = {
  id: 2,
  name: "Pan de Masa Madre",
  category: "Panes",
  ingredientCount: 2,
  updatedAt: "2026-09-13T10:00:00.000Z",
};

describe("emptyRecipesSnapshot", () => {
  it("arranca vacío y sin ingredientes usados", () => {
    expect(emptyRecipesSnapshot()).toEqual({
      recipes: [],
      usedIngredientCount: 0,
    });
  });
});

describe("withCreated", () => {
  it("añade la receta al final sin mutar la instantánea", () => {
    const snapshot = { recipes: [TARTA], usedIngredientCount: 4 };
    const next = withCreated(snapshot, PAN);

    expect(next.recipes.map((item) => item.id)).toEqual([1, 2]);
    expect(next.usedIngredientCount).toBe(4);
    expect(snapshot.recipes).toHaveLength(1);
  });
});

describe("withRemoved", () => {
  it("quita la receta por id sin mutar la instantánea", () => {
    const snapshot = { recipes: [TARTA, PAN], usedIngredientCount: 4 };
    const next = withRemoved(snapshot, 1);

    expect(next.recipes.map((item) => item.id)).toEqual([2]);
    expect(snapshot.recipes).toHaveLength(2);
  });

  it("con un id inexistente deja la lista igual", () => {
    const snapshot = { recipes: [TARTA], usedIngredientCount: 4 };
    expect(withRemoved(snapshot, 99).recipes).toEqual([TARTA]);
  });
});

describe("toRecipeSummary", () => {
  it("deriva el conteo de ingredientes del detalle", () => {
    expect(
      toRecipeSummary({
        id: 9,
        name: "Copia de Tarta",
        category: "Postres",
        updatedAt: "2026-09-15T12:00:00.000Z",
        ingredients: [{}, {}, {}],
      }),
    ).toEqual({
      id: 9,
      name: "Copia de Tarta",
      category: "Postres",
      ingredientCount: 3,
      updatedAt: "2026-09-15T12:00:00.000Z",
    });
  });

  it("omite categoría y fecha cuando no vienen", () => {
    const summary = toRecipeSummary({
      id: 10,
      name: "Nueva Receta",
      ingredients: [],
    });

    expect(summary).toEqual({
      id: 10,
      name: "Nueva Receta",
      ingredientCount: 0,
    });
    expect("category" in summary).toBe(false);
    expect("updatedAt" in summary).toBe(false);
  });
});
