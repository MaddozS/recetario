import type { PlanFeature, PricingPlan, SubscriptionTier } from '@recetario/types';

/**
 * Fábrica de planes para los tests unitarios de la comparación: rellena el
 * catálogo que devuelve el API con lo que cada spec necesita (`features` es lo
 * único que leen `plan-highlights`, `plan-comparison` y `plan-order`).
 */
export function planFixture(tier: SubscriptionTier, features: PlanFeature[]): PricingPlan {
  return {
    id: tier,
    tier,
    name: tier,
    description: '',
    badge: null,
    currency: 'MXN',
    monthlyPriceId: null,
    monthlyDisplay: null,
    yearlyPriceId: null,
    yearlyDisplay: null,
    yearlyPerMonthDisplay: null,
    features,
  };
}
