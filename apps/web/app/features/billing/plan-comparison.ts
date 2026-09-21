import type { PlanFeature, PricingPlan } from "@recetario/types";
import { planFeatureState, type PlanFeatureState } from "./plan-feature-state";

/**
 * Matriz de comparación de `/pricing`: **todas** las funciones del catálogo,
 * una fila por slot, en el orden del catálogo.
 *
 * El catálogo está escrito por plan, no por dimensión (`"Hasta 10 recetas"`,
 * `"Hasta 75 recetas"` y `"Recetas ilimitadas"` son tres frases, no un valor por
 * columna), así que la etiqueta de fila sale del catálogo: `label` cuando la
 * frase cambia entre planes y la frase misma cuando es idéntica en los tres
 * (ahí ya hace de nombre). Esa etiqueta es lo que permite que lo compartido
 * aparezca como una fila más, sin repetir la frase en las tres columnas.
 *
 * Los planes se alinean **por slot** (índice), que es como los escribe
 * `TIER_CONFIG`: mismo orden y misma longitud en los tres tiers. Un plan más
 * corto deja celdas nulas en las filas que no alcanza, en vez de desplazar el
 * resto de la tabla.
 */
export interface PlanComparisonCell {
  /** Frase propia del plan cuando dice más que la etiqueta; `null` si no. */
  text: string | null;
  /** `null` cuando ese plan no trae la función (catálogo más corto). */
  state: PlanFeatureState | null;
}

export interface PlanComparisonRow {
  /** Etiqueta de fila: el nombre de la función en el catálogo. */
  label: string;
  /** Una celda por plan, en el orden recibido. */
  cells: PlanComparisonCell[];
}

export function comparePlans(plans: PricingPlan[]): PlanComparisonRow[] {
  const slots = plans.reduce(
    (max, plan) => Math.max(max, plan.features.length),
    0,
  );
  const rows: PlanComparisonRow[] = [];

  for (let index = 0; index < slots; index += 1) {
    const features = plans.map((plan) => plan.features[index] ?? null);
    const first = features.find(
      (feature): feature is PlanFeature => feature !== null,
    );
    if (!first) continue;

    const label = first.label ?? first.text;
    rows.push({
      label,
      cells: features.map((feature) =>
        feature === null
          ? { text: null, state: null }
          : {
              text: feature.text === label ? null : feature.text,
              state: planFeatureState(feature),
            },
      ),
    });
  }

  return rows;
}
