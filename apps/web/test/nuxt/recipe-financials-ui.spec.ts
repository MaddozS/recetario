import { mountSuspended } from '@nuxt/test-utils/runtime';
import { nextTick } from 'vue';
import { describe, expect, it, vi } from 'vitest';
import FixedCostCard from '~/features/recipes/FixedCostCard.vue';
import PresentationCard from '~/features/recipes/PresentationCard.vue';
import PresentationCreateDialog from '~/features/recipes/PresentationCreateDialog.vue';
import PresentationsPanel from '~/features/recipes/PresentationsPanel.vue';
import RecipeFixedCostsPanel from '~/features/recipes/RecipeFixedCostsPanel.vue';
import type { FixedCostDraft, FixedCostRecord } from '~/features/recipes/recipe-fixed-costs';
import type {
  PresentationDraft,
  PresentationRecord,
} from '~/features/recipes/recipe-presentations';
import type { MutationOutcome } from '~/features/recipes/useRecipes';

/**
 * Componentes de costos fijos y presentaciones (Task 10). Recordatorio del
 * proyecto: con `mountSuspended` los eventos se assertan con listeners espía en
 * `attrs` (el wrapper es el del `Suspense`) y los `<dialog>` se stubean porque
 * `showModal` no existe en el entorno de test.
 */

function stubDialog(element: HTMLDialogElement) {
  const showModal = vi.fn();
  const close = vi.fn();
  element.showModal = showModal;
  element.close = close;
  return { showModal, close };
}

function okSave(): (draft: FixedCostDraft) => Promise<MutationOutcome> {
  return vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 7 }));
}

function okPresentationSave(): (
  presentationId: number,
  draft: PresentationDraft
) => Promise<MutationOutcome> {
  return vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 1 }));
}

const LUZ: FixedCostRecord = {
  id: 7,
  recipeId: 1,
  name: 'Luz',
  type: 'AMOUNT',
  base: 'PER_BATCH',
  value: 50,
};

const MANO_DE_OBRA: FixedCostRecord = {
  id: 8,
  recipeId: 1,
  name: 'Mano de obra',
  type: 'AMOUNT',
  base: 'PER_HOUR',
  value: 60,
  hours: 2,
};

const IVA: FixedCostRecord = {
  id: 9,
  recipeId: 1,
  name: 'IVA',
  type: 'PERCENTAGE',
  base: 'PER_BATCH',
  value: 16,
};

const CAJA: PresentationRecord = {
  id: 1,
  name: 'Caja de 6',
  unitsPerBatch: 6,
  salePrice: null,
};

const DOCENA: PresentationRecord = {
  id: 2,
  name: 'Docena',
  unitsPerBatch: 12,
  salePrice: 30,
};

