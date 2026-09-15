<script setup lang="ts">
import { timeAgo } from "@recetario/stripe/formatters";
import { computed } from "vue";

/**
 * Tarjetas de estado del recetario. Paridad con las "info-cards" de Astro: el
 * mensaje cambia según haya o no recetas incompletas / sin categoría.
 */
const props = defineProps<{
  incompleteCount: number;
  withoutCategoryCount: number;
  lastUpdatedAt: string | null;
}>();

const LABEL_CLASSES =
  "flex items-center gap-2 text-xs font-semibold text-muted-foreground";

const lastUpdatedLabel = computed(() =>
  props.lastUpdatedAt ? timeAgo(props.lastUpdatedAt) : "Sin actividad",
);
</script>

<template>
  <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
    <Card padding="sm">
      <div :class="LABEL_CLASSES">
        <Icon name="lucide:alert-triangle" :size="14" />
        Recetas por completar
      </div>
      <div v-if="incompleteCount > 0" class="mt-2">
        <p class="text-foreground font-bold">{{ incompleteCount }} recetas</p>
        <p class="text-muted-foreground text-sm">sin ingredientes asignados</p>
      </div>
      <p v-else class="text-success mt-2 text-sm font-medium">
        Todas tienen ingredientes
      </p>
    </Card>

    <Card padding="sm">
      <div :class="LABEL_CLASSES">
        <Icon name="lucide:tag" :size="14" />
        Sin categoría
      </div>
      <div v-if="withoutCategoryCount > 0" class="mt-2">
        <p class="text-foreground font-bold">
          {{ withoutCategoryCount }} recetas
        </p>
        <p class="text-muted-foreground text-sm">sin categoría asignada</p>
      </div>
      <p v-else class="text-success mt-2 text-sm font-medium">
        Todas están categorizadas
      </p>
    </Card>

    <Card padding="sm">
      <div :class="LABEL_CLASSES">
        <Icon name="lucide:clock" :size="14" />
        Última modificación
      </div>
      <p class="text-foreground mt-2 font-bold">{{ lastUpdatedLabel }}</p>
    </Card>
  </div>
</template>
