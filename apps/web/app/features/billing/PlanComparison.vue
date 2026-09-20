<script setup lang="ts">
import { computed } from "vue";
import type { PricingPlan } from "@recetario/types";
import PlanFeatureList from "./PlanFeatureList.vue";
import { comparePlans } from "./plan-comparison";
import { displayPlanOrder } from "./plan-order";
import {
  PLAN_FEATURE_ICONS,
  PLAN_FEATURE_ICON_CLASSES,
  PLAN_FEATURE_STATE_LABELS,
  PLAN_FEATURE_TEXT_CLASSES,
} from "./plan-feature-state";

/**
 * Comparación de planes de `/pricing`: la superficie donde se decide entre dos
 * planes, no donde se lee el pitch de uno (eso es la landing, con sus
 * destacados).
 *
 * La tabla sólo lleva las filas que **cambian** entre planes, una celda por
 * plan con el estado y el texto de ese plan; lo idéntico en los tres se lista
 * una sola vez debajo. Así comparar dos planes es leer una lane horizontal y no
 * memorizar tres listas de 14 filas, y las columnas van en el mismo orden que
 * las cards (lo impone el propio componente: el orden de las columnas y el de
 * las cards no pueden desincronizarse), con el plan del visitante marcado.
 *
 * Con menos de dos planes, o sin filas que mostrar, no hay nada que comparar
 * (catálogo caído o parcial): la sección no pinta un encabezado huérfano.
 */
const props = withDefaults(
  defineProps<{
    plans: PricingPlan[];
    /** Tier del visitante autenticado, para marcar su columna. */
    currentPlanId?: string;
  }>(),
  { currentPlanId: undefined },
);

const orderedPlans = computed(() => displayPlanOrder(props.plans));
const comparison = computed(() => comparePlans(orderedPlans.value));
const hasRows = computed(
  () => comparison.value.changing.length > 0 || comparison.value.shared.length > 0,
);
</script>

<template>
  <section
    v-if="orderedPlans.length > 1 && hasRows"
    aria-labelledby="plan-comparison-heading"
    class="mt-16"
  >
    <h2
      id="plan-comparison-heading"
      class="text-foreground font-display text-2xl font-black"
    >
      Comparar planes
    </h2>

    <template v-if="comparison.changing.length > 0">
      <h3 class="text-foreground font-display mt-8 text-lg font-bold">
        Lo que cambia según el plan
      </h3>
      <table class="mt-4 w-full table-fixed border-collapse">
        <caption class="sr-only">
          Funciones que cambian entre planes. Cada columna es un plan y cada
          celda dice el estado de esa función en ese plan.
        </caption>
        <thead>
          <tr>
            <th
              v-for="plan in orderedPlans"
              :key="plan.id"
              scope="col"
              class="border-border text-secondary-foreground border-b border-l px-3 pb-3 text-left text-sm font-bold first:border-l-0 first:pl-0 last:pr-0"
            >
              {{ plan.name }}
              <span
                v-if="plan.id === currentPlanId"
                class="text-muted-foreground mt-1 block text-xs font-semibold"
              >
                Plan actual
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, index) in comparison.changing"
            :key="index"
            class="align-top"
          >
            <td
              v-for="(cell, column) in row"
              :key="orderedPlans[column]?.id"
              class="border-border border-b border-l px-3 py-3 align-top first:border-l-0 first:pl-0 last:pr-0"
            >
              <div v-if="cell.state" class="flex items-start gap-1.5">
                <Icon
                  :name="PLAN_FEATURE_ICONS[cell.state]"
                  :size="16"
                  class="mt-0.5 shrink-0"
                  :class="PLAN_FEATURE_ICON_CLASSES[cell.state]"
                />
                <span class="text-xs break-words sm:text-sm">
                  <span class="sr-only">
                    {{ PLAN_FEATURE_STATE_LABELS[cell.state] }}:
                  </span>
                  <span :class="PLAN_FEATURE_TEXT_CLASSES[cell.state]">
                    {{ cell.text }}
                  </span>
                </span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </template>

    <template v-if="comparison.shared.length > 0">
      <h3 class="text-foreground font-display mt-8 text-lg font-bold">
        Igual en todos los planes
      </h3>
      <PlanFeatureList :features="comparison.shared" class="mt-4" />
    </template>
  </section>
</template>
