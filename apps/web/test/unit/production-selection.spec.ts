import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BATCHES,
  PRODUCTION_BASIC_RECIPE_LIMIT,
  atLimit,
  filterToCatalog,
  normalizeBatches,
  parseSelections,
  resolveSelections,
  selectAll,
  serializeSelections,
  setBatches,
  setPresentation,
  stepBatches,
  toggleRecipe,
} from '../../app/features/production/production-selection';
import type { ProductionSelection } from '../../app/features/production/production-types';

const PRO = Number.POSITIVE_INFINITY;

function entry(
  recipeId: number,
  overrides: Partial<ProductionSelection> = {}
): ProductionSelection {
  return { recipeId, batches: DEFAULT_BATCHES, ...overrides };
}

describe('parseSelections', () => {
  it('lee recetas, mezclas y presentaciones alineadas', () => {
    const selections = parseSelections({
      recipes: '1,2',
      batches: '2,0.5',
      presentations: '0,7',
    });

    expect(selections).toEqual([
      { recipeId: 1, batches: 2 },
      { recipeId: 2, batches: 0.5, presentationId: 7 },
    ]);
  });

  it('sin query no hay selección', () => {
    expect(parseSelections({})).toEqual([]);
    expect(parseSelections({ recipes: '' })).toEqual([]);
  });

  it('usa 1 mezcla cuando faltan o son inválidas', () => {
    expect(parseSelections({ recipes: '1,2,3' })).toEqual([entry(1), entry(2), entry(3)]);
    expect(parseSelections({ recipes: '1,2', batches: '0,-2' })).toEqual([entry(1), entry(2)]);
  });

  it('descarta ids inválidos y duplicados', () => {
    const selections = parseSelections({ recipes: 'abc,1,1,0,-3,2' });
    expect(selections.map((selection) => selection.recipeId)).toEqual([1, 2]);
  });

  it('mantiene la alineación de presentaciones con huecos (`0`)', () => {
    // Regresión del baseline: al filtrar los indefinidos, el id 7 se asignaba
    // al primer slot.
    const placements = parseSelections({
      recipes: '1,2',
      presentations: '0,7',
    });
    expect(placements[0]?.presentationId).toBeUndefined();
    expect(placements[1]?.presentationId).toBe(7);
  });

  it('ignora presentaciones sin recetas', () => {
    expect(parseSelections({ presentations: '7' })).toEqual([]);
  });

  it('toma el primer valor si el parámetro viene repetido', () => {
    const selections = parseSelections({ recipes: ['1,2', '3'] });
    expect(selections.map((selection) => selection.recipeId)).toEqual([1, 2]);
  });
});

describe('serializeSelections', () => {
  it('omite las presentaciones si ningún slot eligió', () => {
    expect(serializeSelections([entry(1, { batches: 2 }), entry(3)])).toEqual({
      recipes: '1,3',
      batches: '2,1',
    });
  });

  it('escribe `0` en los slots sin presentación para no desalinear', () => {
    expect(serializeSelections([entry(1), entry(2, { presentationId: 9 })])).toEqual({
      recipes: '1,2',
      batches: '1,1',
      presentations: '0,9',
    });
  });

  it('sin selección limpia la query', () => {
    expect(serializeSelections([])).toEqual({});
  });

  it('hace round-trip con el parser', () => {
    const selections = [entry(2, { batches: 1.5, presentationId: 4 }), entry(1, { batches: 0.5 })];
    expect(parseSelections(serializeSelections(selections))).toEqual(selections);
  });
});

describe('filterToCatalog', () => {
  it('descarta ids inexistentes y ordena por catálogo', () => {
    const selections = [entry(3), entry(99), entry(1, { batches: 2 })];
    expect(filterToCatalog(selections, [1, 2, 3])).toEqual([entry(1, { batches: 2 }), entry(3)]);
  });
});

