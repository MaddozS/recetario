<script setup lang="ts">
import { computed } from "vue";
import { formatCantidad, showAdjustedQuantity } from "./recipe-detail-format";
import { calcularSubtotalIngrediente } from "./recipe-financials";
import type { RecipeDetailRecord } from "./recipe-detail-form";

/**
 * Lista de ingredientes en modo vista: cards en móvil y tabla en escritorio
 * (misma información en ambos: cantidad base, cantidad ajustada por el
 * multiplicador, costo y notas).
 */
const props = defineProps<{
  ingredients: ReadonlyArray<RecipeDetailRecord["ingredients"][number]>;
  multiplier: number;
  showComments: boolean;
}>();

const adjusted = computed(() => showAdjustedQuantity(props.multiplier));

function subtotal(
  ingredient: RecipeDetailRecord["ingredients"][number],
): string {
  return `$${calcularSubtotalIngrediente(ingredient, ingredient.ingredient, props.multiplier).toFixed(2)}`;
}
</script>

<template>
  <div>
    <!-- Móvil: cards -->
    <div class="divide-border-light divide-y md:hidden">
      <article
        v-for="(item, index) in ingredients"
        :key="`${item.ingredientId}-${index}`"
        class="space-y-3 px-5 py-4"
      >
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="text-foreground leading-tight font-semibold break-words">
              {{ item.ingredient.name }}
              <span
                v-if="item.ingredient.brand"
                class="text-subtle-foreground ml-1.5 text-xs font-normal"
              >
                ({{ item.ingredient.brand }})
              </span>
            </p>
            <p class="text-muted-foreground mt-1 text-xs">
              Cantidad usada en esta mezcla
            </p>
            <p
              v-if="item.comment"
              class="ingredient-comment text-subtle-foreground mt-1 text-xs break-words"
              :class="showComments ? '' : 'hidden'"
            >
              {{ item.comment }}
            </p>
          </div>
          <div class="text-right whitespace-nowrap">
            <p
              class="text-subtle-foreground text-[10px] font-bold tracking-wider uppercase"
            >
              Costo
            </p>
            <p class="text-secondary-foreground font-mono font-semibold">
              {{ subtotal(item) }}
            </p>
          </div>
        </div>

        <div
          class="grid gap-2"
          :class="adjusted ? 'grid-cols-2' : 'grid-cols-1'"
        >
          <div class="border-border bg-background rounded-xl border px-3 py-2">
            <p
              class="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
            >
              Base
            </p>
            <p class="text-secondary-foreground mt-1 flex items-baseline gap-2">
              <span class="font-mono text-lg font-semibold">{{
                formatCantidad(item.quantity, item.unit)
              }}</span>
              <span
                class="text-muted-foreground text-xs font-semibold uppercase"
              >{{ item.unit }}</span>
            </p>
          </div>
          <div
            v-if="adjusted"
            class="border-accent-200 bg-accent-50 rounded-xl border px-3 py-2"
          >
            <p
              class="text-accent-600 text-[10px] font-bold tracking-wider uppercase"
            >
              Con x{{ multiplier }}
            </p>
            <p class="text-accent-700 mt-1 flex items-baseline gap-2">
              <span class="font-mono text-lg font-semibold">{{
                formatCantidad(item.quantity * multiplier, item.unit)
              }}</span>
              <span class="text-accent-500 text-xs font-semibold uppercase">{{
                item.unit
              }}</span>
            </p>
          </div>
        </div>
      </article>
    </div>

    <!-- Escritorio: tabla -->
    <div class="hidden overflow-x-auto md:block">
      <table class="w-full table-auto overflow-x-auto text-left">
        <thead
          class="bg-background text-subtle-foreground text-[10px] font-bold uppercase"
        >
          <tr>
            <th class="w-max px-6 py-3 text-left lg:px-8">Ingrediente</th>
            <th class="px-6 py-3 text-left lg:px-8">Cantidad</th>
            <th class="px-6 py-3 text-right lg:px-8">Subtotal</th>
          </tr>
        </thead>
        <tbody class="divide-border-light divide-y">
          <tr
            v-for="(item, index) in ingredients"
            :key="`${item.ingredientId}-${index}`"
            class="group hover:bg-hover-muted dark:hover:bg-hover-muted transition-colors"
          >
            <td class="border-border-light w-max border-r px-6 py-4 lg:px-8">
              <div
                class="text-secondary-foreground inline-block font-semibold whitespace-nowrap"
              >
                {{ item.ingredient.name }}
                <span
                  v-if="item.ingredient.brand"
                  class="text-subtle-foreground ml-1.5 text-xs font-normal"
                >
                  ({{ item.ingredient.brand }})
                </span>
              </div>
              <div
                v-if="item.comment"
                class="ingredient-comment text-subtle-foreground mt-1 max-w-[28ch] text-xs break-words"
                :class="showComments ? '' : 'hidden'"
              >
                {{ item.comment }}
              </div>
            </td>
            <td class="border-border-light w-auto border-r px-6 py-4 lg:px-8">
              <div
                class="flex gap-2"
                :class="adjusted ? 'min-w-[240px]' : 'min-w-[120px]'"
              >
                <div
                  class="border-border bg-background flex-1 rounded-xl border px-3 py-2"
                >
                  <p
                    class="text-muted-foreground text-[10px] font-bold tracking-wider uppercase"
                  >
                    Base
                  </p>
                  <p
                    class="text-secondary-foreground mt-1 flex items-baseline gap-2"
                  >
                    <span class="font-mono text-lg font-semibold">{{
                      formatCantidad(item.quantity, item.unit)
                    }}</span>
                    <span
                      class="text-muted-foreground text-xs font-semibold uppercase"
                    >{{ item.unit }}</span>
                  </p>
                </div>
                <div
                  v-if="adjusted"
                  class="border-accent-200 bg-accent-50 flex-1 rounded-xl border px-3 py-2"
                >
                  <p
                    class="text-accent-600 text-[10px] font-bold tracking-wider uppercase"
                  >
                    Con x{{ multiplier }}
                  </p>
                  <p class="text-accent-700 mt-1 flex items-baseline gap-2">
                    <span class="font-mono text-lg font-semibold">{{
                      formatCantidad(item.quantity * multiplier, item.unit)
                    }}</span>
                    <span
                      class="text-accent-500 text-xs font-semibold uppercase"
                    >{{ item.unit }}</span>
                  </p>
                </div>
              </div>
            </td>
            <td
              class="text-muted-foreground px-6 py-4 text-right font-mono font-semibold lg:px-8"
            >
              {{ subtotal(item) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
