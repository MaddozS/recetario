import type { PricingPlan } from "@recetario/types";

/**
 * Orden de presentación de los planes en las superficies públicas: el
 * recomendado primero.
 *
 * El plan recomendado estaba al final del scroller, a dos swipes del primer
 * viewport en móvil. Se resuelve moviendo el **orden del DOM** (no `order` de
 * CSS, que dejaría la tabulación en desacuerdo con lo que se ve) y el mismo
 * orden lo usan la landing, `/pricing` y las columnas de la matriz, para que el
 * visitante compare lo que acaba de ver.
 */
export const RECOMMENDED_PLAN_ID = "pro";

export function displayPlanOrder(plans: PricingPlan[]): PricingPlan[] {
  const recommended = plans.find((plan) => plan.id === RECOMMENDED_PLAN_ID);
  if (!recommended) return [...plans];

  return [
    recommended,
    ...plans.filter((plan) => plan.id !== RECOMMENDED_PLAN_ID),
  ];
}
