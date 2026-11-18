import { mountSuspended } from '@nuxt/test-utils/runtime';
import { describe, expect, it, vi } from 'vitest';
import { groupRecipes } from '~/features/production/production-catalog';
import ProductionIngredientsSheet from '~/features/production/ProductionIngredientsSheet.vue';
import ProductionRecipeBreakdown from '~/features/production/ProductionRecipeBreakdown.vue';
import ProductionRecipeRow from '~/features/production/ProductionRecipeRow.vue';
import ProductionResults from '~/features/production/ProductionResults.vue';
import ProductionSelectorCard from '~/features/production/ProductionSelectorCard.vue';
import type {
  ConsolidatedIngredient,
  ProductionCatalogRecipe,
  ProductionRecipeResult,
  ProductionSelection,
  ProductionSummary,
} from '~/features/production/production-types';

/**
 * Componentes del planificador (Task 12). Se montan con props: la selección, el
 * tope y las búsquedas se cubren aquí; la query y las peticiones en los specs
 * del composable y en e2e.
 */

const TARTA: ProductionCatalogRecipe = {
  id: 1,
  name: 'Tarta de Chocolate',
  category: 'Postres',
  ingredientCount: 3,
};
const PAN: ProductionCatalogRecipe = {
  id: 2,
  name: 'Pan de Masa Madre',
  category: 'Panes',
  ingredientCount: 2,
};
const FLAN: ProductionCatalogRecipe = {
  id: 3,
  name: 'Flan de Café',
  category: 'Postres',
  ingredientCount: 1,
};
const BROWNIE: ProductionCatalogRecipe = {
  id: 4,
  name: 'Brownie Clásico',
  ingredientCount: 0,
};

const CATALOG = [TARTA, PAN, FLAN, BROWNIE];
const GROUPS = groupRecipes(CATALOG).groups;

function selection(
  recipeId: number,
  overrides: Partial<ProductionSelection> = {}
): ProductionSelection {
  return { recipeId, batches: 1, ...overrides };
}

function selectionMaps(selections: ProductionSelection[]) {
  return {
    selectedIds: new Set(selections.map((item) => item.recipeId)),
    selectionById: new Map(selections.map((item) => [item.recipeId, item])),
  };
}

function mountSelector(
  selections: ProductionSelection[] = [],
  options: {
    props?: Record<string, unknown>;
    attrs?: Record<string, unknown>;
  } = {}
) {
  const maps = selectionMaps(selections);
  return mountSuspended(ProductionSelectorCard, {
    props: {
      search: '',
      total: CATALOG.length,
      selectedCount: selections.length,
      ...maps,
      groups: GROUPS,
      visibleCount: CATALOG.length,
      presentations: new Map(),
      isPro: false,
      maxRecipes: 3,
      atLimit: false,
      ...options.props,
    },
    attrs: options.attrs,
  });
}

const HARINA: ConsolidatedIngredient = {
  ingredientId: 1,
  name: 'Harina de trigo',
  brand: 'Del Campo',
  supplier: 'Casa Santos',
  totalQuantity: 1500,
  unit: 'g',
  unitCost: 25,
  totalCost: 37.5,
  sourceRecipes: [
    { recipeId: 1, recipeName: 'Tarta de Chocolate', quantity: 1 },
    { recipeId: 2, recipeName: 'Pan de Masa Madre', quantity: 0.5 },
  ],
};
const PLATANO: ConsolidatedIngredient = {
  ingredientId: 2,
  name: 'Plátano',
  totalQuantity: 0.5,
  unit: 'kg',
  unitCost: 9,
  totalCost: 4.5,
  sourceRecipes: [{ recipeId: 2, recipeName: 'Pan de Masa Madre', quantity: 0.5 }],
};

