<script setup lang="ts">
import type { PlanFeature } from "@recetario/types";

/**
 * Lista de features de un plan: `ul`/`li` con el estado dicho en texto (oculto)
 * además del ícono y el color.
 *
 * Los íconos van `aria-hidden`, así que sin esa línea la diferencia entre
 * "incluido" y "no incluido" —que es lo que se compra— no existiría para un
 * lector de pantalla. El estado se resuelve una vez (`stateOf`) y de ahí salen
 * ícono, color y etiqueta.
 */
defineProps<{ features: PlanFeature[] }>();

type FeatureState = "included" | "excluded" | "coming_soon";

const STATE_ICONS: Record<FeatureState, string> = {
  included: "lucide:check",
  excluded: "lucide:x",
  coming_soon: "lucide:clock",
};

const STATE_ICON_CLASSES: Record<FeatureState, string> = {
  included: "text-success",
  excluded: "text-subtle-foreground",
  coming_soon: "text-subtle-foreground",
};

const STATE_TEXT_CLASSES: Record<FeatureState, string> = {
  included: "text-secondary-foreground",
  excluded: "text-subtle-foreground",
  coming_soon: "text-subtle-foreground",
};

const STATE_LABELS: Record<FeatureState, string> = {
  included: "Incluido",
  excluded: "No incluido",
  coming_soon: "Próximamente",
};

function stateOf(feature: PlanFeature): FeatureState {
  if (feature.status === "coming_soon") return "coming_soon";
  return feature.included ? "included" : "excluded";
}
</script>

<template>
  <ul class="space-y-3">
    <li
      v-for="(feature, index) in features"
      :key="index"
      class="flex min-w-0 items-center gap-2.5 text-sm"
    >
      <Icon
        :name="STATE_ICONS[stateOf(feature)]"
        :size="16"
        :class="STATE_ICON_CLASSES[stateOf(feature)]"
      />
      <span class="sr-only">{{ STATE_LABELS[stateOf(feature)] }}:</span>
      <span :class="[STATE_TEXT_CLASSES[stateOf(feature)], 'break-words']">
        {{ feature.text }}
      </span>
    </li>
  </ul>
</template>
