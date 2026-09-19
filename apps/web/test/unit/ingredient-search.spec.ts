import { describe, expect, it } from "vitest";
import {
  filterIngredients,
  matchesIngredientSearch,
  normalizeSearchText,
} from "../../app/features/ingredients/ingredient-search";

const INGREDIENTS = [
  { id: 1, name: "Plátano", supplier: "Frutería del Sur", brand: "Del Campo" },
  { id: 2, name: "Harina de trigo", supplier: null, brand: undefined },
  { id: 3, name: "CAFÉ molido", supplier: "Casa Santos", brand: null },
];

describe("normalizeSearchText", () => {
  it("quita diacríticos, baja a minúsculas y recorta", () => {
    expect(normalizeSearchText("  Plátano  ")).toBe("platano");
    expect(normalizeSearchText("CAFÉ")).toBe("cafe");
    expect(normalizeSearchText("Pan de Muerto")).toBe("pan de muerto");
  });
});

describe("matchesIngredientSearch", () => {
  it("encuentra sin tilde y con tilde en ambas direcciones", () => {
    expect(matchesIngredientSearch(INGREDIENTS[0], "platano")).toBe(true);
    expect(matchesIngredientSearch(INGREDIENTS[0], "Plátano")).toBe(true);
    expect(matchesIngredientSearch(INGREDIENTS[2], "cafe")).toBe(true);
    expect(matchesIngredientSearch(INGREDIENTS[2], "CAFÉ")).toBe(true);
  });

  it("busca también por proveedor y marca", () => {
    expect(matchesIngredientSearch(INGREDIENTS[0], "fruteria")).toBe(true);
    expect(matchesIngredientSearch(INGREDIENTS[0], "del campo")).toBe(true);
    expect(matchesIngredientSearch(INGREDIENTS[1], "fruteria")).toBe(false);
  });

  it("con query vacía todo coincide", () => {
    expect(matchesIngredientSearch(INGREDIENTS[0], "")).toBe(true);
    expect(matchesIngredientSearch(INGREDIENTS[0], "   ")).toBe(true);
  });
});

describe("filterIngredients", () => {
  it("devuelve todos cuando no hay búsqueda", () => {
    const result = filterIngredients(INGREDIENTS, "  ");
    expect(result).toHaveLength(3);
    expect(result).not.toBe(INGREDIENTS);
  });

  it("filtra por nombre, proveedor o marca sin acentos", () => {
    expect(filterIngredients(INGREDIENTS, "platano").map((i) => i.id)).toEqual([
      1,
    ]);
    expect(filterIngredients(INGREDIENTS, "santos").map((i) => i.id)).toEqual([
      3,
    ]);
    expect(
      filterIngredients(INGREDIENTS, "del campo").map((i) => i.id),
    ).toEqual([1]);
  });

  it("devuelve vacío cuando nada coincide", () => {
    expect(filterIngredients(INGREDIENTS, "queso")).toEqual([]);
  });
});
