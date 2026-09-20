import type { PlanFeature, PricingPlan } from "@recetario/types";
import { planFeatureState, type PlanFeatureState } from "./plan-feature-state";

/**
 * Comparación de planes para `/pricing`: parte el catálogo en lo que **cambia**
 * entre planes y lo que es **igual en todos**.
 *
 * El catálogo está escrito por plan, no por dimensión (`"Hasta 10 recetas"`,
 * `"Hasta 75 recetas"` y `"Recetas ilimitadas"` son tres frases, no un valor por
 * columna), así que la matriz no inventa etiquetas de fila: cada celda lleva el
 * texto de su propio plan y el estado. Las filas idénticas en los tres planes no
 * se repiten tres veces: se listan una sola vez.
 *
 * Los planes se alinean **por slot** (índice), que es como los escribe
 * `TIER_CONFIG`: mismo orden y misma longitud en los tres tiers. Un plan más
 * corto deja celdas nulas en las filas que no alcanza, en vez de desplazar el
 * resto de la tabla.
 */
export interface PlanComparisonCell {
  text: string | null;
  state: PlanFeatureState | null;
}

export interface PlanComparison {
  /** Filas donde el texto o el estado no coincide en todos los planes. */
  changing: PlanComparisonCell[][];
  /** Filas idénticas en todos los planes, listadas una sola vez. */
  shared: PlanFeature[];
}

export function comparePlans(plans: PricingPlan[]): PlanComparison {
  const slots = plans.reduce(
    (max, plan) => Math.max(max, plan.features.length),
    0,
  );
  const changing: PlanComparisonCell[][] = [];
  const shared: PlanFeature[] = [];

  for (let index = 0; index < slots; index += 1) {
    const features = plans.map((plan) => plan.features[index] ?? null);
    if (features.every((feature) => feature === null)) continue;

    const cells = features.map((feature) =>
      feature === null
        ? { text: null, state: null }
        : { text: feature.text, state: planFeatureState(feature) },
    );
    const sameText = cells.every((cell) => cell.text === cells[0]?.text);
    const sameState = cells.every((cell) => cell.state === cells[0]?.state);

    if (sameText && sameState) {
      shared.push(features[0]!);
    } else {
      changing.push(cells);
    }
  }

  return { changing, shared };
}
