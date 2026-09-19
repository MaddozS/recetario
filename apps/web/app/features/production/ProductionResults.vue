<script setup lang="ts">
import { computed } from "vue";
import FinancialSummary from "~/features/recipes/FinancialSummary.vue";
import type { FinancialRow } from "~/features/recipes/recipe-financials";
import { formatCurrency } from "./production-format";
import ProductionIngredientsSheet from "./ProductionIngredientsSheet.vue";
import ProductionRecipeBreakdown from "./ProductionRecipeBreakdown.vue";
import type {
  ConsolidatedIngredient,
  ProductionSummary,
} from "./production-types";

/**
 * Resultados del plan: toolbar con el conteo de la selección, hojas de insumos,
 * resumen financiero y desglose, y el botón de imprimir. Mientras el detalle de
 * una receta recién seleccionada viaja, muestra skeletons (nunca cifras
 * parciales).
 */
const props = defineProps<{
  summary: ProductionSummary;
  ingredients: ConsolidatedIngredient[];
  selectionLabel: string;
  pending: boolean;
  failed: boolean;
}>();

const emit = defineEmits<{ edit: []; retry: [] }>();

const financialRows = computed<FinancialRow[]>(() => {
  const {
    totalIngredientsCost,
    totalOperationalCost,
    projectedRevenue,
    estimatedProfit,
    effectiveMargin,
  } = props.summary;
  const noRevenue = projectedRevenue <= 0;

  return [
    {
      label: "Costo Insumos",
      value: formatCurrency(totalIngredientsCost),
      subtitle: "Materiales de todas las recetas",
      color: "danger",
    },
    {
      label: "Gastos Operativos",
      value: formatCurrency(totalOperationalCost),
      subtitle: "Servicios, labor, etc.",
      color: "muted",
    },
    {
      label: "Ingresos Proyectados",
      value: noRevenue ? "Sin datos" : formatCurrency(projectedRevenue),
      subtitle: noRevenue
        ? "Configura precios de venta en las presentaciones"
        : "Ventas totales proyectadas",
      color: "accent",
    },
    {
      label: "Ganancia Estimada",
      value: noRevenue ? "Sin datos" : formatCurrency(estimatedProfit),
      subtitle: noRevenue ? "" : "Margen de ganancia estimada",
      secondaryValue: noRevenue ? undefined : `${effectiveMargin.toFixed(1)}%`,
      color: "success",
    },
  ];
});

function printSheet(): void {
  if (import.meta.client) window.print();
}
</script>

<template>
  <div class="space-y-6">
    <div
      id="results-toolbar"
      class="border-border bg-card/95 sticky top-0 z-10 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm backdrop-blur"
    >
      <span data-results-count class="text-foreground text-sm font-bold">
        {{ selectionLabel }}
      </span>
      <Button variant="secondary" icon="arrow-left" @click="emit('edit')">
        Editar selección
      </Button>
    </div>

    <div v-if="pending" data-results-pending class="animate-pulse space-y-6">
      <Card padding="lg" class="bg-card/60 h-44" />
      <Card padding="lg" class="bg-card/60 h-32" />
    </div>

    <Card v-else-if="failed" padding="lg">
      <FeedbackAlert
        type="error"
        message="No se pudieron cargar las recetas seleccionadas."
      />
      <Button
        data-retry
        variant="secondary"
        icon="refresh-cw"
        class="mt-4"
        @click="emit('retry')"
      >
        Reintentar
      </Button>
    </Card>

    <template v-else-if="summary.perRecipe.length > 0">
      <ProductionIngredientsSheet
        v-if="ingredients.length > 0"
        :ingredients="ingredients"
      />

      <FinancialSummary
        class="production-sheet financial-summary"
        title="Resumen financiero"
        :rows="financialRows"
      />

      <ProductionRecipeBreakdown :recipes="summary.perRecipe" />

      <div class="no-print flex justify-center">
        <Button variant="secondary" icon="printer" @click="printSheet">
          Imprimir hoja de producción
        </Button>
      </div>
    </template>
  </div>
</template>
