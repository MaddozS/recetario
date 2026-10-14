import { describe, expect, it } from 'vitest';
import { comparePlans } from '../../app/features/billing/plan-comparison';
import { planFixture } from './support/plan-fixture';

/**
 * Catálogo de tres slots con la forma del real: uno con etiqueta y frase propia
 * por plan (los límites), uno con texto idéntico en los tres y estado distinto,
 * y uno próximo que quedará incluido en dos planes y no en el tercero.
 */
const CATALOG = [
  planFixture('free', [
    { text: 'Hasta 10 recetas', label: 'Recetas', included: true },
    { text: 'Duplicar recetas', included: false },
    { text: 'Exportar a PDF', included: false, status: 'coming_soon' },
  ]),
  planFixture('basic', [
    { text: 'Hasta 75 recetas', label: 'Recetas', included: true },
    { text: 'Duplicar recetas', included: true },
    { text: 'Exportar a PDF', included: false, status: 'coming_soon' },
  ]),
  planFixture('pro', [
    { text: 'Recetas ilimitadas', label: 'Recetas', included: true },
    { text: 'Duplicar recetas', included: true },
    { text: 'Exportar a PDF', included: true, status: 'coming_soon' },
  ]),
];

describe('comparePlans', () => {
  it('devuelve una fila por función, en el orden del catálogo', () => {
    const rows = comparePlans(CATALOG);

    expect(rows.map(({ label }) => label)).toEqual([
      'Recetas',
      'Duplicar recetas',
      'Exportar a PDF',
    ]);
  });

  it('la etiqueta de fila sale del catálogo y el valor va en cada celda', () => {
    const [limits] = comparePlans(CATALOG);

    expect(limits?.cells).toEqual([
      { text: 'Hasta 10 recetas', state: 'included' },
      { text: 'Hasta 75 recetas', state: 'included' },
      { text: 'Recetas ilimitadas', state: 'included' },
    ]);
  });

  it('sin etiqueta en el catálogo, la frase compartida hace de etiqueta', () => {
    const [, duplicates] = comparePlans(CATALOG);

    expect(duplicates?.label).toBe('Duplicar recetas');
    expect(duplicates?.cells).toEqual([
      { text: null, state: 'excluded' },
      { text: null, state: 'included' },
      { text: null, state: 'included' },
    ]);
  });

  it('distingue si una función próxima quedará incluida o no', () => {
    const [, , pdf] = comparePlans(CATALOG);

    expect(pdf?.cells.map(({ state }) => state)).toEqual([
      'coming_soon_excluded',
      'coming_soon_excluded',
      'coming_soon',
    ]);
  });

  it('un plan más corto deja celdas vacías en vez de desplazar la tabla', () => {
    const rows = comparePlans([
      planFixture('free', [
        { text: 'Hasta 10 recetas', label: 'Recetas', included: true },
        { text: 'Duplicar recetas', included: false },
      ]),
      planFixture('pro', [{ text: 'Recetas ilimitadas', label: 'Recetas', included: true }]),
    ]);

    expect(rows[1]?.label).toBe('Duplicar recetas');
    expect(rows[1]?.cells).toEqual([
      { text: null, state: 'excluded' },
      { text: null, state: null },
    ]);
  });

  it('un slot que ningún plan trae no genera fila', () => {
    const rows = comparePlans([
      planFixture('free', [{ text: 'Fotos de recetas', included: true }]),
      planFixture('pro', []),
    ]);

    expect(rows.map(({ label }) => label)).toEqual(['Fotos de recetas']);
  });

  it('sin planes no hay ninguna fila', () => {
    expect(comparePlans([])).toEqual([]);
  });
});
