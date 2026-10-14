<script setup lang="ts">
import { computed } from 'vue';
import type { PricingPlan } from '@recetario/types';
import { comparePlans, type PlanComparisonCell } from './plan-comparison';
import { displayPlanOrder } from './plan-order';
import {
  PLAN_FEATURE_PRESENTATION,
  planFeatureMarker,
  type PlanFeaturePresentation,
} from './plan-feature-state';

/**
 * Comparación de planes de `/pricing`: la superficie donde se decide entre dos
 * planes, no donde se lee el pitch de uno (eso es la landing, con sus
 * destacados).
 *
 * Una sola tabla matriz con **todas** las funciones del catálogo, en su orden:
 * una columna con el nombre de la función y una columna por plan, en el mismo
 * orden que las cards (lo impone el propio componente, así no pueden
 * desincronizarse), con el plan del visitante marcado. Cada celda lleva la marca
 * de inclusión —también la futura— y la frase del plan cuando dice más que la
 * etiqueta de fila ("Hasta 10 recetas" bajo "Recetas"): por eso lo que todos los
 * planes comparten aparece con sus marcas y no repite su frase tres veces.
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
  { currentPlanId: undefined }
);

interface ComparisonCell extends PlanComparisonCell {
  /** Presentación del estado; `null` cuando el plan no trae la fila. */
  presentation: PlanFeaturePresentation | null;
  marker: string;
}

interface ComparisonRow {
  label: string;
  cells: ComparisonCell[];
}

const orderedPlans = computed(() => displayPlanOrder(props.plans));
const rows = computed<ComparisonRow[]>(() =>
  comparePlans(orderedPlans.value).map((row) => ({
    label: row.label,
    cells: row.cells.map((cell) => ({
      ...cell,
      presentation: cell.state ? PLAN_FEATURE_PRESENTATION[cell.state] : null,
      marker: cell.state ? planFeatureMarker(cell.state, cell.text) : '',
    })),
  }))
);
</script>

<template>
  <section
    v-if="orderedPlans.length > 1 && rows.length > 0"
    aria-labelledby="plan-comparison-heading"
    class="mt-16"
  >
    <h2 id="plan-comparison-heading" class="text-foreground font-display text-2xl font-black">
      Comparar planes
    </h2>

    <table class="mt-4 w-full table-fixed border-collapse">
      <caption class="sr-only">
        Todas las funciones del catálogo. Cada columna es un plan y cada celda dice el estado de esa
        función en ese plan.
      </caption>
      <thead>
        <tr>
          <th
            scope="col"
            class="border-border text-muted-foreground w-[28%] border-b pr-2 pb-3 pl-0 text-left text-xs font-bold md:w-1/4 md:pr-3 md:text-sm"
          >
            Función
          </th>
          <th
            v-for="plan in orderedPlans"
            :key="plan.id"
            scope="col"
            class="border-border text-secondary-foreground border-b border-l px-2 pb-3 text-left text-sm font-bold last:pr-0 md:px-3"
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
        <tr v-for="(row, index) in rows" :key="index" class="align-top">
          <th
            scope="row"
            class="border-border text-foreground border-b py-2.5 pr-2 pl-0 text-left align-top text-[11px] font-semibold break-words hyphens-auto md:py-3 md:pr-3 md:text-xs"
          >
            {{ row.label }}
          </th>
          <td
            v-for="(cell, column) in row.cells"
            :key="orderedPlans[column]?.id"
            class="border-border border-b border-l px-1.5 py-2.5 align-top last:pr-0 sm:px-2 md:px-3 md:py-3"
          >
            <div
              v-if="cell.presentation"
              class="flex flex-col gap-1 md:flex-row md:items-start md:gap-1.5"
            >
              <Icon
                :name="cell.presentation.icon"
                :size="16"
                class="mt-0.5 size-3.5 shrink-0 md:size-4"
                :class="cell.presentation.iconClass"
              />
              <span class="text-[11px] leading-snug break-words hyphens-auto sm:text-xs md:text-sm">
                <span class="sr-only"> {{ cell.presentation.label }}: </span>
                <span v-if="cell.text" :class="cell.presentation.textClass">
                  {{ cell.text }}
                </span>
                <span
                  v-if="cell.marker"
                  aria-hidden="true"
                  class="text-muted-foreground text-[10px] sm:text-xs"
                >
                  {{ cell.marker }}
                </span>
              </span>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </section>
</template>
