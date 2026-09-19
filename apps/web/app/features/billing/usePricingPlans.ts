import { plansListResponseSchema, type PricingPlan } from "@recetario/types";

/**
 * Catálogo público de planes (`GET /api/billing/plans`, sin auth).
 *
 * La landing del baseline degradaba a `[]` con un `console.error` si el API falla;
 * aquí se conserva ese contrato para no romper el render público. `useAsyncData`
 * comparte la misma clave entre landing y `/pricing`, así que la navegación
 * cliente no vuelve a pedirla.
 */
export function usePricingPlans() {
  const api = useApi();

  const { data, pending, error } = useAsyncData<PricingPlan[]>(
    "billing-plans",
    async () => {
      try {
        return await api("/api/billing/plans", {
          schema: plansListResponseSchema,
        });
      } catch (cause) {
        console.error(
          "[billing] plans fetch failed, rendering with empty prices:",
          cause,
        );
        return [];
      }
    },
    { default: () => [] },
  );

  return { plans: data, pending, error };
}
