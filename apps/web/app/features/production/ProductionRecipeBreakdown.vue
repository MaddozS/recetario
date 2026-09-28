<script setup lang="ts">
import {
  bestPresentationId,
  presentationMargin,
} from "./production-calculator";
import {
  batchesCountLabel,
  formatCurrency,
  marginText,
  marginTone as toneFor,
} from "./production-format";
import type { ProductionRecipeResult } from "./production-types";

/**
 * Desglose por receta: costos, tabla de presentaciones con las etiquetas
 * «Seleccionada»/«Más rentable» y margen coloreado. Conserva las clases del
 * contrato de impresión (`production-sheet`, `prod-row`).
 */
defineProps<{ recipes: ProductionRecipeResult[] }>();

const PRES_ROW_GRID_CLASSES =
  "prod-row grid grid-cols-1 gap-1.5 px-4 py-3 sm:px-5 md:grid-cols-[minmax(0,1.8fr)_repeat(5,minmax(0,0.9fr))] md:items-center md:gap-4";

const CELL_LABEL_CLASSES =
  "text-subtle-foreground block text-[10px] font-black tracking-wider uppercase md:hidden";

/**
 * Esquinas rectas a la izquierda: con radio, el borde de 3px se curva y la
 * barra deja de verse como en el resumen financiero. La barra es neutra: un
 * costo no es un peligro y el acento está reservado para acciones y selección.
 */
const COST_CARD_CLASSES =
  "bg-muted/40 border-l-muted-foreground/30 rounded-r-xl border-l-[3px] p-3";

/** Filas de presentación con margen ya resuelto (sin `null` en el template). */
function presentationRows(recipe: ProductionRecipeResult) {
  const bestId = bestPresentationId(recipe);

  return recipe.presentations.map((presentation) => {
    const margin = presentationMargin(presentation.revenue, recipe.totalCost);
    return {
      ...presentation,
      isSelected: presentation.id === recipe.selectedPresentationId,
      isBest: presentation.id === bestId && margin !== null,
      marginLabel: margin === null ? "—" : marginText(margin),
      marginTone: margin === null ? "text-muted-foreground" : toneFor(margin),
    };
  });
}
</script>