const TARTA_RESULT: ProductionRecipeResult = {
  recipeId: 1,
  recipeName: 'Tarta de Chocolate',
  category: 'Postres',
  batches: 2,
  ingredientsCost: 30,
  operationalCost: 3,
  totalCost: 33,
  selectedPresentationId: 11,
  totalWeightGrams: 1200,
  presentations: [
    {
      id: 10,
      name: 'Entera',
      totalUnits: 8,
      unitCost: 4.125,
      salePrice: 12,
      revenue: 96,
    },
    {
      id: 11,
      name: 'Porción',
      totalUnits: 24,
      unitCost: 1.375,
      salePrice: 5,
      revenue: 120,
    },
  ],
};
const PAN_RESULT: ProductionRecipeResult = {
  recipeId: 2,
  recipeName: 'Pan de Masa Madre',
  category: 'Panes',
  batches: 1,
  ingredientsCost: 29.5,
  operationalCost: 1.475,
  totalCost: 30.975,
  presentations: [],
};

const SUMMARY: ProductionSummary = {
  totalIngredientsCost: 59.5,
  totalOperationalCost: 4.475,
  totalProductionCost: 63.975,
  projectedRevenue: 120,
  estimatedProfit: 56.025,
  effectiveMargin: (56.025 / 120) * 100,
  perRecipe: [TARTA_RESULT, PAN_RESULT],
};

describe('ProductionRecipeRow', () => {
  it('muestra la receta, las mezclas y el checkbox marcado', async () => {
    const wrapper = await mountSuspended(ProductionRecipeRow, {
      props: {
        recipe: TARTA,
        selection: selection(1, { batches: 2.5 }),
        presentations: [],
        disabled: false,
      },
    });

    expect(wrapper.text()).toContain('Tarta de Chocolate');
    expect(wrapper.text()).toContain('3 ingredientes');
    expect((wrapper.find("input[type='checkbox']").element as HTMLInputElement).checked).toBe(true);
    expect((wrapper.find('[data-batches]').element as HTMLInputElement).value).toBe('2.5');
  });

  it('oculta los controles de una receta no seleccionada', async () => {
    const wrapper = await mountSuspended(ProductionRecipeRow, {
      props: { recipe: PAN, presentations: [], disabled: false },
    });

    expect(wrapper.find('.recipe-controls').classes()).toContain('hidden');
    expect(wrapper.find("input[type='checkbox']").exists()).toBe(true);
  });

  it('deshabilita y atenúa la fila cuando el plan está en el tope', async () => {
    const wrapper = await mountSuspended(ProductionRecipeRow, {
      props: { recipe: PAN, presentations: [], disabled: true },
    });

    expect((wrapper.find("input[type='checkbox']").element as HTMLInputElement).disabled).toBe(
      true
    );
    expect(wrapper.attributes('class')).toContain('opacity-40');
  });

  it('emite el toggle, el paso de mezclas y el cambio manual', async () => {
    const onToggle = vi.fn();
    const onStepBatches = vi.fn();
    const onUpdateBatches = vi.fn();

    const wrapper = await mountSuspended(ProductionRecipeRow, {
      props: {
        recipe: TARTA,
        selection: selection(1),
        presentations: [],
        disabled: false,
      },
      attrs: { onToggle, onStepBatches, 'onUpdate:batches': onUpdateBatches },
    });

    await wrapper.find("input[type='checkbox']").trigger('change');
    expect(onToggle).toHaveBeenCalledTimes(1);

    await wrapper.find("[data-batch-step='0.5']").trigger('click');
    expect(onStepBatches).toHaveBeenCalledWith(1);

    await wrapper.find("[data-batch-step='-0.5']").trigger('click');
    expect(onStepBatches).toHaveBeenLastCalledWith(-1);

    const input = wrapper.find('[data-batches]');
    await input.setValue('0');
    expect(onUpdateBatches).toHaveBeenCalledWith('0');
    // El DOM no conserva un valor descartado por la normalización.
    expect((input.element as HTMLInputElement).value).toBe('1');
  });

  it('sólo ofrece el select de presentación con más de una', async () => {
    const withoutSelect = await mountSuspended(ProductionRecipeRow, {
      props: {
        recipe: TARTA,
        selection: selection(1),
        presentations: [{ id: 10, name: 'Entera' }],
        disabled: false,
      },
    });
    expect(withoutSelect.find('[data-presentation-select]').exists()).toBe(false);

    const onUpdatePresentation = vi.fn();
    const withSelect = await mountSuspended(ProductionRecipeRow, {
      props: {
        recipe: TARTA,
        selection: selection(1, { presentationId: 11 }),
        presentations: [
          { id: 10, name: 'Entera' },
          { id: 11, name: 'Porción' },
        ],
        disabled: false,
      },
      attrs: { 'onUpdate:presentation': onUpdatePresentation },
    });

    const select = withSelect.find('[data-presentation-select]');
    expect((select.element as HTMLSelectElement).value).toBe('11');

    await select.setValue('10');
    expect(onUpdatePresentation).toHaveBeenCalledWith(10);
  });
});

