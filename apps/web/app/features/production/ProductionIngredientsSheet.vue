<script setup lang="ts">
import {
  formatCurrency,
  formatSourceQuantity,
  formatUnitCost,
  ingredientsCountLabel,
  smartQty,
} from './production-format';
import type { ConsolidatedIngredient } from './production-types';

/**
 * Hoja de insumos consolidados. Mantiene las clases del contrato de impresión
 * (`production-sheet`, `prod-row`) y la etiqueta por celda en móvil.
 */
defineProps<{ ingredients: ConsolidatedIngredient[] }>();

const ROW_GRID_CLASSES =
  'prod-row grid grid-cols-1 gap-1.5 px-5 py-4 sm:px-6 md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)] md:items-center md:gap-4';

const CELL_LABEL_CLASSES =
  'text-subtle-foreground block text-[10px] font-black tracking-wider uppercase md:hidden';

/** Marca · proveedor, omitiendo los que falten. */
function brandLine(ingredient: ConsolidatedIngredient): string {
  return [ingredient.brand, ingredient.supplier].filter(Boolean).join(' · ');
}
</script>

<template>
  <div
    class="production-sheet ingredients-table border-border bg-card overflow-hidden rounded-2xl border shadow-sm"
  >
    <div class="border-border border-b px-5 py-4 sm:px-6">
      <h2 class="text-foreground text-lg font-bold">Insumos totales</h2>
      <p data-summary-count class="text-muted-foreground mt-0.5 text-sm">
        {{ ingredientsCountLabel(ingredients.length) }}
      </p>
    </div>

    <div
      class="border-border bg-background text-muted-foreground hidden gap-4 border-b px-6 py-3 text-[10px] font-black tracking-wider uppercase md:grid md:grid-cols-[minmax(0,2.2fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_minmax(0,1.4fr)]"
    >
      <span>Insumo</span>
      <span>Cantidad</span>
      <span>Costo x Unidad</span>
      <span>Costo total</span>
      <span>Recetas</span>
    </div>

    <div class="divide-border-light divide-y">
      <div
        v-for="ingredient in ingredients"
        :key="ingredient.ingredientId"
        :class="ROW_GRID_CLASSES"
      >
        <div class="min-w-0">
          <span :class="CELL_LABEL_CLASSES">Insumo</span>
          <p class="text-foreground font-semibold break-words">
            {{ ingredient.name }}
          </p>
          <p v-if="brandLine(ingredient)" class="text-subtle-foreground mt-0.5 text-xs">
            {{ brandLine(ingredient) }}
          </p>
        </div>
        <div>
          <span :class="CELL_LABEL_CLASSES">Cantidad</span>
          <p class="text-secondary-foreground font-mono font-semibold tabular-nums">
            {{ smartQty(ingredient.totalQuantity, ingredient.unit) }}
          </p>
        </div>
        <div>
          <span :class="CELL_LABEL_CLASSES">Costo x Unidad</span>
          <p class="text-secondary-foreground font-mono text-sm tabular-nums">
            {{ formatUnitCost(ingredient.unitCost, ingredient.unit) }}
          </p>
        </div>
        <div>
          <span :class="CELL_LABEL_CLASSES">Costo total</span>
          <p class="text-foreground font-mono font-semibold tabular-nums">
            {{ formatCurrency(ingredient.totalCost) }}
          </p>
        </div>
        <div class="min-w-0">
          <span :class="CELL_LABEL_CLASSES">Recetas</span>
          <div class="flex flex-wrap gap-1.5">
            <span
              v-for="(source, index) in ingredient.sourceRecipes"
              :key="`${source.recipeId}-${index}`"
              class="bg-muted text-secondary-foreground inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium"
            >
              <span class="max-w-[16ch] truncate">{{ source.recipeName }}</span>
              <span class="text-subtle-foreground shrink-0">
                ({{ formatSourceQuantity(source.quantity) }} {{ ingredient.unit }})
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
