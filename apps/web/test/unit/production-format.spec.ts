import { describe, expect, it } from 'vitest';
import {
  batchesCountLabel,
  formatCurrency,
  formatQty,
  formatSourceQuantity,
  formatUnitCost,
  ingredientsCountLabel,
  marginText,
  marginTone,
  recipeCountLabel,
  selectionCountLabel,
  smartQty,
} from '../../app/features/production/production-format';

describe('formatQty', () => {
  it('usa tres decimales por debajo de 1', () => {
    expect(formatQty(0.5)).toBe('0.500');
    expect(formatQty(0.125)).toBe('0.125');
  });

  it('los enteros van sin decimales y el resto con dos', () => {
    expect(formatQty(2)).toBe('2');
    expect(formatQty(2.25)).toBe('2.25');
  });
});

describe('smartQty', () => {
  it('convierte g/ml grandes a kg/lt', () => {
    // `formatQty(1.5)` deja dos decimales (misma regla que el baseline).
    expect(smartQty(1500, 'g')).toBe('1.50 kg');
    expect(smartQty(2000, 'ml')).toBe('2 lt');
  });

  it('mantiene la unidad original por debajo de 1000', () => {
    expect(smartQty(999, 'g')).toBe('999 g');
    expect(smartQty(1.5, 'kg')).toBe('1.50 kg');
  });
});

describe('formatUnitCost', () => {
  it('pega el costo con la unidad', () => {
    expect(formatUnitCost(25, 'kg')).toBe('$25.00/kg');
  });
});

describe('formatSourceQuantity', () => {
  it('sigue la regla del baseline por tramos', () => {
    expect(formatSourceQuantity(0.5)).toBe('0.50');
    expect(formatSourceQuantity(2)).toBe('2');
    expect(formatSourceQuantity(2.25)).toBe('2.3');
  });
});

describe('etiquetas', () => {
  it('singular y plural', () => {
    expect(recipeCountLabel(1)).toBe('1 receta');
    expect(recipeCountLabel(2)).toBe('2 recetas');
    expect(batchesCountLabel(1)).toBe('1 mezcla');
    expect(batchesCountLabel(3)).toBe('3 mezclas');
    expect(ingredientsCountLabel(1)).toBe('1 insumo en total');
    expect(ingredientsCountLabel(4)).toBe('4 insumos en total');
  });

  it('compone el contador de la toolbar', () => {
    expect(selectionCountLabel(2, 3)).toBe('2 recetas · 3 mezclas');
  });
});

describe('margen', () => {
  it('formatea con un decimal', () => {
    expect(marginText(73.956)).toBe('74.0%');
    expect(marginText(0)).toBe('0.0%');
  });

  it('cambia de tono en 15 y 30 (cortes del baseline)', () => {
    expect(marginTone(30.1)).toBe('text-success');
    expect(marginTone(30)).toBe('text-warning');
    expect(marginTone(15.1)).toBe('text-warning');
    expect(marginTone(15)).toBe('text-danger');
    expect(marginTone(-5)).toBe('text-danger');
  });
});

describe('formatCurrency', () => {
  it('reutiliza el formateador compartido', () => {
    expect(formatCurrency(12.5)).toBe('$12.50');
  });
});