describe('resolveSelections', () => {
  it('recorta al tope del plan después de descartar ids ajenos', () => {
    // El id 99 no es del catálogo: no debe consumir un slot del tope.
    const selections = resolveSelections(
      { recipes: '99,1,2,3,4' },
      [1, 2, 3, 4, 5],
      PRODUCTION_BASIC_RECIPE_LIMIT
    );
    expect(selections.map((selection) => selection.recipeId)).toEqual([1, 2, 3]);
  });

  it('con Pro no recorta', () => {
    const selections = resolveSelections({ recipes: '1,2,3,4' }, [1, 2, 3, 4], PRO);
    expect(selections).toHaveLength(4);
  });

  it('normaliza el orden de la query al del catálogo', () => {
    const selections = resolveSelections({ recipes: '3,1,2' }, [1, 2, 3], PRO);
    expect(selections.map((selection) => selection.recipeId)).toEqual([1, 2, 3]);
  });
});

describe('normalizeBatches / stepBatches', () => {
  it('normaliza valores inválidos a 1', () => {
    expect(normalizeBatches('')).toBe(1);
    expect(normalizeBatches('abc')).toBe(1);
    expect(normalizeBatches('0')).toBe(1);
    expect(normalizeBatches('-1')).toBe(1);
    expect(normalizeBatches('2.5')).toBe(2.5);
    expect(normalizeBatches(2.5)).toBe(2.5);
  });

  it('avanza y retrocede en pasos de 0.5 sin bajar del mínimo', () => {
    expect(stepBatches(1, 1)).toBe(1.5);
    expect(stepBatches(1.5, -1)).toBe(1);
    expect(stepBatches(0.5, -1)).toBe(0.5);
  });
});

describe('toggleRecipe', () => {
  it('agrega con 1 mezcla y quita sin tocar el resto', () => {
    const initial = [entry(1, { batches: 2, presentationId: 5 })];

    expect(toggleRecipe(initial, 2)).toEqual([...initial, entry(2)]);
    expect(toggleRecipe(initial, 1)).toEqual([]);
  });

  it('no muta la lista original', () => {
    const initial = [entry(1)];
    toggleRecipe(initial, 2);
    expect(initial).toEqual([entry(1)]);
  });
});

describe('setBatches / setPresentation', () => {
  it('normaliza las mezclas y sólo toca la receta pedida', () => {
    const selections = [entry(1), entry(2)];
    expect(setBatches(selections, 2, '0')).toEqual([entry(1), entry(2)]);
    expect(setBatches(selections, 2, 3)).toEqual([entry(1), entry(2, { batches: 3 })]);
  });

  it('asigna y limpia la presentación', () => {
    const selections = [entry(1, { presentationId: 3 })];
    expect(setPresentation(selections, 1, 7)).toEqual([entry(1, { presentationId: 7 })]);
    expect(setPresentation(selections, 1, undefined)).toEqual([entry(1)]);
    expect(setPresentation(selections, 1, undefined)[0]).not.toHaveProperty('presentationId');
  });
});

describe('selectAll / atLimit', () => {
  it('marca todo el catálogo y conserva las mezclas ya elegidas', () => {
    const current = [entry(1, { batches: 2.5, presentationId: 9 })];
    const selections = selectAll(current, [1, 2, 3], true, PRO);

    expect(selections).toEqual([entry(1, { batches: 2.5, presentationId: 9 }), entry(2), entry(3)]);
  });

  it('respeta el tope del plan al marcar todo', () => {
    const selections = selectAll([], [1, 2, 3, 4], true, PRODUCTION_BASIC_RECIPE_LIMIT);
    expect(selections).toEqual([entry(1), entry(2), entry(3)]);
  });

  it('desmarcar limpia la selección', () => {
    expect(selectAll([entry(1), entry(2)], [1, 2], false, PRO)).toEqual([]);
  });

  it('detecta el tope del plan', () => {
    expect(atLimit([entry(1), entry(2)], PRODUCTION_BASIC_RECIPE_LIMIT)).toBe(false);
    expect(atLimit([entry(1), entry(2), entry(3)], PRODUCTION_BASIC_RECIPE_LIMIT)).toBe(true);
    expect(atLimit([entry(1), entry(2), entry(3)], PRO)).toBe(false);
  });
});
