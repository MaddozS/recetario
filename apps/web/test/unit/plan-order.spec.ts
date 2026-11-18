import { describe, expect, it } from 'vitest';
import type { PricingPlan } from '@recetario/types';
import { displayPlanOrder } from '../../app/features/billing/plan-order';
import { planFixture } from './support/plan-fixture';

function ids(plans: PricingPlan[]): string[] {
  return plans.map(({ id }) => id);
}

describe('displayPlanOrder', () => {
  it('el plan recomendado va primero y el resto conserva su orden', () => {
    const catalog = [planFixture('free', []), planFixture('basic', []), planFixture('pro', [])];

    expect(ids(displayPlanOrder(catalog))).toEqual(['pro', 'free', 'basic']);
    // No muta la entrada: el orden del catálogo sigue siendo el del API.
    expect(ids(catalog)).toEqual(['free', 'basic', 'pro']);
  });

  it('sin recomendado en el catálogo devuelve el mismo orden', () => {
    expect(ids(displayPlanOrder([planFixture('free', []), planFixture('basic', [])]))).toEqual([
      'free',
      'basic',
    ]);
    expect(displayPlanOrder([])).toEqual([]);
  });
});