<template>
  <div class="production-sheet recipe-breakdown space-y-4">
    <h2 class="text-foreground flex items-center gap-2 text-lg font-bold">
      <Icon name="lucide:package" :size="20" class="text-accent-600" />
      Desglose por receta
    </h2>

    <div class="space-y-4">
      <details
        v-for="recipe in recipes"
        :key="recipe.recipeId"
        :data-recipe-breakdown="recipe.recipeId"
        class="border-border bg-card overflow-hidden rounded-2xl border shadow-sm"
      >
        <summary
          class="hover:bg-muted flex cursor-pointer items-center justify-between gap-4 px-5 py-4 transition-colors sm:px-6"
        >
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-2">
              <h3 class="text-foreground truncate text-base font-bold">
                {{ recipe.recipeName }}
              </h3>
              <Badge v-if="recipe.category" color="neutral" size="md">
                {{ recipe.category }}
              </Badge>
            </div>
            <p class="text-muted-foreground mt-0.5 text-xs">
              {{ batchesCountLabel(recipe.batches) }} · Costo total:
              {{ formatCurrency(recipe.totalCost) }}
            </p>
          </div>
          <Icon
            name="lucide:chevron-down"
            :size="18"
            class="text-subtle-foreground shrink-0"
          />
        </summary>

        <div class="space-y-5 px-5 pb-5 sm:px-6 sm:pb-6">
          <div>
            <h4
              class="text-muted-foreground mb-3 text-[10px] font-black tracking-wider uppercase"
            >
              Costos
            </h4>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div data-cost-card="insumos" :class="COST_CARD_CLASSES">
                <p class="text-muted-foreground text-[11px] font-semibold">
                  Insumos
                </p>
                <p class="text-foreground mt-1 text-lg font-bold tabular-nums">
                  {{ formatCurrency(recipe.ingredientsCost) }}
                </p>
              </div>
              <div data-cost-card="operativos" :class="COST_CARD_CLASSES">
                <p class="text-muted-foreground text-[11px] font-semibold">
                  Gastos operativos
                </p>
                <p class="text-foreground mt-1 text-lg font-bold tabular-nums">
                  {{ formatCurrency(recipe.operationalCost) }}
                </p>
              </div>
              <div data-cost-card="total" :class="COST_CARD_CLASSES">
                <p class="text-muted-foreground text-[11px] font-semibold">
                  Total
                </p>
                <p class="text-foreground mt-1 text-lg font-bold tabular-nums">
                  {{ formatCurrency(recipe.totalCost) }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="recipe.presentations.length > 0">
            <h4
              class="text-muted-foreground mb-3 text-[10px] font-black tracking-wider uppercase"
            >
              Presentaciones
            </h4>
            <div
              class="border-border bg-background text-muted-foreground hidden gap-4 border-b px-5 py-3 text-[10px] font-black tracking-wider uppercase md:grid md:grid-cols-[minmax(0,1.8fr)_repeat(5,minmax(0,0.9fr))]"
            >
              <span>Presentación</span>
              <span>Unidades</span>
              <span>Costo unitario</span>
              <span>Precio Venta</span>
              <span>Ingreso</span>
              <span>Margen</span>
            </div>
            <div class="border-border overflow-hidden rounded-xl border">
              <div class="divide-border-light divide-y">
                <div
                  v-for="presentation in presentationRows(recipe)"
                  :key="presentation.id"
                  data-presentation-row
                  :class="[
                    PRES_ROW_GRID_CLASSES,
                    presentation.isSelected ? 'bg-accent-50/40' : '',
                  ]"
                >
                  <div class="min-w-0">
                    <span :class="CELL_LABEL_CLASSES">Presentación</span>
                    <p class="text-foreground font-medium break-words">
                      {{ presentation.name }}
                    </p>
                    <div class="mt-1 flex flex-wrap gap-1">
                      <Badge v-if="presentation.isSelected" color="accent">
                        Seleccionada
                      </Badge>
                      <Badge v-if="presentation.isBest" color="success">
                        Más rentable
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span :class="CELL_LABEL_CLASSES">Unidades</span>
                    <p class="text-secondary-foreground font-mono tabular-nums">
                      {{ presentation.totalUnits }}
                    </p>
                  </div>
                  <div>
                    <span :class="CELL_LABEL_CLASSES">Costo unitario</span>
                    <p class="text-secondary-foreground font-mono tabular-nums">
                      {{ formatCurrency(presentation.unitCost) }}
                    </p>
                  </div>
                  <div>
                    <span :class="CELL_LABEL_CLASSES">Precio Venta</span>
                    <p class="font-mono tabular-nums">
                      <span
                        v-if="presentation.salePrice"
                        class="text-secondary-foreground"
                      >
                        {{ formatCurrency(presentation.salePrice) }}
                      </span>
                      <span v-else class="text-warning">Sin precio</span>
                    </p>
                  </div>
                  <div>
                    <span :class="CELL_LABEL_CLASSES">Ingreso</span>
                    <p
                      class="text-foreground font-mono font-semibold tabular-nums"
                    >
                      <span v-if="presentation.revenue > 0">
                        {{ formatCurrency(presentation.revenue) }}
                      </span>
                      <span v-else class="text-warning">Sin precio</span>
                    </p>
                  </div>
                  <div>
                    <span :class="CELL_LABEL_CLASSES">Margen</span>
                    <p
                      data-presentation-margin
                      class="font-mono font-semibold tabular-nums"
                      :class="presentation.marginTone"
                    >
                      {{ presentation.marginLabel }}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="bg-muted rounded-xl p-4 text-center">
            <p class="text-muted-foreground text-sm">
              Sin presentaciones configuradas
            </p>
          </div>
        </div>
      </details>
    </div>
  </div>
</template>
