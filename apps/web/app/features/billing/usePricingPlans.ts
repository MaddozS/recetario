import { plansListResponseSchema, type PricingPlan } from '@recetario/types';

/**
 * Catálogo público de planes (`GET /api/billing/plans`, sin auth).
 *
 * El fallo no se traga: `useAsyncData` expone `error` y la superficie avisa
 * ("No pudimos cargar los planes"). Antes se devolvía `[]` y una caída del API
 * se renderizaba como "no hay planes disponibles", que es una mentira sobre el
 * producto. El `default` mantiene el render público a salvo (nunca revienta por
 * una lista vacía) y `useAsyncData` comparte la misma clave entre landing y
 * `/pricing`, así que la navegación cliente no vuelve a pedirla.
 */
export function usePricingPlans() {
  const api = useApi();

  const { data, pending, error } = useAsyncData<PricingPlan[]>(
    'billing-plans',
    () => api('/api/billing/plans', { schema: plansListResponseSchema }),
    { default: () => [] }
  );

  return { plans: data, pending, error };
}
