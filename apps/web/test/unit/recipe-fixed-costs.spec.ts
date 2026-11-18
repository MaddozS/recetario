import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FIXED_COST_NAME,
  FIXED_COST_BASE_BADGE_COLORS,
  FIXED_COST_BASE_LABELS,
  FIXED_COST_HOURS_ERROR,
  FIXED_COST_TYPE_BADGE_COLORS,
  FIXED_COST_TYPE_LABELS,
  FIXED_COST_VALUE_ERROR,
  emptyFixedCostDraft,
  fixedCostDisplayValue,
  fixedCostDraftFromRecord,
  fixedCostHoursLabel,
  toFixedCostPayload,
  validateFixedCostDraft,
  withFixedCostCreated,
  withFixedCostRemoved,
  withFixedCostUpdated,
} from '../../app/features/recipes/recipe-fixed-costs';
import type { FixedCostRecord } from '../../app/features/recipes/recipe-fixed-costs';
import { NAME_ERROR_MESSAGE } from '../../app/features/recipes/recipe-detail-form';

function record(overrides: Partial<FixedCostRecord> = {}): FixedCostRecord {
  return {
    id: 7,
    recipeId: 1,
    name: 'Luz',
    type: 'AMOUNT',
    base: 'PER_BATCH',
    value: 50,
    ...overrides,
  };
}

describe('etiquetas y badges de costos fijos', () => {
  it('traduce tipo y base al español', () => {
    expect(FIXED_COST_TYPE_LABELS).toEqual({
      PERCENTAGE: 'Porcentaje',
      AMOUNT: 'Monto',
    });
    expect(FIXED_COST_BASE_LABELS).toEqual({
      PER_BATCH: 'Por Mezcla',
      PER_UNIT: 'Por Unidad',
      PER_HOUR: 'Por Hora',
    });
  });

  it('usa familias semánticas (el baseline tenía clases muertas)', () => {
    expect(FIXED_COST_TYPE_BADGE_COLORS).toEqual({
      PERCENTAGE: 'warning',
      AMOUNT: 'accent',
    });
    expect(FIXED_COST_BASE_BADGE_COLORS).toEqual({
      PER_BATCH: 'success',
      PER_UNIT: 'accent',
      PER_HOUR: 'danger',
    });
  });
});

describe('fixedCostDisplayValue', () => {
  it('muestra el porcentaje tal cual y el monto con dos decimales', () => {
    expect(fixedCostDisplayValue(record({ type: 'PERCENTAGE', value: 10 }))).toBe('10%');
    expect(fixedCostDisplayValue(record({ type: 'AMOUNT', value: 50 }))).toBe('$50.00');
    expect(fixedCostDisplayValue(record({ type: 'AMOUNT', value: 12.5 }))).toBe('$12.50');
  });
});

describe('fixedCostHoursLabel', () => {
  it('sólo rotula las horas de los costos por hora', () => {
    expect(fixedCostHoursLabel({ base: 'PER_HOUR', hours: 2 })).toBe('(2h)');
    expect(fixedCostHoursLabel({ base: 'PER_HOUR', hours: null })).toBe('');
    expect(fixedCostHoursLabel({ base: 'PER_BATCH', hours: 3 })).toBe('');
  });
});

describe('emptyFixedCostDraft', () => {
  it('arranca con los valores por defecto del baseline', () => {
    expect(emptyFixedCostDraft()).toEqual({
      name: DEFAULT_FIXED_COST_NAME,
      type: 'AMOUNT',
      base: 'PER_BATCH',
      value: '',
      hours: '1',
    });
  });
});

describe('fixedCostDraftFromRecord', () => {
  it('copia el registro a texto', () => {
    expect(
      fixedCostDraftFromRecord(
        record({ type: 'PERCENTAGE', base: 'PER_HOUR', value: 12.5, hours: 3 })
      )
    ).toEqual({
      name: 'Luz',
      type: 'PERCENTAGE',
      base: 'PER_HOUR',
      value: '12.5',
      hours: '3',
    });
  });

  it('sin horas declaradas deja 1 en el borrador', () => {
    expect(fixedCostDraftFromRecord(record()).hours).toBe('1');
  });
});

