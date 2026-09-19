import { describe, expect, it } from "vitest";
import {
  filterRecipes,
  matchesCategory,
  matchesRecipeSearch,
  normalizeSearchText,
  recipeCategoryOptions,
  toggleCategory,
  uncategorizedCount,
} from "../../app/features/recipes/recipe-filters";

type TestRecipe = {
  id: number;
  name: string;
  category?: string;
  ingredientCount: number;
  updatedAt: string;
};

function recipe(id: number, overrides: Partial<TestRecipe> = {}): TestRecipe {
  return {
    id,
    name: `Receta ${id}`,
    ingredientCount: 0,
    updatedAt: "2026-09-10T10:00:00.000Z",
    ...overrides,
  };
}

const TARTA = recipe(1, { name: "Tarta de Chocolate", category: "Postres" });
const BROWNIE = recipe(2, { name: "Brownie Clásico" });
const PAN = recipe(3, { name: "Pan de Masa Madre", category: "Panes" });
const FLAN = recipe(4, { name: "Flan de Café", category: "Postres" });
const RECIPES = [TARTA, BROWNIE, PAN, FLAN];

describe("normalizeSearchText", () => {
  it("quita diacríticos, baja a minúsculas y recorta", () => {
    expect(normalizeSearchText("  Brownie Clásico  ")).toBe("brownie clasico");
    expect(normalizeSearchText("CAFÉ")).toBe("cafe");
  });
});

describe("matchesRecipeSearch", () => {
  it("encuentra sin tilde y con tilde en ambas direcciones", () => {
    expect(matchesRecipeSearch(BROWNIE, "clasico")).toBe(true);
    expect(matchesRecipeSearch(BROWNIE, "Clásico")).toBe(true);
    expect(matchesRecipeSearch(FLAN, "cafe")).toBe(true);
    expect(matchesRecipeSearch(FLAN, "CAFÉ")).toBe(true);
  });

  it("sólo busca en el nombre (paridad con el baseline)", () => {
    expect(matchesRecipeSearch(TARTA, "postres")).toBe(false);
  });

  it("con query vacía todo coincide", () => {
    expect(matchesRecipeSearch(TARTA, "")).toBe(true);
    expect(matchesRecipeSearch(TARTA, "   ")).toBe(true);
  });
});

describe("matchesCategory", () => {
  it("sin categoría seleccionada todo coincide", () => {
    expect(matchesCategory(TARTA, null)).toBe(true);
    expect(matchesCategory(BROWNIE, null)).toBe(true);
  });

  it("con cadena vacía sólo las recetas sin categoría", () => {
    expect(matchesCategory(BROWNIE, "")).toBe(true);
    expect(matchesCategory(TARTA, "")).toBe(false);
  });

  it("con un valor compara exacto", () => {
    expect(matchesCategory(TARTA, "Postres")).toBe(true);
    expect(matchesCategory(TARTA, "postres")).toBe(false);
    expect(matchesCategory(PAN, "Postres")).toBe(false);
  });
});

describe("filterRecipes", () => {
  it("devuelve todos sin búsqueda ni categoría", () => {
    const result = filterRecipes(RECIPES, { query: "", category: null });
    expect(result).toHaveLength(4);
    expect(result).not.toBe(RECIPES);
  });

  it("combina búsqueda y categoría", () => {
    expect(
      filterRecipes(RECIPES, { query: "flan", category: "Postres" }).map(
        (item) => item.id,
      ),
    ).toEqual([4]);
    expect(
      filterRecipes(RECIPES, { query: "flan", category: "Panes" }),
    ).toEqual([]);
  });

  it("filtra las recetas sin categoría", () => {
    expect(
      filterRecipes(RECIPES, { query: "", category: "" }).map(
        (item) => item.id,
      ),
    ).toEqual([2]);
  });

  it("devuelve vacío cuando nada coincide", () => {
    expect(filterRecipes(RECIPES, { query: "queso", category: null })).toEqual(
      [],
    );
  });
});

describe("recipeCategoryOptions", () => {
  it("lista las categorías en orden de aparición con su conteo", () => {
    expect(recipeCategoryOptions(RECIPES)).toEqual([
      { value: "Postres", label: "Postres", count: 2 },
      { value: "Panes", label: "Panes", count: 1 },
    ]);
  });

  it("ignora las recetas sin categoría", () => {
    expect(
      recipeCategoryOptions([BROWNIE, TARTA]).map((option) => option.value),
    ).toEqual(["Postres"]);
    expect(recipeCategoryOptions([])).toEqual([]);
  });
});

describe("uncategorizedCount", () => {
  it("cuenta sólo las recetas sin categoría", () => {
    expect(uncategorizedCount(RECIPES)).toBe(1);
    expect(uncategorizedCount([TARTA, PAN])).toBe(0);
    expect(uncategorizedCount([])).toBe(0);
  });
});

describe("toggleCategory", () => {
  it("selecciona, cambia y limpia al repetir la activa", () => {
    expect(toggleCategory(null, "Postres")).toBe("Postres");
    expect(toggleCategory("Panes", "Postres")).toBe("Postres");
    expect(toggleCategory("Postres", "Postres")).toBeNull();
    expect(toggleCategory("", "")).toBeNull();
  });
});