describe('FixedCostCard', () => {
  it('en vista muestra nombre, badges y valor', async () => {
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { fixedCost: LUZ, save: okSave() },
    });

    expect(wrapper.attributes('data-fc-mode')).toBe('display');
    expect(wrapper.text()).toContain('Luz');
    expect(wrapper.text()).toContain('Monto');
    expect(wrapper.text()).toContain('Por Mezcla');
    expect(wrapper.text()).toContain('$50.00');
    expect(wrapper.find('[data-fc-hours-label]').exists()).toBe(false);
    // En vista sólo se ofrece editar (el baseline esconde también el ícono de borrar).
    expect(wrapper.find("button[aria-label='Eliminar costo fijo']").exists()).toBe(false);
    expect(wrapper.find('[data-fc-delete]').exists()).toBe(false);
    expect(wrapper.find('[data-fc-edit]').exists()).toBe(true);
  });

  it('pinta las horas de los costos por hora y el % de los porcentajes', async () => {
    const porHora = await mountSuspended(FixedCostCard, {
      props: { fixedCost: MANO_DE_OBRA, save: okSave() },
    });
    expect(porHora.text()).toContain('Por Hora');
    expect(porHora.find('[data-fc-hours-label]').text()).toBe('(2h)');

    const porcentaje = await mountSuspended(FixedCostCard, {
      props: { fixedCost: IVA, save: okSave() },
    });
    expect(porcentaje.text()).toContain('Porcentaje');
    expect(porcentaje.text()).toContain('16%');
  });

  it('pasa a edición con los valores del registro y permite cancelar', async () => {
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { fixedCost: LUZ, save: okSave() },
    });

    await wrapper.find("button[aria-label='Editar costo fijo']").trigger('click');

    expect(wrapper.attributes('data-fc-mode')).toBe('edit');
    expect((wrapper.find('[data-fc-name-input]').element as HTMLInputElement).value).toBe('Luz');
    expect(wrapper.find('[data-fc-delete]').exists()).toBe(true);
    expect(wrapper.find('[data-fc-cancel]').exists()).toBe(true);

    await wrapper.find('[data-fc-name-input]').setValue('Luz y agua');
    await wrapper.find('[data-fc-cancel]').trigger('click');

    expect(wrapper.attributes('data-fc-mode')).toBe('display');
    expect(wrapper.text()).toContain('Luz');
    expect(wrapper.text()).not.toContain('Luz y agua');
  });

  it('muestra el campo de horas sólo con base por hora', async () => {
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { fixedCost: LUZ, save: okSave() },
    });

    await wrapper.find("button[aria-label='Editar costo fijo']").trigger('click');
    expect(wrapper.find('[data-fc-hours-field]').exists()).toBe(false);

    await wrapper.find('[data-fc-base-select]').setValue('PER_HOUR');
    expect(wrapper.find('[data-fc-hours-field]').exists()).toBe(true);
  });

  it('muestra inline el mensaje de validación y no sale de edición', async () => {
    // La validación vive en el composable (una sola fuente): la card muestra el
    // outcome y conserva lo escrito, sin llegar a llamar al API.
    const save = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: 'El valor debe ser un número mayor a 0.',
      })
    );
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { fixedCost: LUZ, save },
    });

    await wrapper.find("button[aria-label='Editar costo fijo']").trigger('click');
    await wrapper.find('[data-fc-value-input]').setValue('0');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(wrapper.find('[data-fc-error]').text()).toBe('El valor debe ser un número mayor a 0.');
    expect(wrapper.attributes('data-fc-mode')).toBe('edit');
  });

  it('guarda el borrador y sale de edición', async () => {
    const save = okSave();
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { fixedCost: LUZ, save },
    });

    await wrapper.find("button[aria-label='Editar costo fijo']").trigger('click');
    await wrapper.find('[data-fc-name-input]').setValue('Luz y agua');
    await wrapper.find('[data-fc-value-input]').setValue('75');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(save).toHaveBeenCalledWith({
      name: 'Luz y agua',
      type: 'AMOUNT',
      base: 'PER_BATCH',
      value: '75',
      hours: '1',
    });
    expect(wrapper.attributes('data-fc-mode')).toBe('display');
  });

  it('mantiene la edición y muestra la causa si el API falla', async () => {
    const save = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: 'Fallo simulado del servidor',
      })
    );
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { fixedCost: LUZ, save },
    });

    await wrapper.find("button[aria-label='Editar costo fijo']").trigger('click');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(wrapper.attributes('data-fc-mode')).toBe('edit');
    expect(wrapper.find('[data-fc-error]').text()).toBe('Fallo simulado del servidor');
  });

  it('en modo creación arranca editando y se descarta con Cancelar', async () => {
    const onCancel = vi.fn();
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { mode: 'create', save: okSave() },
      attrs: { onCancel },
    });

    expect(wrapper.attributes('data-fc-mode')).toBe('create');
    expect(wrapper.find('[data-fc-delete]').exists()).toBe(false);
    expect((wrapper.find('[data-fc-name-input]').element as HTMLInputElement).value).toBe(
      'Costo Fijo'
    );

    await wrapper.find('[data-fc-cancel]').trigger('click');

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('avisa al panel cuando el alta se guarda', async () => {
    const onSaved = vi.fn();
    const save = okSave();
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { mode: 'create', save },
      attrs: { onSaved },
    });

    await wrapper.find('[data-fc-value-input]').setValue('30');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(save).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it('elimina desde el dialog de confirmación', async () => {
    const remove = vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 7 }));
    const wrapper = await mountSuspended(FixedCostCard, {
      props: { fixedCost: LUZ, save: okSave(), remove },
    });
    const dialog = wrapper.find('dialog');
    stubDialog(dialog.element as HTMLDialogElement);

    await wrapper.find("button[aria-label='Editar costo fijo']").trigger('click');
    await wrapper.find('[data-fc-delete]').trigger('click');
    await nextTick();

    expect(wrapper.find('dialog').text()).toContain('Confirmar eliminación');
    expect(wrapper.find('dialog').text()).toContain(
      '¿Eliminar este costo fijo? Esta acción no se puede deshacer.'
    );

    await wrapper.find('[data-fc-confirm-delete]').trigger('click');
    await nextTick();

    expect(remove).toHaveBeenCalledWith(7);
  });
});

