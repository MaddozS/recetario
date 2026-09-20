import type { PlanFeature } from "@recetario/types";

/**
 * Estado de una fila de plan y su presentación: la fuente única del contrato
 * accesible de T2 (el estado se dice en texto, no sólo por ícono y color).
 *
 * Vive fuera de `PlanFeatureList` porque hay dos consumidores con formas
 * distintas: la lista (`ul`/`li`, con o sin destacados) y la matriz de
 * comparación de `/pricing` (`table`, una celda por plan). Duplicar la cascada
 * de `stateOf` sería la forma más rápida de que las dos superficies empezaran a
 * contar cosas distintas sobre el mismo plan.
 */
export type PlanFeatureState = "included" | "excluded" | "coming_soon";

export const PLAN_FEATURE_ICONS: Record<PlanFeatureState, string> = {
  included: "lucide:check",
  excluded: "lucide:x",
  coming_soon: "lucide:clock",
};

export const PLAN_FEATURE_ICON_CLASSES: Record<PlanFeatureState, string> = {
  included: "text-success",
  excluded: "text-subtle-foreground",
  coming_soon: "text-subtle-foreground",
};

export const PLAN_FEATURE_TEXT_CLASSES: Record<PlanFeatureState, string> = {
  included: "text-secondary-foreground",
  excluded: "text-subtle-foreground",
  coming_soon: "text-subtle-foreground",
};

export const PLAN_FEATURE_STATE_LABELS: Record<PlanFeatureState, string> = {
  included: "Incluido",
  excluded: "No incluido",
  coming_soon: "Próximamente",
};

/** `coming_soon` manda sobre `included`: una función futura no está disponible. */
export function planFeatureState(feature: PlanFeature): PlanFeatureState {
  if (feature.status === "coming_soon") return "coming_soon";
  return feature.included ? "included" : "excluded";
}
