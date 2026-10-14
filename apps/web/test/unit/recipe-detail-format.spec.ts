import { describe, expect, it } from 'vitest';
import {
  clampPercentage,
  formatCantidad,
  formatLastUpdated,
  multiplierStepFor,
  normalizeMultiplier,
  parseMultiplierParam,
  showAdjustedQuantity,
} from '../../app/features/recipes/recipe-detail-format';

describe('formatCantidad', () => {
  it('muestra g/ml como entero redondeado', () => {
    expect(formatCantidad(33.4, 'g')).toBe('33');
    expect(formatCantidad(33.5, 'g')).toBe('34');
    expect(formatCantidad(99.6, 'ml')).toBe('100');
  });

  it('muestra el resto con dos decimales', () => {
    expect(formatCantidad(0.5, 'kg')).toBe('0.50');
    expect(formatCantidad(2, 'unidad')).toBe('2.00');
  });
});

describe('formatLastUpdated', () => {
  const now = new Date('2026-09-15T18:00:00.000Z');

  it('usa «hoy» cuando la fecha es del mismo día', () => {
    const text = formatLastUpdated('2026-09-15T16:00:00.000Z', now);
    expect(text.startsWith('hoy ')).toBe(true);
  });

  it('usa la fecha cuando es de otro día', () => {
    const text = formatLastUpdated('2026-09-14T16:00:00.000Z', now);
    expect(text.startsWith('hoy')).toBe(false);
    expect(text).toMatch(/^14\/9\/2026 /);
  });

  it('devuelve vacío sin fecha o con fecha inválida', () => {
    expect(formatLastUpdated(undefined, now)).toBe('');
    expect(formatLastUpdated('no-es-fecha', now)).toBe('');
  });
});

describe('clampPercentage', () => {
  it('acota al rango y neutraliza los no finitos', () => {
    expect(clampPercentage(30)).toBe(30);
    expect(clampPercentage(-5)).toBe(0);
    expect(clampPercentage(150, 99.99)).toBe(99.99);
    expect(clampPercentage(Number.NaN)).toBe(0);
    expect(clampPercentage(Number.POSITIVE_INFINITY)).toBe(0);
  });
});

describe('multiplicador', () => {
  it('parsea la query y cae a 1 ante valores inválidos', () => {
    expect(parseMultiplierParam('2')).toBe(2);
    expect(parseMultiplierParam('0.5')).toBe(0.5);
    expect(parseMultiplierParam(undefined)).toBe(1);
    expect(parseMultiplierParam('abc')).toBe(1);
    expect(parseMultiplierParam('0')).toBe(0.01);
  });

  it('normaliza a cuatro decimales', () => {
    expect(normalizeMultiplier(1.00004)).toBe(1);
    expect(normalizeMultiplier(0.33333)).toBe(0.3333);
    expect(normalizeMultiplier(3)).toBe(3);
  });

  it('sube el paso a 1 cuando la mezcla llega a 2', () => {
    expect(multiplierStepFor(0.5)).toBe(0.5);
    expect(multiplierStepFor(1.5)).toBe(0.5);
    expect(multiplierStepFor(2)).toBe(1);
    expect(multiplierStepFor(10)).toBe(1);
  });

  it('sólo marca cantidades ajustadas fuera del multiplicador neutro', () => {
    expect(showAdjustedQuantity(1)).toBe(false);
    expect(showAdjustedQuantity(1.00005)).toBe(false);
    expect(showAdjustedQuantity(1.5)).toBe(true);
    expect(showAdjustedQuantity(0.5)).toBe(true);
  });
});