describe('ProductionSelectorCard', () => {
  it('muestra el contador, los grupos y las filas', async () => {
    const wrapper = await mountSelector([selection(1)]);

    expect(wrapper.find('[data-selected-count]').text()).toBe('1');
    expect(wrapper.text()).toContain('/ 4 seleccionadas');
    expect(wrapper.text()).toContain('Postres');
    expect(wrapper.text()).toContain('Panes');
    expect(wrapper.text()).toContain('Sin categoría');
    expect(wrapper.findAll('[data-recipe-row]')).toHaveLength(4);
  });

  it('marca el indeterminado de «Seleccionar todas»', async () => {
    const some = await mountSelector([selection(1)]);
    const someCheckbox = some.find('[data-select-all]');
    expect((someCheckbox.element as HTMLInputElement).indeterminate).toBe(true);
    expect((someCheckbox.element as HTMLInputElement).checked).toBe(false);

    const all = await mountSelector([selection(1), selection(2), selection(3), selection(4)]);
    const allCheckbox = all.find('[data-select-all]');
    expect((allCheckbox.element as HTMLInputElement).checked).toBe(true);
    expect((allCheckbox.element as HTMLInputElement).indeterminate).toBe(false);
  });

  it('deshabilita «Seleccionar todas» en Basic cuando el catálogo excede el tope', async () => {
    const wrapper = await mountSelector([], {
      props: { isPro: false, maxRecipes: 3 },
    });
    expect((wrapper.find('[data-select-all]').element as HTMLInputElement).disabled).toBe(true);

    const pro = await mountSelector([], { props: { isPro: true } });
    expect((pro.find('[data-select-all]').element as HTMLInputElement).disabled).toBe(false);
  });

  it('muestra el banner del límite Basic en el tope', async () => {
    const wrapper = await mountSelector([selection(1), selection(2), selection(3)], {
      props: { atLimit: true },
    });

    const banner = wrapper.find('[data-upgrade-banner]');
    expect(banner.exists()).toBe(true);
    expect(banner.text()).toContain('Límite de 3 recetas alcanzado en plan Basic.');
    expect(banner.find('a').attributes('href')).toBe('/pricing');
    expect(banner.text()).toContain('Actualizar a Pro para planificar recetas ilimitadas');
  });

  it('atenúa y deshabilita las filas no seleccionadas en el tope', async () => {
    const wrapper = await mountSelector([selection(1), selection(2), selection(3)], {
      props: { atLimit: true, selectedCount: 3 },
    });

    const rows = wrapper.findAll('[data-recipe-row]');
    const brownie = rows.find((row) => row.text().includes('Brownie Clásico'));
    expect(brownie?.attributes('class')).toContain('opacity-40');
    expect((brownie?.find("input[type='checkbox']").element as HTMLInputElement).disabled).toBe(
      true
    );
  });

  it('mantiene el mensaje de búsqueda vacía y emite el texto', async () => {
    const onUpdateSearch = vi.fn();
    const wrapper = await mountSelector([], {
      props: { visibleCount: 0 },
      attrs: { 'onUpdate:search': onUpdateSearch },
    });

    expect(wrapper.find('[data-search-empty]').text()).toContain('No se encontraron recetas.');

    await wrapper.find('#recipe-search').setValue('sushi');
    expect(onUpdateSearch).toHaveBeenCalledWith('sushi');
  });

  it('sin recetas muestra el estado vacío con CTA a recetas', async () => {
    const wrapper = await mountSelector([], {
      props: { total: 0, visibleCount: 0, groups: [] },
    });

    expect(wrapper.text()).toContain('No hay recetas');
    expect(wrapper.find("a[href='/recipes']").exists()).toBe(true);
    expect(wrapper.find('[data-recipe-row]').exists()).toBe(false);
  });

  it('deshabilita calcular sin selección y lo emite con ella', async () => {
    const onCalculate = vi.fn();
    const empty = await mountSelector([], {
      attrs: { onCalculate },
    });

    expect((empty.find('[data-calculate]').element as HTMLButtonElement).disabled).toBe(true);

    const withSelection = await mountSelector([selection(1)], {
      attrs: { onCalculate },
    });
    await withSelection.find('[data-calculate]').trigger('click');
    expect(onCalculate).toHaveBeenCalledTimes(1);
  });

  it('emite los cambios de mezclas y presentación con el id de la receta', async () => {
    const onUpdateBatches = vi.fn();
    const onStepBatches = vi.fn();
    const onUpdatePresentation = vi.fn();

    const wrapper = await mountSuspended(ProductionSelectorCard, {
      props: {
        search: '',
        total: CATALOG.length,
        selectedCount: 1,
        ...selectionMaps([selection(1, { presentationId: 11 })]),
        groups: GROUPS,
        visibleCount: CATALOG.length,
        presentations: new Map([
          [
            1,
            [
              { id: 10, name: 'Entera' },
              { id: 11, name: 'Porción' },
            ],
          ],
        ]),
        isPro: true,
        maxRecipes: Number.POSITIVE_INFINITY,
        atLimit: false,
      },
      attrs: {
        'onUpdate:batches': onUpdateBatches,
        onStepBatches,
        'onUpdate:presentation': onUpdatePresentation,
      },
    });

    const tartaRow = wrapper
      .findAll('[data-recipe-row]')
      .find((row) => row.text().includes('Tarta de Chocolate'));
    if (!tartaRow) throw new Error('Sin fila de la Tarta');

    await tartaRow.find('[data-batches]').setValue('3');
    expect(onUpdateBatches).toHaveBeenCalledWith(1, '3');

    await tartaRow.find("[data-batch-step='0.5']").trigger('click');
    expect(onStepBatches).toHaveBeenCalledWith(1, 1);

    await tartaRow.find('[data-presentation-select]').setValue('10');
    expect(onUpdatePresentation).toHaveBeenCalledWith(1, 10);
  });
});