describe('RecipeFixedCostsPanel', () => {
  function panelProps(records: FixedCostRecord[] = []) {
    return {
      recipeFixedCosts: records,
      createFixedCost: okSave(),
      updateFixedCost: vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 7 })),
      deleteFixedCost: vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 7 })),
    };
  }

  it('muestra el estado vacío sin costos fijos', async () => {
    const wrapper = await mountSuspended(RecipeFixedCostsPanel, {
      props: panelProps(),
    });

    expect(wrapper.find('[data-recipe-fixed-costs-empty]').text()).toBe(
      'No hay costos fijos definidos para esta receta.'
    );
    expect(wrapper.text()).toContain('Costos Fijos de la Receta');
  });

  it('lista los costos fijos con su tipo', async () => {
    const wrapper = await mountSuspended(RecipeFixedCostsPanel, {
      props: panelProps([LUZ, MANO_DE_OBRA, IVA]),
    });

    const cards = wrapper.findAll('[data-fixed-cost-card]');
    expect(cards).toHaveLength(3);
    expect(wrapper.find('[data-recipe-fixed-costs-empty]').exists()).toBe(false);
    expect(wrapper.text()).toContain('$50.00');
    expect(wrapper.text()).toContain('16%');
  });

  it('abre una card de creación y la cierra al cancelar', async () => {
    const wrapper = await mountSuspended(RecipeFixedCostsPanel, {
      props: panelProps([LUZ]),
    });

    expect(wrapper.find("[data-fc-mode='create']").exists()).toBe(false);

    await wrapper.find('[data-open-fixed-cost]').trigger('click');

    expect(wrapper.find("[data-fc-mode='create']").exists()).toBe(true);
    expect(wrapper.findAll('[data-fixed-cost-card]')).toHaveLength(2);

    await wrapper.find('[data-fc-cancel]').trigger('click');

    expect(wrapper.find("[data-fc-mode='create']").exists()).toBe(false);
  });

  it('oculta el estado vacío mientras hay una card de creación', async () => {
    const wrapper = await mountSuspended(RecipeFixedCostsPanel, {
      props: panelProps(),
    });

    await wrapper.find('[data-open-fixed-cost]').trigger('click');

    expect(wrapper.find('[data-recipe-fixed-costs-empty]').exists()).toBe(false);
  });

  it('actualiza el costo fijo con su id', async () => {
    const props = panelProps([LUZ]);
    const wrapper = await mountSuspended(RecipeFixedCostsPanel, { props });

    await wrapper.find("button[aria-label='Editar costo fijo']").trigger('click');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(props.updateFixedCost).toHaveBeenCalledWith(7, expect.objectContaining({ name: 'Luz' }));
  });
});

