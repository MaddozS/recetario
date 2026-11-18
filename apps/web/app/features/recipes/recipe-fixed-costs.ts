import type { recipeFixedCostSchema } from '@recetario/types';
import type { z } from 'zod';
import { NAME_ERROR_MESSAGE, parseDecimal } from './recipe-detail-form';
import type { RecipeFormValidation } from './recipe-detail-form';

/**
 * Costos fijos de la receta: modelo del formulario, validación, payloads y
 * reducers de la lista.
 *
 * Módulo puro sin aliases: cubierto en `test/unit`. Sustituye al custom element
 * `fixed-cost-card` del baseline, que leía y escribía el DOM a mano.
 *
 * El tipo se deriva del schema del API (`recipeFixedCostSchema`) para no
 * duplicar el contrato, igual que el resto de la feature.
 */
export type FixedCostRecord = z.infer<typeof recipeFixedCostSchema>;
export type FixedCostType = FixedCostRecord['type'];
export type FixedCostBase = FixedCostRecord['base'];

export type FixedCostDraft = {
  name: string;
  type: FixedCostType;
  base: FixedCostBase;
  /** Texto tal como lo escribe el usuario (coma o punto). */
  value: string;
  /** Sólo aplica a `PER_HOUR`. */
  hours: string;
};

export const DEFAULT_FIXED_COST_NAME = 'Costo Fijo';
export const FIXED_COST_VALUE_ERROR = 'El valor debe ser un número mayor a 0.';
export const FIXED_COST_HOURS_ERROR = 'Las horas deben ser un número mayor a 0.';

export const FIXED_COST_TYPE_LABELS: Record<FixedCostType, string> = {
  PERCENTAGE: 'Porcentaje',
  AMOUNT: 'Monto',
};

export const FIXED_COST_BASE_LABELS: Record<FixedCostBase, string> = {
  PER_BATCH: 'Por Mezcla',
  PER_UNIT: 'Por Unidad',
  PER_HOUR: 'Por Hora',
};

/**
 * Familias semánticas de los badges. El baseline usaba `bg-turmeric-bg`,
 * `bg-herb-bg` y `bg-chili-bg`, que no existen en el design system (utilidades
 * muertas: los badges salían sin fondo); aquí se mapean a warning/success/danger.
 */
export const FIXED_COST_TYPE_BADGE_COLORS: Record<FixedCostType, 'warning' | 'accent'> = {
  PERCENTAGE: 'warning',
  AMOUNT: 'accent',
};

export const FIXED_COST_BASE_BADGE_COLORS: Record<FixedCostBase, 'success' | 'accent' | 'danger'> =
  {
    PER_BATCH: 'success',
    PER_UNIT: 'accent',
    PER_HOUR: 'danger',
  };

/** `"10%"` para porcentajes y `"$12.00"` para montos (paridad con el baseline). */
export function fixedCostDisplayValue(fc: { type: FixedCostType; value: number }): string {
  return fc.type === 'PERCENTAGE' ? `${fc.value}%` : `$${Number(fc.value).toFixed(2)}`;
}

/** `"(2h)"` sólo en costos por hora con horas declaradas. */
export function fixedCostHoursLabel(fc: { base: FixedCostBase; hours?: number | null }): string {
  return fc.base === 'PER_HOUR' && fc.hours != null ? `(${fc.hours}h)` : '';
}

export function emptyFixedCostDraft(): FixedCostDraft {
  return {
    name: DEFAULT_FIXED_COST_NAME,
    type: 'AMOUNT',
    base: 'PER_BATCH',
    value: '',
    hours: '1',
  };
}

export function fixedCostDraftFromRecord(fc: FixedCostRecord): FixedCostDraft {
  return {
    name: fc.name,
    type: fc.type,
    base: fc.base,
    value: String(fc.value),
    hours: fc.hours != null ? String(fc.hours) : '1',
  };
}

export function fixedCostHoursRequired(base: FixedCostBase): boolean {
  return base === 'PER_HOUR';
}

export function validateFixedCostDraft(draft: FixedCostDraft): RecipeFormValidation {
  const name = draft.name.trim();
  if (name.length === 0 || name.length > 120) {
    return { valid: false, message: NAME_ERROR_MESSAGE };
  }

  const value = parseDecimal(draft.value);
  if (!(value > 0)) {
    return { valid: false, message: FIXED_COST_VALUE_ERROR };
  }

  if (fixedCostHoursRequired(draft.base)) {
    const hours = parseDecimal(draft.hours);
    if (!(hours > 0)) {
      return { valid: false, message: FIXED_COST_HOURS_ERROR };
    }
  }

  return { valid: true };
}

export type FixedCostPayload = {
  name: string;
  type: FixedCostType;
  base: FixedCostBase;
  value: number;
  hours: number | null;
};

/**
 * Payload compartido por crear y actualizar. Las horas sólo viajan con
 * `PER_HOUR`: al cambiar de base el valor anterior se limpia con `null` en vez
 * de quedar pegado como hacía el baseline (input oculto).
 */
export function toFixedCostPayload(draft: FixedCostDraft): FixedCostPayload {
  return {
    name: draft.name.trim() || DEFAULT_FIXED_COST_NAME,
    type: draft.type,
    base: draft.base,
    value: parseDecimal(draft.value),
    hours: fixedCostHoursRequired(draft.base) ? parseDecimal(draft.hours) : null,
  };
}

export function withFixedCostCreated(
  fixedCosts: ReadonlyArray<FixedCostRecord>,
  created: FixedCostRecord
): FixedCostRecord[] {
  return [...fixedCosts, created];
}

export function withFixedCostUpdated(
  fixedCosts: ReadonlyArray<FixedCostRecord>,
  updated: FixedCostRecord
): FixedCostRecord[] {
  return fixedCosts.map((fc) => (fc.id === updated.id ? updated : fc));
}

export function withFixedCostRemoved(
  fixedCosts: ReadonlyArray<FixedCostRecord>,
  fixedCostId: number
): FixedCostRecord[] {
  return fixedCosts.filter((fc) => fc.id !== fixedCostId);
}
