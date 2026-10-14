import { describe, expect, it } from 'vitest';
import { filterRecipeGroups, groupRecipes } from '../../app/features/production/production-catalog';
import type { ProductionCatalogRecipe } from '../../app/features/production/production-types';

type TestRecipe = ProductionCatalogRecipe;

function recipe(id: number, overrides: Partial<TestRecipe> = {}): TestRecipe {
  return { id, name: `Receta ${id}`, ingredientCount: 0, ...overrides };
}

const PAN = recipe(1, { name: 'Pan de Masa Madre', category: 'Panes' });
const TARTA = recipe(2, { name: 'Tarta de Chocolate', category: 'Postres' });
const FLAN = recipe(3, { name: 'Flan de Café', category: 'Postres' });
const BROWNIE = recipe(4, { name: 'Brownie Clásico' });

describe('groupRecipes', () => {
  it('agrupa por categoría en orden de aparición y alfabético dentro del grupo', () => {
    const { groups, hasCategories } = groupRecipes([PAN, TARTA, FLAN, BROWNIE]);

    expect(hasCategories).toBe(true);
    expect(groups.map((group) => group.label)).toEqual(['Panes', 'Postres', 'Sin categoría']);
    expect(groups[1]?.recipes.map((item) => item.name)).toEqual([
      'Flan de Café',
      'Tarta de Chocolate',
    ]);
  });

  it('sin categorías deja una lista única sin leyenda', () => {
    const { groups, hasCategories } = groupRecipes([BROWNIE, recipe(5, { name: 'Alfajor' })]);

    expect(hasCategories).toBe(false);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.label).toBeNull();
    expect(groups[0]?.recipes.map((item) => item.name)).toEqual(['Alfajor', 'Brownie Clásico']);
  });
});

describe('filterRecipeGroups', () => {
  const { groups } = groupRecipes([PAN, TARTA, FLAN, BROWNIE]);

  it('busca sin acentos ni mayúsculas', () => {
    const { groups: filtered, visibleCount } = filterRecipeGroups(groups, 'CLASICO', new Set());

    expect(visibleCount).toBe(1);
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.recipes.map((item) => item.id)).toEqual([4]);
  });

  it('mantiene visibles las seleccionadas aunque no coincidan', () => {
    const { groups: filtered, visibleCount } = filterRecipeGroups(
      groups,
      'chocolate',
      new Set([1])
    );

    expect(visibleCount).toBe(2);
    expect(filtered.map((group) => group.label)).toEqual(['Panes', 'Postres']);
    expect(filtered[0]?.recipes.map((item) => item.id)).toEqual([1]);
  });

  it('oculta los grupos sin coincidencias y reporta el vacío', () => {
    const { groups: filtered, visibleCount } = filterRecipeGroups(groups, 'sushi', new Set());

    expect(filtered).toEqual([]);
    expect(visibleCount).toBe(0);
  });

  it('con la búsqueda vacía deja todo visible', () => {
    const { groups: filtered, visibleCount } = filterRecipeGroups(groups, '   ', new Set());

    expect(filtered).toHaveLength(3);
    expect(visibleCount).toBe(4);
  });

  it('no muta los grupos originales', () => {
    filterRecipeGroups(groups, 'chocolate', new Set());
    expect(groups[1]?.recipes).toHaveLength(2);
  });
});