describe('PresentationCard', () => {
  function cardProps(presentation: PresentationRecord = CAJA) {
    return {
      presentation,
      multiplier: 1,
      recipeBatchCost: 60,
      suggestedBatchPrice: 100,
      save: okPresentationSave(),
      remove: vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 1 })),
    };
  }

  it('muestra costo unitario, sugerido, ganancia y margen', async () => {
    const wrapper = await mountSuspended(PresentationCard, {
      props: cardProps(),
    });

    expect(wrapper.attributes('data-presentation-mode')).toBe('display');
    // 6 piezas de una mezcla de $60 → $10 por pieza; sugerido $16.67.
    expect(wrapper.find('[data-unit-cost]').text()).toBe('$10.00');
    expect(wrapper.find('[data-recommended-price]').text()).toBe('$16.67');
    expect(wrapper.find('[data-margin-percent]').text()).toBe('40.0%');
    expect(wrapper.find('[data-margin-label]').text()).toBe('Saludable');
    expect(wrapper.attributes('data-margin-tone')).toBe('success');
    expect(wrapper.attributes('data-price')).toBe('');
    expect((wrapper.find('.presentation-price').element as HTMLInputElement).value).toBe('16.67');
  });

  it('usa el precio guardado cuando existe', async () => {
    const wrapper = await mountSuspended(PresentationCard, {
      props: cardProps(DOCENA),
    });

    expect(wrapper.attributes('data-price')).toBe('30');
    expect((wrapper.find('.presentation-price').element as HTMLInputElement).value).toBe('30.00');
    // 12 piezas de $60 → $5 de costo; $30 de precio → 83.3 % de margen.
    expect(wrapper.find('[data-unit-cost]').text()).toBe('$5.00');
    expect(wrapper.find('[data-margin-percent]').text()).toBe('83.3%');
  });

  it('añade el chip de mezclas con el multiplicador', async () => {
    const wrapper = await mountSuspended(PresentationCard, {
      props: { ...cardProps(), multiplier: 2 },
    });

    expect(wrapper.find('[data-yield]').text()).toBe('12');
    expect(wrapper.text()).toContain('Con x2:');
    // 12 piezas de $60 → $5 por pieza.
    expect(wrapper.find('[data-unit-cost]').text()).toBe('$5.00');
  });

  it('sin multiplicador ajustado no muestra el chip', async () => {
    const wrapper = await mountSuspended(PresentationCard, {
      props: cardProps(),
    });

    expect(wrapper.find('[data-yield]').exists()).toBe(false);
  });

  it('edita en línea y recalcula el margen al escribir', async () => {
    const save = okPresentationSave();
    const wrapper = await mountSuspended(PresentationCard, {
      props: { ...cardProps(), save },
    });

    await wrapper.find('[data-presentation-edit]').trigger('click');

    expect(wrapper.attributes('data-presentation-mode')).toBe('edit');
    expect((wrapper.find('.presentation-name').element as HTMLInputElement).readOnly).toBe(false);
    expect(wrapper.find('[data-presentation-delete]').exists()).toBe(true);

    await wrapper.find('.presentation-price').setValue('20');

    expect(wrapper.find('[data-margin-percent]').text()).toBe('50.0%');
    expect(wrapper.find('[data-margin-label]').text()).toBe('Saludable');

    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(save).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ priceDirty: true, salePrice: '20' })
    );
    expect(wrapper.attributes('data-presentation-mode')).toBe('display');
  });

  it('marca el precio como sucio sólo si el usuario lo toca', async () => {
    const save = okPresentationSave();
    const wrapper = await mountSuspended(PresentationCard, {
      props: { ...cardProps(), save },
    });

    await wrapper.find('[data-presentation-edit]').trigger('click');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(save).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ priceDirty: false, salePrice: '16.67' })
    );
  });

  it('cancelar revierte lo escrito', async () => {
    const wrapper = await mountSuspended(PresentationCard, {
      props: cardProps(),
    });

    await wrapper.find('[data-presentation-edit]').trigger('click');
    await wrapper.find('.presentation-name').setValue('Caja de 12');
    await wrapper.find('[data-presentation-edit]').trigger('click');

    expect(wrapper.attributes('data-presentation-mode')).toBe('display');
    expect((wrapper.find('.presentation-name').element as HTMLInputElement).value).toBe(
      'Caja de 6'
    );
  });

  it('muestra inline el mensaje de validación y no sale de edición', async () => {
    const save = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: 'Las piezas por mezcla deben ser mayores a 0.',
      })
    );
    const wrapper = await mountSuspended(PresentationCard, {
      props: { ...cardProps(), save },
    });

    await wrapper.find('[data-presentation-edit]').trigger('click');
    await wrapper.find('.presentation-units').setValue('0');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(wrapper.find('[data-presentation-error]').text()).toBe(
      'Las piezas por mezcla deben ser mayores a 0.'
    );
    expect(wrapper.attributes('data-presentation-mode')).toBe('edit');
  });

  it('mantiene la edición ante un error del API', async () => {
    const save = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: 'Fallo simulado del servidor',
      })
    );
    const wrapper = await mountSuspended(PresentationCard, {
      props: { ...cardProps(), save },
    });

    await wrapper.find('[data-presentation-edit]').trigger('click');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(wrapper.attributes('data-presentation-mode')).toBe('edit');
    expect(wrapper.find('[data-presentation-error]').text()).toBe('Fallo simulado del servidor');
  });

  it('elimina desde el dialog de confirmación', async () => {
    const props = cardProps();
    const wrapper = await mountSuspended(PresentationCard, { props });
    stubDialog(wrapper.find('dialog').element as HTMLDialogElement);

    await wrapper.find('[data-presentation-edit]').trigger('click');
    await wrapper.find('[data-presentation-delete]').trigger('click');
    await nextTick();

    expect(wrapper.find('dialog').text()).toContain(
      '¿Eliminar esta presentación? Esta acción no se puede deshacer.'
    );

    await wrapper.find('[data-presentation-confirm-delete]').trigger('click');
    await nextTick();

    expect(props.remove).toHaveBeenCalledWith(1);
  });
});

