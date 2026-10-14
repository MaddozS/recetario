import { describe, expect, it } from 'vitest';
import {
  PRESENTATION_NAME_ERROR,
  PRESENTATION_PRICE_ERROR,
  PRESENTATION_UNITS_ERROR,
  computePresentationFixedCostsTotal,
  computePresentationMetrics,
  formatPrice,
  formatUnits,
  mergePresentationResponse,
  presentationDraftFromRecord,
  toPresentationCreatePayload,
  toPresentationUpdatePayload,
  validatePresentationDraft,
  withPresentationCreated,
  withPresentationRemoved,
  withPresentationUpdated,
} from '../../app/features/recipes/recipe-presentations';
import type {
  PresentationDraft,
  PresentationRecord,
} from '../../app/features/recipes/recipe-presentations';

function record(overrides: Partial<PresentationRecord> = {}): PresentationRecord {
  return {
    id: 1,
    name: 'Caja de 6',
    unitsPerBatch: 6,
    salePrice: null,
    ...overrides,
  };
}

function draft(overrides: Partial<PresentationDraft> = {}): PresentationDraft {
  return {
    name: 'Caja de 6',
    unitsPerBatch: '6',
    salePrice: '',
    priceDirty: false,
    ...overrides,
  };
}

describe('formatPrice / formatUnits', () => {
  it('deja dos decimales en el precio', () => {
    expect(formatPrice(12.5)).toBe('12.50');
    expect(formatPrice(0)).toBe('0.00');
  });

  it('redondea las piezas a dos decimales sin ceros de relleno', () => {
    expect(formatUnits(6)).toBe('6');
    expect(formatUnits(2.5)).toBe('2.5');
    expect(formatUnits(6.666)).toBe('6.67');
  });
});

describe('computePresentationFixedCostsTotal', () => {
  it('sin costos fijos de presentación es 0', () => {
    expect(computePresentationFixedCostsTotal([], 6, 2, 40)).toBe(0);
  });

  it('los montos por unidad escalan con el rendimiento y el multiplicador', () => {
    expect(
      computePresentationFixedCostsTotal(
        [{ type: 'AMOUNT', base: 'PER_UNIT', value: 1.5 }],
        6,
        2,
        40
      )
    ).toBe(18);
  });

  it('los montos por mezcla escalan con el multiplicador', () => {
    expect(
      computePresentationFixedCostsTotal(
        [{ type: 'AMOUNT', base: 'PER_BATCH', value: 10 }],
        6,
        2,
        40
      )
    ).toBe(20);
  });

  it('los porcentajes se calculan sobre el costo de la mezcla', () => {
    expect(
      computePresentationFixedCostsTotal(
        [{ type: 'PERCENTAGE', base: 'PER_BATCH', value: 10 }],
        6,
        3,
        40
      )
    ).toBe(4);
  });
});

