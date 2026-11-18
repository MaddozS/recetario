import { describe, expect, it } from 'vitest';
import { PLAN_HIGHLIGHT_LIMIT, planHighlights } from '../../app/features/billing/plan-highlights';
import { planFixture } from './support/plan-fixture';

/** Mismo orden de slots que `TIER_CONFIG`, recortado a lo que se prueba. */
const CATALOG = [
  planFixture('free', [
    { text: 'Hasta 10 recetas', included: true },
    { text: 'Costeo básico con márgenes', included: true },
    { text: 'Duplicar recetas', included: false },
    { text: 'Exportar a PDF', included: false, status: 'coming_soon' },
  ]),
  planFixture('basic', [
    { text: 'Hasta 75 recetas', included: true },
    { text: 'Costeo básico con márgenes', included: true },
    { text: 'Duplicar recetas', included: true },
    { text: 'Exportar a PDF', included: false, status: 'coming_soon' },
  ]),
  planFixture('pro', [
    { text: 'Recetas ilimitadas', included: true },
    { text: 'Costeo básico con márgenes', included: true },
    { text: 'Duplicar recetas', included: true },
    { text: 'Exportar a PDF', included: true, status: 'coming_soon' },
  ]),
];

const texts = (plan: PricingPlan) => planHighlights(plan, CATALOG).features.map(({ text }) => text);

describe('planHighlights', () => {
  it('en un plan de pago destaca lo que se gana, no lo que ya es gratis', () => {
    expect(texts(CATALOG[1]!)).toEqual(['Hasta 75 recetas', 'Duplicar recetas']);
    expect(texts(CATALOG[2]!)).toEqual(['Recetas ilimitadas', 'Duplicar recetas']);
  });

  it('el plan Free destaca sus propias funciones incluidas', () => {
    expect(texts(CATALOG[0]!)).toEqual(['Hasta 10 recetas', 'Costeo básico con márgenes']);
  });

  it('no destaca lo que todavía no existe, ni lo próximamente de pago', () => {
    const featured = planHighlights(CATALOG[2]!, CATALOG).features;
    expect(featured.map(({ text }) => text)).not.toContain('Exportar a PDF');
    expect(featured.every(({ status }) => status === undefined)).toBe(true);
  });

  it('sin plan Free de referencia no resta nada', () => {
    expect(planHighlights(CATALOG[2]!, [CATALOG[2]!]).features.map(({ text }) => text)).toEqual([
      'Recetas ilimitadas',
      'Costeo básico con márgenes',
      'Duplicar recetas',
    ]);
  });

  it('recorta al tope y cuenta los que quedan fuera', () => {
    const generous = planFixture(
      'pro',
      Array.from({ length: PLAN_HIGHLIGHT_LIMIT + 2 }, (_, index) => ({
        text: `Función ${index + 1}`,
        included: true,
      }))
    );

    const highlights = planHighlights(generous, [generous]);

    expect(highlights.features).toHaveLength(PLAN_HIGHLIGHT_LIMIT);
    expect(highlights.remaining).toBe(2);
  });

  it('un plan sin funciones disponibles no destaca nada', () => {
    const empty = planFixture('basic', [
      { text: 'Exportar a PDF', included: false, status: 'coming_soon' },
    ]);

    expect(planHighlights(empty, CATALOG)).toEqual({
      features: [],
      remaining: 0,
    });
  });
});