describe('PresentationsPanel', () => {
  function panelProps(presentations: PresentationRecord[] = []) {
    return {
      presentations,
      multiplier: 1,
      recipeBatchCost: 60,
      suggestedBatchPrice: 100,
      createPresentation: vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 3 })),
      updatePresentation: okPresentationSave(),
      deletePresentation: vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 1 })),
    };
  }

  it('con el catálogo vacío muestra mensaje y CTA', async () => {
    const wrapper = await mountSuspended(PresentationsPanel, {
      props: panelProps(),
    });

    const empty = wrapper.find('[data-presentations-empty]');
    expect(empty.exists()).toBe(true);
    expect(empty.text()).toContain('Aún no hay presentaciones de venta');
    expect(empty.text()).toContain('Crear presentación');
    expect(wrapper.find('[data-presentation-card]').exists()).toBe(false);
  });

  it('lista las presentaciones en cards', async () => {
    const wrapper = await mountSuspended(PresentationsPanel, {
      props: panelProps([CAJA, DOCENA]),
    });

    expect(wrapper.find('[data-presentations-empty]').exists()).toBe(false);
    expect(wrapper.findAll('[data-presentation-card]')).toHaveLength(2);
    expect(wrapper.text()).toContain('Presentaciones de Venta');
    expect(wrapper.text()).toContain('Define cuántas piezas salen por mezcla');
  });

  it('abre el dialog de alta desde la cabecera y desde el estado vacío', async () => {
    const props = panelProps();
    const wrapper = await mountSuspended(PresentationsPanel, { props });
    const dialog = wrapper.find('#create-presentation-dialog');
    const spies = stubDialog(dialog.element as HTMLDialogElement);

    await wrapper.find('[data-open-presentation]').trigger('click');
    expect(spies.showModal).toHaveBeenCalledTimes(1);
    expect((wrapper.find('#create-presentation-name').element as HTMLInputElement).value).toBe('');

    wrapper.findComponent({ name: 'PresentationsPanel' });

    const emptyWrapper = await mountSuspended(PresentationsPanel, {
      props: panelProps(),
    });
    const emptySpies = stubDialog(
      emptyWrapper.find('#create-presentation-dialog').element as HTMLDialogElement
    );

    await emptyWrapper
      .find('[data-presentations-empty]')
      .findAll('button')
      .at(-1)
      ?.trigger('click');

    expect(emptySpies.showModal).toHaveBeenCalledTimes(1);
  });
});

describe('PresentationCreateDialog', () => {
  it('valida nombre y piezas antes de enviar', async () => {
    const submit = vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 3 }));
    const wrapper = await mountSuspended(PresentationCreateDialog, {
      props: { open: false, submit },
    });
    stubDialog(wrapper.find('dialog').element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    const button = wrapper.find('[data-presentation-create-submit]');
    expect(button.attributes('disabled')).toBeDefined();

    await wrapper.find('#create-presentation-name').setValue('Caja de 6');
    await wrapper.find('#create-presentation-units').setValue('6');

    expect(
      wrapper.find('[data-presentation-create-submit]').attributes('disabled')
    ).toBeUndefined();

    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(submit).toHaveBeenCalledWith({
      name: 'Caja de 6',
      unitsPerBatch: '6',
      salePrice: '',
      priceDirty: false,
    });
  });

  it('no cierra y muestra la causa si el API falla', async () => {
    const submit = vi.fn(
      async (): Promise<MutationOutcome> => ({
        ok: false,
        message: 'No se pudo crear la presentación.',
      })
    );
    const onUpdateOpen = vi.fn();
    const wrapper = await mountSuspended(PresentationCreateDialog, {
      props: { open: false, submit },
      attrs: { 'onUpdate:open': onUpdateOpen },
    });
    stubDialog(wrapper.find('dialog').element as HTMLDialogElement);
    await wrapper.setProps({ open: true });

    await wrapper.find('#create-presentation-name').setValue('Caja de 6');
    await wrapper.find('#create-presentation-units').setValue('6');
    await wrapper.find('form').trigger('submit');
    await nextTick();

    expect(wrapper.find('[data-presentation-create-error]').text()).toBe(
      'No se pudo crear la presentación.'
    );
    expect(onUpdateOpen).not.toHaveBeenCalledWith(false);
  });

  it('limpia el formulario al reabrir', async () => {
    const wrapper = await mountSuspended(PresentationCreateDialog, {
      props: {
        open: false,
        submit: vi.fn(async (): Promise<MutationOutcome> => ({ ok: true, id: 3 })),
      },
    });
    stubDialog(wrapper.find('dialog').element as HTMLDialogElement);

    await wrapper.setProps({ open: true });
    await wrapper.find('#create-presentation-name').setValue('Caja de 6');
    await wrapper.find('#create-presentation-units').setValue('6');

    await wrapper.setProps({ open: false });
    await wrapper.setProps({ open: true });

    expect((wrapper.find('#create-presentation-name').element as HTMLInputElement).value).toBe('');
    expect((wrapper.find('#create-presentation-units').element as HTMLInputElement).value).toBe('');
  });
});
