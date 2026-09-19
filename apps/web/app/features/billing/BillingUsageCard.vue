<script setup lang="ts">
import { computed } from "vue";
import {
  usagePercentage,
  showsLowRemainingWarning,
} from "./billing-plan-state";

/**
 * Contador de uso con barra y aviso de límite cercano. El umbral y la unidad
 * son distintos por recurso (recetas 3, ingredientes 5), como en el baseline.
 */
const props = defineProps<{
  label: string;
  unit: string;
  count: number;
  limit: number | null;
  remaining: number | null;
  threshold: number;
}>();

const percentage = computed(() => usagePercentage(props.count, props.limit));
const limitLabel = computed(() =>
  props.remaining === null ? "∞" : String(props.limit ?? 0),
);
const showWarning = computed(() =>
  showsLowRemainingWarning(props.remaining, props.threshold),
);
</script>

<template>
  <Card padding="lg">
    <div class="mb-4 flex items-center justify-between">
      <p class="text-secondary-foreground text-sm font-bold">{{ label }}</p>
      <span class="text-subtle-foreground text-xs font-bold">
        {{ count }} / {{ limitLabel }}
      </span>
    </div>
    <div class="bg-muted h-2 overflow-hidden rounded-full">
      <div
        class="bg-accent-500 h-full rounded-full transition-all"
        :style="{ width: `${percentage}%` }"
      />
    </div>
    <p v-if="showWarning" class="text-warning mt-2 text-xs font-semibold">
      Te quedan {{ remaining }} {{ unit }}.
      <NuxtLink to="/pricing" class="underline">Actualizar plan</NuxtLink>
    </p>
  </Card>
</template>