describe('computePresentationMetrics', () => {
  it('reparte el costo de la mezcla entre las piezas', () => {
    const metrics = computePresentationMetrics({
      unitsPerBatch: 6,
      multiplier: 1,
      recipeBatchCost: 60,
      suggestedBatchPrice: 100,
      salePrice: '20',
    });

    expect(metrics.totalUnits).toBe(6);
    expect(metrics.unitCost).toBe(10);
    expect(metrics.unitPriceRecommended).toBeCloseTo(16.6667, 4);
    expect(metrics.effectiveSalePrice).toBe(20);
    expect(metrics.unitProfit).toBe(10);
    expect(metrics.marginPercent).toBe(50);
    expect(metrics.marginLabel).toBe('Saludable');
    expect(metrics.marginTone).toBe('success');
    expect(metrics.barWidth).toBe(50);
  });

  it('sin precio declarado usa el sugerido por pieza', () => {
    const metrics = computePresentationMetrics({
      unitsPerBatch: 6,
      multiplier: 1,
      recipeBatchCost: 60,
      suggestedBatchPrice: 100,
      salePrice: '',
    });

    expect(metrics.effectiveSalePrice).toBeCloseTo(16.6667, 4);
    expect(metrics.unitProfit).toBeCloseTo(6.6667, 4);
    expect(metrics.marginPercent).toBeCloseTo(40, 6);
    expect(metrics.marginLabel).toBe('Saludable');
  });

  it('con 0 piezas no divide entre cero', () => {
    const metrics = computePresentationMetrics({
      unitsPerBatch: 0,
      multiplier: 1,
      recipeBatchCost: 60,
      suggestedBatchPrice: 100,
      salePrice: '20',
    });

    expect(metrics.totalUnits).toBe(0);
    expect(metrics.unitCost).toBe(0);
    expect(metrics.unitPriceRecommended).toBe(0);
    expect(metrics.unitProfit).toBe(20);
  });

  it('escala con el multiplicador de mezclas', () => {
    const metrics = computePresentationMetrics({
      unitsPerBatch: 6,
      multiplier: 2,
      recipeBatchCost: 60,
      suggestedBatchPrice: 100,
      salePrice: '',
    });

    expect(metrics.totalUnits).toBe(12);
    expect(metrics.unitCost).toBe(5);
    expect(metrics.unitPriceRecommended).toBeCloseTo(8.3333, 4);
  });

  it('suma los costos fijos de la presentación al costo y al sugerido', () => {
    const metrics = computePresentationMetrics({
      unitsPerBatch: 6,
      multiplier: 1,
      recipeBatchCost: 60,
      suggestedBatchPrice: 120,
      salePrice: '',
      presentationFixedCosts: [
        { type: 'AMOUNT', base: 'PER_UNIT', value: 1 },
        { type: 'PERCENTAGE', base: 'PER_BATCH', value: 10 },
      ],
    });

    // 60 + (1 × 6) + (10 % de 60) = 72 de costo; 120 + 12 = 132 sugerido.
    expect(metrics.unitCost).toBe(12);
    expect(metrics.unitPriceRecommended).toBe(22);
  });

  it('etiqueta el margen en los cortes 20 y 35', () => {
    // Con 4 piezas y $40 de mezcla el costo unitario es $10:
    // $20 → 50 % (Saludable), $12.50 → 20 % (Medio), $11 → 9.09 % (Bajo).
    const label = (salePrice: string) =>
      computePresentationMetrics({
        unitsPerBatch: 4,
        multiplier: 1,
        recipeBatchCost: 40,
        suggestedBatchPrice: 80,
        salePrice,
      });

    expect(label('20').marginPercent).toBe(50);
    expect(label('20').marginLabel).toBe('Saludable');
    expect(label('20').marginTone).toBe('success');
    expect(label('12.5').marginPercent).toBe(20);
    expect(label('12.5').marginLabel).toBe('Medio');
    expect(label('12.5').marginTone).toBe('warning');
    expect(label('11').marginLabel).toBe('Bajo');
    expect(label('11').marginTone).toBe('danger');
  });

  it('recorta el ancho de la barra entre 0 y 100', () => {
    const metrics = computePresentationMetrics({
      unitsPerBatch: 2,
      multiplier: 1,
      recipeBatchCost: 10,
      suggestedBatchPrice: 20,
      salePrice: '1',
    });

    expect(metrics.unitCost).toBe(5);
    expect(metrics.marginPercent).toBe(-400);
    expect(metrics.barWidth).toBe(0);
  });

  it('trata los valores no numéricos como 0 (sin NaN en pantalla)', () => {
    const metrics = computePresentationMetrics({
      unitsPerBatch: Number.NaN,
      multiplier: 1,
      recipeBatchCost: 60,
      suggestedBatchPrice: 100,
      salePrice: 'abc',
    });

    expect(metrics.totalUnits).toBe(0);
    expect(metrics.effectiveSalePrice).toBe(0);
    expect(metrics.unitCost).toBe(0);
  });
});

describe('presentationDraftFromRecord', () => {
  it('con precio guardado lo muestra formateado', () => {
    expect(presentationDraftFromRecord(record({ salePrice: 30 }), 16.6667)).toEqual({
      name: 'Caja de 6',
      unitsPerBatch: '6',
      salePrice: '30.00',
      priceDirty: false,
    });
  });

  it('sin precio guardado muestra el sugerido pero sin marcarlo sucio', () => {
    const draft = presentationDraftFromRecord(record(), 16.6667);

    expect(draft.salePrice).toBe('16.67');
    expect(draft.priceDirty).toBe(false);
  });

  it('respeta el precio 0 guardado', () => {
    expect(presentationDraftFromRecord(record({ salePrice: 0 }), 16.67)).toEqual({
      name: 'Caja de 6',
      unitsPerBatch: '6',
      salePrice: '0.00',
      priceDirty: false,
    });
  });
});