describe('ProductionIngredientsSheet', () => {
  it('pinta insumos con conversión de unidad, costo y recetas fuente', async () => {
    const wrapper = await mountSuspended(ProductionIngredientsSheet, {
      props: { ingredients: [HARINA, PLATANO] },
    });

    expect(wrapper.text()).toContain('Insumos totales');
    expect(wrapper.text()).toContain('2 insumos en total');
    expect(wrapper.text()).toContain('Harina de trigo');
    expect(wrapper.text()).toContain('Del Campo · Casa Santos');
    expect(wrapper.text()).toContain('1.50 kg');
    expect(wrapper.text()).toContain('$25.00/g');
    expect(wrapper.text()).toContain('$37.50');
    expect(wrapper.text()).toContain('Tarta de Chocolate');
    expect(wrapper.text()).toContain('(1 g)');
    expect(wrapper.text()).toContain('(0.50 g)');

    // Etiquetas por celda para móvil (paridad informativa con desktop).
    const labels = wrapper.findAll('span').map((node) => node.text());
    expect(labels).toContain('Cantidad');
    expect(labels).toContain('Costo x Unidad');
    expect(labels).toContain('Recetas');
  });
});

describe('ProductionRecipeBreakdown', () => {
  it('marca la presentación seleccionada y la más rentable', async () => {
    const wrapper = await mountSuspended(ProductionRecipeBreakdown, {
      props: { recipes: [TARTA_RESULT] },
    });

    expect(wrapper.text()).toContain('Desglose por receta');
    expect(wrapper.text()).toContain('Tarta de Chocolate');
    expect(wrapper.text()).toContain('2 mezclas · Costo total: $33.00');
    expect(wrapper.text()).toContain('Insumos');
    expect(wrapper.text()).toContain('Gastos operativos');
    expect(wrapper.text()).toContain('$30.00');
    expect(wrapper.text()).toContain('$3.00');

    const rows = wrapper.findAll('[data-presentation-row]');
    expect(rows).toHaveLength(2);
    expect(rows[0]?.text()).toContain('Entera');
    expect(rows[0]?.text()).toContain('$12.00');
    expect(rows[0]?.text()).toContain('$96.00');
    expect(rows[0]?.text()).not.toContain('Seleccionada');

    expect(rows[1]?.text()).toContain('Porción');
    expect(rows[1]?.text()).toContain('Seleccionada');
    expect(rows[1]?.text()).toContain('Más rentable');
    expect(rows[1]?.classes()).toContain('bg-accent-50/40');
    expect(rows[1]?.text()).toContain('72.5%');
  });

  it('comparte la barra neutra en las tres tarjetas de costo', async () => {
    const wrapper = await mountSuspended(ProductionRecipeBreakdown, {
      props: { recipes: [TARTA_RESULT] },
    });

    const cards = wrapper.findAll('[data-cost-card]');
    expect(cards.map((card) => card.attributes('data-cost-card'))).toEqual([
      'insumos',
      'operativos',
      'total',
    ]);

    for (const card of cards) {
      // Barra neutra: un costo no es un peligro y el acento no decora datos.
      expect(card.classes()).toContain('border-l-muted-foreground/30');
      expect(card.classes().join(' ')).not.toContain('accent');
      expect(card.classes().join(' ')).not.toContain('danger');
      // Esquinas rectas a la izquierda: el radio curva el borde de 3px.
      expect(card.classes()).toContain('border-l-[3px]');
      expect(card.classes()).toContain('rounded-r-xl');
      expect(card.classes()).not.toContain('rounded-xl');
    }
  });

  it('colorea el margen por tramos y avisa sin presentaciones', async () => {
    const lowMargin = await mountSuspended(ProductionRecipeBreakdown, {
      props: {
        recipes: [
          {
            ...TARTA_RESULT,
            totalCost: 18,
            presentations: [
              {
                id: 12,
                name: 'Suelta',
                totalUnits: 4,
                unitCost: 4.5,
                salePrice: 5,
                revenue: 20,
              },
            ],
          },
        ],
      },
    });

    const margin = lowMargin.find('[data-presentation-margin]');
    expect(margin.classes()).toContain('text-danger');
    expect(margin.text()).toBe('10.0%');

    const withoutPresentations = await mountSuspended(ProductionRecipeBreakdown, {
      props: { recipes: [PAN_RESULT] },
    });
    expect(withoutPresentations.text()).toContain('Sin presentaciones configuradas');
  });
});

