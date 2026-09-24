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

/** Tramos del resumen del plan: lo que cuesta y lo que deja la producción. */
const COST_GROUP = "Costos";
const RESULT_GROUP = "Resultado";

const financialRows = computed<FinancialRow[]>(() => {
  const {
    totalIngredientsCost,
    totalOperationalCost,
    totalProductionCost,
    projectedRevenue,
    estimatedProfit,
    effectiveMargin,
  } = props.summary;
  const noRevenue = projectedRevenue <= 0;

  return [
    {
      label: "Insumos",
      value: formatCurrency(totalIngredientsCost),
      subtitle: "Materiales de todas las recetas",
      group: COST_GROUP,
    },
    {
      label: "Gastos Operativos",
      value: formatCurrency(totalOperationalCost),
      subtitle: "Servicios, labor, etc.",
      op: "+",
      group: COST_GROUP,
    },
    {
      label: "Costo Total",
      value: formatCurrency(totalProductionCost),
      subtitle: "Insumos + Gastos Operativos",
      emphasis: "total",
      op: "=",
      group: COST_GROUP,
    },
    {
      label: "Ingresos Proyectados",
      value: noRevenue ? "Sin datos" : formatCurrency(projectedRevenue),
      subtitle: noRevenue
        ? "Configura precios de venta en las presentaciones"
        : "Ventas totales proyectadas",
      group: RESULT_GROUP,
      emphasis: "answer",
    },
    {
      label: "Ganancia Estimada",
      value: noRevenue ? "Sin datos" : formatCurrency(estimatedProfit),
      // El margen va en la misma línea del texto: la celda se lee de un vistazo.
      // Sin ingresos no hay margen que mostrar (el aviso vive en la fila previa).
      subtitle: noRevenue
        ? ""
        : `Margen de ganancia estimada: ${effectiveMargin.toFixed(1)}%`,
      group: RESULT_GROUP,
      emphasis: "answer",
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
      class="border-border bg-card sticky top-0 z-10 flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 shadow-sm"
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
        :scope="selectionLabel"
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