describe('validatePresentationDraft', () => {
  it('exige nombre, piezas y precio válido', () => {
    expect(validatePresentationDraft(draft())).toEqual({ valid: true });
    expect(validatePresentationDraft(draft({ name: ' ' }))).toEqual({
      valid: false,
      message: PRESENTATION_NAME_ERROR,
    });
    expect(validatePresentationDraft(draft({ unitsPerBatch: '0' }))).toEqual({
      valid: false,
      message: PRESENTATION_UNITS_ERROR,
    });
    expect(validatePresentationDraft(draft({ unitsPerBatch: '' }))).toEqual({
      valid: false,
      message: PRESENTATION_UNITS_ERROR,
    });
    expect(validatePresentationDraft(draft({ salePrice: '-1' }))).toEqual({
      valid: false,
      message: PRESENTATION_PRICE_ERROR,
    });
  });

  it('acepta el precio vacío y la coma decimal', () => {
    expect(validatePresentationDraft(draft({ salePrice: '' }))).toEqual({
      valid: true,
    });
    expect(validatePresentationDraft(draft({ salePrice: '12,5' }))).toEqual({
      valid: true,
    });
    expect(validatePresentationDraft(draft({ unitsPerBatch: '6,5' }))).toEqual({
      valid: true,
    });
  });
});

describe('payloads de presentación', () => {
  it('en el alta omite el precio cuando está vacío', () => {
    expect(toPresentationCreatePayload(draft({ name: ' Caja ', salePrice: '' }))).toEqual({
      name: 'Caja',
      unitsPerBatch: 6,
    });
    expect(toPresentationCreatePayload(draft({ salePrice: '12,5' }))).toEqual({
      name: 'Caja de 6',
      unitsPerBatch: 6,
      salePrice: 12.5,
    });
  });

  it('en la edición omite salePrice si el usuario no tocó el campo', () => {
    expect(toPresentationUpdatePayload(draft({ salePrice: '16.67', priceDirty: false }))).toEqual({
      name: 'Caja de 6',
      unitsPerBatch: 6,
    });
  });

  it('vaciar el precio limpia el guardado con null', () => {
    expect(toPresentationUpdatePayload(draft({ salePrice: '', priceDirty: true }))).toEqual({
      name: 'Caja de 6',
      unitsPerBatch: 6,
      salePrice: null,
    });
  });

  it('con precio tocado manda el número', () => {
    expect(toPresentationUpdatePayload(draft({ salePrice: '12,5', priceDirty: true }))).toEqual({
      name: 'Caja de 6',
      unitsPerBatch: 6,
      salePrice: 12.5,
    });
  });
});

describe('reducers de presentaciones', () => {
  it('crea al final', () => {
    const created = record({ id: 2 });
    expect(withPresentationCreated([record({ id: 1 })], created)).toEqual([
      record({ id: 1 }),
      created,
    ]);
  });

  it('actualiza por id conservando los costos fijos que el PATCH no devuelve', () => {
    const previous = record({
      id: 1,
      fixedCosts: [
        {
          id: 9,
          presentationId: 1,
          name: 'Empaque',
          type: 'AMOUNT',
          base: 'PER_UNIT',
          value: 1,
        },
      ],
    });
    const response = record({ id: 1, name: 'Docena', salePrice: 30 });

    const [updated] = withPresentationUpdated([previous], response);

    expect(updated?.name).toBe('Docena');
    expect(updated?.fixedCosts).toEqual(previous.fixedCosts);
  });

  it('mergePresentationResponse no inventa costos fijos', () => {
    const response = record({ id: 3 });

    expect(mergePresentationResponse(undefined, response)).toEqual(response);
  });

  it('elimina por id', () => {
    expect(withPresentationRemoved([record({ id: 1 }), record({ id: 2 })], 1)).toEqual([
      record({ id: 2 }),
    ]);
  });
});
