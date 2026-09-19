import { describe, expect, it } from "vitest";
import {
  emptyIngredientsSnapshot,
  withCreated,
  withRemoved,
  withUpdated,
} from "../../app/features/ingredients/ingredient-state";
import type {
  IngredientsSnapshot,
  IngredientRecord,
} from "../../app/features/ingredients/ingredient-state";

function ingredient(id: number, name: string): IngredientRecord {
  return { id, name, unit: "kg", price: 10, purchaseQuantity: 1 };
}

function baseSnapshot(): IngredientsSnapshot {
  return {
    ingredients: [ingredient(1, "Harina"), ingredient(2, "Plátano")],
    usage: { "1": ["Tarta"], "2": ["Flan"] },
    counts: { recipes: 2, ingredients: 2 },
  };
}

describe("emptyIngredientsSnapshot", () => {
  it("arranca vacío y en ceros", () => {
    expect(emptyIngredientsSnapshot()).toEqual({
      ingredients: [],
      usage: {},
      counts: { recipes: 0, ingredients: 0 },
    });
  });
});

describe("withCreated", () => {
  it("añade al final y sube el contador sin mutar la instantánea", () => {
    const snapshot = baseSnapshot();
    const next = withCreated(snapshot, ingredient(3, "Café"));

    expect(next.ingredients.map((item) => item.id)).toEqual([1, 2, 3]);
    expect(next.counts).toEqual({ recipes: 2, ingredients: 3 });
    expect(next.usage).toBe(snapshot.usage);
    expect(snapshot.ingredients).toHaveLength(2);
    expect(snapshot.counts.ingredients).toBe(2);
  });
});

describe("withUpdated", () => {
  it("reemplaza la fila por id y conserva el resto", () => {
    const snapshot = baseSnapshot();
    const next = withUpdated(snapshot, {
      ...ingredient(2, "Plátano macho"),
      price: 25,
    });

    expect(next.ingredients[1]).toMatchObject({
      id: 2,
      name: "Plátano macho",
      price: 25,
    });
    expect(next.ingredients[0]).toBe(snapshot.ingredients[0]);
    expect(next.counts).toEqual(snapshot.counts);
  });

  it("no inventa filas cuando el id no existe", () => {
    const next = withUpdated(baseSnapshot(), ingredient(99, "Fantasma"));
    expect(next.ingredients.map((item) => item.id)).toEqual([1, 2]);
  });
});

describe("withRemoved", () => {
  it("elimina la fila, su uso y baja el contador", () => {
    const snapshot = baseSnapshot();
    const next = withRemoved(snapshot, 1);

    expect(next.ingredients.map((item) => item.id)).toEqual([2]);
    expect(next.usage).toEqual({ "2": ["Flan"] });
    expect(next.counts).toEqual({ recipes: 2, ingredients: 1 });
    expect(snapshot.usage).toEqual({ "1": ["Tarta"], "2": ["Flan"] });
  });

  it("no baja el contador por debajo de cero", () => {
    const next = withRemoved(
      { ingredients: [], usage: {}, counts: { recipes: 0, ingredients: 0 } },
      7,
    );
    expect(next.counts.ingredients).toBe(0);
  });
});
