import { describe, expect, it } from "vitest";
import {
  lastUpdatedAt,
  recentRecipes,
  recipeStats,
} from "../../app/features/recipes/recipe-stats";

type TestRecipe = {
  id: number;
  name: string;
  category?: string;
  ingredientCount: number;
  updatedAt?: string;
};

function recipe(id: number, overrides: Partial<TestRecipe> = {}): TestRecipe {
  return { id, name: `Receta ${id}`, ingredientCount: 1, ...overrides };
}

const TARTA = recipe(1, {
  name: "Tarta de Chocolate",
  category: "Postres",
  ingredientCount: 3,
  updatedAt: "2026-09-14T10:00:00.000Z",
});
const BROWNIE = recipe(2, {
  name: "Brownie Clásico",
  ingredientCount: 0,
  updatedAt: "2026-09-15T09:00:00.000Z",
});
const PAN = recipe(3, {
  name: "Pan de Masa Madre",
  category: "Panes",
  ingredientCount: 2,
  updatedAt: "2026-09-13T10:00:00.000Z",
});
const FLAN = recipe(4, {
  name: "Flan de Café",
  category: "Postres",
  ingredientCount: 1,
  updatedAt: "2026-09-12T10:00:00.000Z",
});
const RECIPES = [TARTA, BROWNIE, PAN, FLAN];

describe("recipeStats", () => {
  it("resume recetas, categorías, incompletas y sin categoría", () => {
    expect(recipeStats(RECIPES, 4)).toEqual({
      recipeCount: 4,
      categoryCount: 2,
      ingredientCount: 4,
      incompleteCount: 1,
      withoutCategoryCount: 1,
      lastUpdatedAt: "2026-09-15T09:00:00.000Z",
    });
  });

  it("con la lista vacía devuelve todo en cero", () => {
    expect(recipeStats([], 0)).toEqual({
      recipeCount: 0,
      categoryCount: 0,
      ingredientCount: 0,
      incompleteCount: 0,
      withoutCategoryCount: 0,
      lastUpdatedAt: null,
    });
  });

  it("cuenta como incompletas sólo las que no tienen ingredientes", () => {
    expect(recipeStats([BROWNIE], 0).incompleteCount).toBe(1);
    expect(recipeStats([TARTA], 1).incompleteCount).toBe(0);
  });
});

describe("lastUpdatedAt", () => {
  it("devuelve la fecha más reciente", () => {
    expect(lastUpdatedAt(RECIPES)).toBe("2026-09-15T09:00:00.000Z");
  });

  it("ignora las recetas sin fecha", () => {
    const sinFecha = recipe(5, { updatedAt: undefined });
    expect(lastUpdatedAt([sinFecha, PAN])).toBe("2026-09-13T10:00:00.000Z");
    expect(lastUpdatedAt([sinFecha])).toBeNull();
    expect(lastUpdatedAt([])).toBeNull();
  });
});

describe("recentRecipes", () => {
  it("ordena por fecha descendente", () => {
    expect(recentRecipes(RECIPES).map((item) => item.id)).toEqual([2, 1, 3, 4]);
  });

  it("limita a cinco por defecto", () => {
    const many = Array.from({ length: 8 }, (_, index) =>
      recipe(index + 1, { updatedAt: `2026-09-0${index + 1}T10:00:00.000Z` }),
    );

    expect(recentRecipes(many)).toHaveLength(5);
    expect(recentRecipes(many, 2).map((item) => item.id)).toEqual([8, 7]);
  });

  it("deja fuera las recetas sin fecha", () => {
    expect(recentRecipes([recipe(9, { updatedAt: undefined }), PAN])).toEqual([
      PAN,
    ]);
    expect(recentRecipes([])).toEqual([]);
  });
});
