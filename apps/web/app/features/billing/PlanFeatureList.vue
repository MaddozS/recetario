<script setup lang="ts">
import { computed } from "vue";
import type { PlanFeature } from "@recetario/types";
import {
  PLAN_FEATURE_ICONS,
  PLAN_FEATURE_ICON_CLASSES,
  PLAN_FEATURE_STATE_LABELS,
  PLAN_FEATURE_TEXT_CLASSES,
  planFeatureState,
} from "./plan-feature-state";

/**
 * Lista de features de un plan: `ul`/`li` con el estado dicho en texto (oculto)
 * además del ícono y el color.
 *
 * Los íconos van `aria-hidden`, así que sin esa línea la diferencia entre
 * "incluido" y "no incluido" —que es lo que se compra— no existiría para un
 * lector de pantalla. El estado se resuelve en `plan-feature-state` (lo comparte
 * la matriz de `/pricing`) y aquí sólo se pinta.
 *
 * `compact` es la variante de la landing: mismos contratos, menos aire, y el
 * recorte dicho en texto ("y N funciones más") cuando los destacados no son
 * todos los que hay. La lista larga de `PlanChangeDialog` sigue en `full`.
 */
type Variant = "full" | "compact";

const props = withDefaults(
  defineProps<{
    features: PlanFeature[];
    variant?: Variant;
    /** Destacados que no entran en el tope: alimenta el "y N funciones más". */
    remaining?: number;
  }>(),
  { variant: "full", remaining: 0 },
);

const LIST_CLASSES: Record<Variant, string> = {
  full: "space-y-3",
  compact: "space-y-2.5",
};

/** El recorte se dice en texto: la card nunca aparenta ser el catálogo entero. */
const remainingLabel = computed(() =>
  props.remaining === 1
    ? "y 1 función más"
    : `y ${props.remaining} funciones más`,
);
</script>

<template>
  <div>
    <ul :class="LIST_CLASSES[props.variant]">
      <li
        v-for="(feature, index) in features"
        :key="index"
        class="flex min-w-0 items-center gap-2.5 text-sm"
      >
        <Icon
          :name="PLAN_FEATURE_ICONS[planFeatureState(feature)]"
          :size="16"
          :class="PLAN_FEATURE_ICON_CLASSES[planFeatureState(feature)]"
        />
        <span class="sr-only">
          {{ PLAN_FEATURE_STATE_LABELS[planFeatureState(feature)] }}:
        </span>
        <span
          :class="[
            PLAN_FEATURE_TEXT_CLASSES[planFeatureState(feature)],
            'break-words',
          ]"
        >
          {{ feature.text }}
        </span>
      </li>
    </ul>

    <p v-if="props.remaining > 0" class="text-subtle-foreground mt-3 text-sm">
      {{ remainingLabel }}
    </p>
  </div>
</template>