describe('validateFixedCostDraft', () => {
  it('acepta un borrador completo', () => {
    expect(
      validateFixedCostDraft({
        name: 'Luz',
        type: 'AMOUNT',
        base: 'PER_BATCH',
        value: '50',
        hours: '1',
      })
    ).toEqual({ valid: true });
  });

  it('exige un valor mayor a 0 (acepta coma decimal)', () => {
    const base = emptyFixedCostDraft();

    expect(validateFixedCostDraft({ ...base, value: '' })).toEqual({
      valid: false,
      message: FIXED_COST_VALUE_ERROR,
    });
    expect(validateFixedCostDraft({ ...base, value: '0' })).toEqual({
      valid: false,
      message: FIXED_COST_VALUE_ERROR,
    });
    expect(validateFixedCostDraft({ ...base, value: '-3' })).toEqual({
      valid: false,
      message: FIXED_COST_VALUE_ERROR,
    });
    expect(validateFixedCostDraft({ ...base, value: '12,5' })).toEqual({
      valid: true,
    });
  });

  it('exige horas mayores a 0 sólo en costos por hora', () => {
    const draft = { ...emptyFixedCostDraft(), value: '10' };

    expect(validateFixedCostDraft({ ...draft, base: 'PER_BATCH', hours: '0' })).toEqual({
      valid: true,
    });
    expect(validateFixedCostDraft({ ...draft, base: 'PER_HOUR', hours: '0' })).toEqual({
      valid: false,
      message: FIXED_COST_HOURS_ERROR,
    });
    expect(validateFixedCostDraft({ ...draft, base: 'PER_HOUR', hours: '2' })).toEqual({
      valid: true,
    });
  });

  it('exige un nombre utilizable', () => {
    const draft = { ...emptyFixedCostDraft(), value: '10' };

    expect(validateFixedCostDraft({ ...draft, name: '  ' })).toEqual({
      valid: false,
      message: NAME_ERROR_MESSAGE,
    });
    expect(validateFixedCostDraft({ ...draft, name: 'a'.repeat(121) })).toEqual({
      valid: false,
      message: NAME_ERROR_MESSAGE,
    });
  });
});

describe('toFixedCostPayload', () => {
  it('convierte el borrador al contrato del API', () => {
    expect(
      toFixedCostPayload({
        name: '  Luz  ',
        type: 'AMOUNT',
        base: 'PER_BATCH',
        value: '12,5',
        hours: '1',
      })
    ).toEqual({
      name: 'Luz',
      type: 'AMOUNT',
      base: 'PER_BATCH',
      value: 12.5,
      hours: null,
    });
  });

  it('manda las horas sólo con PER_HOUR (limpia el valor pegado del baseline)', () => {
    expect(
      toFixedCostPayload({
        name: 'Luz',
        type: 'AMOUNT',
        base: 'PER_HOUR',
        value: '50',
        hours: '3',
      }).hours
    ).toBe(3);
  });

  it('sin nombre cae al valor por defecto del API', () => {
    expect(toFixedCostPayload({ ...emptyFixedCostDraft(), value: '5' }).name).toBe(
      DEFAULT_FIXED_COST_NAME
    );
  });
});

describe('reducers de costos fijos', () => {
  const luz = record({ id: 1, name: 'Luz' });
  const agua = record({ id: 2, name: 'Agua' });

  it('agrega al final', () => {
    expect(withFixedCostCreated([luz], agua)).toEqual([luz, agua]);
  });

  it('actualiza por id sin tocar el resto', () => {
    const updated = { ...luz, value: 99 };

    expect(withFixedCostUpdated([luz, agua], updated)).toEqual([updated, agua]);
  });

  it('elimina por id', () => {
    expect(withFixedCostRemoved([luz, agua], 1)).toEqual([agua]);
  });
});
