<script setup lang="ts">
import type { PlanFeature } from "@recetario/types";

/**
 * Lista de features de un plan. Mismo criterio visual que el original: `clock`
 * para `coming_soon`, `check`/`x` según `included`, y las clases de color
 * correspondientes.
 */
defineProps<{ features: PlanFeature[] }>();

function iconFor(feature: PlanFeature): string {
  if (feature.status === "coming_soon") return "lucide:clock";
  return feature.included ? "lucide:check" : "lucide:x";
}

function iconClass(feature: PlanFeature): string {
  if (feature.status === "coming_soon") return "text-subtle-foreground";
  return feature.included ? "text-success" : "text-subtle-foreground";
}

function textClass(feature: PlanFeature): string {
  if (feature.status === "coming_soon") return "text-subtle-foreground";
  return feature.included ? "text-secondary-foreground" : "text-subtle-foreground";
}
</script>

<template>
  <div class="space-y-3">
    <div
      v-for="(feature, index) in features"
      :key="index"
      class="flex min-w-0 items-center gap-2.5 text-sm"
    >
      <Icon :name="iconFor(feature)" :size="16" :class="iconClass(feature)" />
      <span :class="[textClass(feature), 'break-words']">
        {{ feature.text }}
      </span>
    </div>
  </div>
</template>
