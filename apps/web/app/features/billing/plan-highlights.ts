import type { PlanFeature, PricingPlan } from "@recetario/types";
import { planFeatureState } from "./plan-feature-state";

/**
 * Destacados de un plan para la landing: la respuesta corta a "¿qué gano con
 * este plan?", que es una pregunta distinta de la que responde `/pricing`
 * ("¿qué cambia exactamente entre dos planes?").
 *
 * Un destacado es lo **incluido y disponible** (`included` y sin
 * `coming_soon`: no se vende lo que todavía no existe) que además **no está
 * incluido en el plan Free**: en un plan de pago, repetir lo que ya se tiene
 * gratis no es un argumento. El plan Free se queda con sus propias funciones
 * incluidas, que es exactamente lo que ofrece.
 */
export const PLAN_HIGHLIGHT_LIMIT = 5;

export interface PlanHighlights {
  /** Los destacados a mostrar, en el orden del catálogo. */
  features: PlanFeature[];
  /** Destacados que no entran en el tope: alimenta el "y N funciones más". */
  remaining: number;
}

function isAvailable(feature: PlanFeature): boolean {
  return planFeatureState(feature) === "included";
}

export function planHighlights(
  plan: PricingPlan,
  plans: PricingPlan[],
): PlanHighlights {
  const baseline = plans.find((candidate) => candidate.id === "free");
  const baselineTexts =
    baseline && baseline.id !== plan.id
      ? new Set(baseline.features.filter(isAvailable).map(({ text }) => text))
      : new Set<string>();

  const candidates = plan.features.filter(
    (feature) => isAvailable(feature) && !baselineTexts.has(feature.text),
  );
  const features = candidates.slice(0, PLAN_HIGHLIGHT_LIMIT);

  return { features, remaining: candidates.length - features.length };
}
