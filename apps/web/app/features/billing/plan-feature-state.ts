import type { PlanFeature } from "@recetario/types";

/**
 * Estado de una fila de plan y su presentación: la fuente única del contrato
 * accesible de T2 (el estado se dice en texto, no sólo por ícono y color).
 *
 * Disponibilidad e inclusión son dos hechos distintos, y colapsarlos hacía que
 * "Próximamente" tapara una diferencia real: hay funciones futuras que Free no
 * tendrá y Basic/Pro sí. La **marca** dice la inclusión (también la futura) y
 * el **marcador** visible dice "Próximamente" mientras no esté disponible, así
 * que el comprador no depende del color ni del lector de pantalla.
 *
 * Vive fuera de `PlanFeatureList` porque hay dos consumidores con formas
 * distintas: la lista (`ul`/`li`, con o sin destacados) y la matriz de
 * comparación de `/pricing` (`table`, una celda por plan). Duplicar la cascada
 * de `planFeatureState` sería la forma más rápida de que las dos superficies
 * empezaran a contar cosas distintas sobre el mismo plan.
 */
export type PlanFeatureState =
  | "included"
  | "excluded"
  | "coming_soon"
  | "coming_soon_excluded";

export interface PlanFeaturePresentation {
  /** Ícono de lucide: dice la inclusión, también la futura. */
  icon: string;
  iconClass: string;
  textClass: string;
  /** Etiqueta accesible del estado; la dicen los `sr-only` de los consumidores. */
  label: string;
  /** Texto visible de lo que todavía no está disponible; vacío si no aplica. */
  marker: string;
}

/** Un solo mapa por estado: añadir uno no obliga a tocar cinco listas. */
export const PLAN_FEATURE_PRESENTATION: Record<
  PlanFeatureState,
  PlanFeaturePresentation
> = {
  included: {
    icon: "lucide:check",
    iconClass: "text-success",
    textClass: "text-secondary-foreground",
    label: "Incluido",
    marker: "",
  },
  excluded: {
    icon: "lucide:x",
    iconClass: "text-subtle-foreground",
    textClass: "text-subtle-foreground",
    label: "No incluido",
    marker: "",
  },
  coming_soon: {
    icon: "lucide:check",
    iconClass: "text-success",
    textClass: "text-secondary-foreground",
    label: "Incluido, próximamente",
    marker: "Próximamente",
  },
  coming_soon_excluded: {
    icon: "lucide:x",
    iconClass: "text-subtle-foreground",
    textClass: "text-subtle-foreground",
    label: "No incluido, próximamente",
    marker: "Próximamente",
  },
};

/**
 * El marcador visible de una fila, con su separador cuando va detrás de la
 * frase del plan ("Exportar a PDF · Próximamente"); sola, sin separador.
 */
export function planFeatureMarker(
  state: PlanFeatureState,
  text: string | null,
): string {
  const { marker } = PLAN_FEATURE_PRESENTATION[state];
  return text && marker ? ` · ${marker}` : marker;
}

/** `coming_soon` no colapsa `included`: la inclusión futura es la diferencia. */
export function planFeatureState(feature: PlanFeature): PlanFeatureState {
  if (feature.status === "coming_soon") {
    return feature.included ? "coming_soon" : "coming_soon_excluded";
  }

  return feature.included ? "included" : "excluded";
}