describe('ProductionResults', () => {
  it('pinta la toolbar, el resumen financiero y las hojas', async () => {
    const onEdit = vi.fn();
    const wrapper = await mountSuspended(ProductionResults, {
      props: {
        summary: SUMMARY,
        ingredients: [HARINA],
        selectionLabel: '2 recetas · 3 mezclas',
        pending: false,
        failed: false,
      },
      attrs: { onEdit },
    });

    expect(wrapper.find('[data-results-count]').text()).toBe('2 recetas · 3 mezclas');
    expect(wrapper.text()).toContain('Resumen financiero');
    expect(wrapper.text()).toContain('2 recetas · 3 mezclas');
    expect(wrapper.text()).toContain('Costos');
    expect(wrapper.text()).toContain('Insumos');
    expect(wrapper.text()).toContain('$59.50');
    // La aritmética del tramo, igual que en el detalle de receta.
    expect(wrapper.text()).toContain('Costo Total');
    expect(wrapper.text()).toContain('Insumos + Gastos Operativos');
    expect(wrapper.text()).toContain('Resultado');
    expect(wrapper.text()).toContain('Ingresos Proyectados');
    expect(wrapper.text()).toContain('$120.00');
    expect(wrapper.text()).toContain('Ganancia Estimada');
    // 56.025 / 120 → 46.7%, en la misma línea del texto.
    expect(wrapper.text()).toContain('Margen de ganancia estimada: 46.7%');
    expect(wrapper.find('.production-sheet.financial-summary').exists()).toBe(true);

    // Las dos cifras del plan van juntas en la banda de respuesta.
    const band = wrapper.find('.bg-accent-50');
    expect(
      band.findAll('[data-financial-answer]').map((row) => row.attributes('data-financial-answer'))
    ).toEqual(['Ingresos Proyectados', 'Ganancia Estimada']);

    const editButton = wrapper
      .findAll('button')
      .find((node) => node.text().includes('Editar selección'));
    if (!editButton) throw new Error('Sin botón de editar selección');

    await editButton.trigger('click');
    expect(onEdit).toHaveBeenCalledTimes(1);
  });

  it('sin precios de venta no inventa ingresos', async () => {
    const wrapper = await mountSuspended(ProductionResults, {
      props: {
        summary: {
          ...SUMMARY,
          projectedRevenue: 0,
          estimatedProfit: -63.975,
          effectiveMargin: 0,
        },
        ingredients: [HARINA],
        selectionLabel: '1 receta',
        pending: false,
        failed: false,
      },
    });

    expect(wrapper.text()).toContain('Sin datos');
    expect(wrapper.text()).toContain('Configura precios de venta en las presentaciones');
  });

  it('muestra skeletons mientras llega el detalle y permite reintentar', async () => {
    const onRetry = vi.fn();
    const pending = await mountSuspended(ProductionResults, {
      props: {
        summary: SUMMARY,
        ingredients: [HARINA],
        selectionLabel: '1 receta',
        pending: true,
        failed: false,
      },
    });
    expect(pending.find('[data-results-pending]').exists()).toBe(true);
    expect(pending.text()).not.toContain('$59.50');

    const failed = await mountSuspended(ProductionResults, {
      props: {
        summary: { ...SUMMARY, perRecipe: [] },
        ingredients: [],
        selectionLabel: '1 receta',
        pending: false,
        failed: true,
      },
      attrs: { onRetry },
    });
    expect(failed.text()).toContain('No se pudieron cargar las recetas seleccionadas.');
    await failed.find('[data-retry]').trigger('click');
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('imprime desde el botón de la hoja', async () => {
    const printSpy = vi.fn();
    vi.stubGlobal('print', printSpy);

    const wrapper = await mountSuspended(ProductionResults, {
      props: {
        summary: SUMMARY,
        ingredients: [HARINA],
        selectionLabel: '1 receta',
        pending: false,
        failed: false,
      },
    });

    const printButton = wrapper
      .findAll('button')
      .find((node) => node.text().includes('Imprimir hoja de producción'));
    if (!printButton) throw new Error('Sin botón de imprimir');

    await printButton.trigger('click');
    expect(printSpy).toHaveBeenCalledTimes(1);

    vi.unstubAllGlobals();
  });
});
