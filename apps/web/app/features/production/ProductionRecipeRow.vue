<script setup lang="ts">
import { computed } from "vue";
import { normalizeBatches } from "./production-selection";
import type {
  ProductionCatalogRecipe,
  ProductionSelection,
} from "./production-types";

/**
 * Fila del selector: checkbox, mezclas y presentación. Los controles sólo se
 * muestran con la receta seleccionada (paridad con el baseline) y el
 * `disabled`/opacidad lo decide el tope del plan.
 */
const props = defineProps<{
  recipe: ProductionCatalogRecipe;
  selection?: ProductionSelection;
  presentations: { id: number; name: string }[];
  disabled: boolean;
}>();

const emit = defineEmits<{
  toggle: [];
  "update:batches": [value: string];
  stepBatches: [direction: 1 | -1];
  "update:presentation": [presentationId: number];
}>();

const isSelected = computed(() => props.selection !== undefined);

function onBatchesChange(event: Event): void {
  const input = event.target as HTMLInputElement;
  emit("update:batches", input.value);
  // Si el valor normalizado coincide con el estado, Vue no re-renderiza el
  // input; se corrige aquí para que el DOM no muestre un valor descartado.
  input.value = String(normalizeBatches(input.value));
}

function presentationValue(): number | undefined {
  return props.selection?.presentationId ?? props.presentations[0]?.id;
}

const STEPPER_BUTTON_CLASSES =
  "border-border text-muted-foreground hover:text-secondary-foreground bg-background flex h-10 w-10 items-center justify-center rounded-full border font-bold transition-colors cursor-pointer";
</script>

<template>
  <div
    data-recipe-row
    :data-name="recipe.name"
    class="border-border flex flex-wrap items-center gap-x-3 gap-y-3 rounded-xl border p-3 transition-colors sm:flex-nowrap sm:p-3"
    :class="[
      isSelected ? 'bg-accent-50 ring-accent-200 ring-1' : 'hover:bg-muted',
      disabled ? 'opacity-40' : '',
    ]"
  >
    <label class="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        name="recipe_id"
        :checked="isSelected"
        :disabled="disabled"
        :value="recipe.id"
        class="border-border text-accent-600 focus:ring-accent-500 h-5 w-5 shrink-0 rounded disabled:opacity-30"
        @change="emit('toggle')"
      />
      <span class="min-w-0 flex-1">
        <span class="text-foreground block truncate text-sm font-semibold">
          {{ recipe.name }}
        </span>
        <span class="text-muted-foreground block text-xs">
          {{ recipe.ingredientCount }} ingrediente{{
            recipe.ingredientCount !== 1 ? "s" : ""
          }}
        </span>
      </span>
    </label>

    <span
      class="recipe-controls flex w-full shrink-0 flex-col gap-2 sm:w-auto sm:flex-row sm:items-center sm:justify-end"
      :class="isSelected ? '' : 'hidden'"
    >
      <select
        v-if="presentations.length > 1"
        data-presentation-select
        name="presentation_id"
        :value="presentationValue()"
        class="border-border bg-background text-foreground focus:ring-accent-500/20 focus:border-accent-500 min-h-11 rounded-xl border px-3 text-sm font-medium focus:ring-2 focus:outline-none md:w-44"
        @change="
          emit(
            'update:presentation',
            Number(($event.target as HTMLSelectElement).value),
          )
        "
      >
        <option
          v-for="presentation in presentations"
          :key="presentation.id"
          :value="presentation.id"
        >
          {{ presentation.name }}
        </option>
      </select>

      <div class="batch-stepper flex items-center gap-1">
        <button
          type="button"
          data-batch-step="-0.5"
          aria-label="Reducir mezclas"
          :class="STEPPER_BUTTON_CLASSES"
          @click="emit('stepBatches', -1)"
        >
          −
        </button>
        <span
          class="border-border bg-background text-muted-foreground inline-flex min-h-11 items-center gap-1.5 rounded-full border px-3"
        >
          <span class="text-xs font-semibold">Mezclas</span>
          <input
            type="number"
            data-batches
            name="batches"
            :value="selection?.batches ?? 1"
            min="0.5"
            step="0.5"
            :aria-label="`Mezclas de ${recipe.name}`"
            class="bg-background text-foreground w-14 border-none p-0 text-center font-mono text-sm font-semibold tabular-nums focus:ring-0 focus:outline-none"
            @change="onBatchesChange"
          />
        </span>
        <button
          type="button"
          data-batch-step="0.5"
          aria-label="Aumentar mezclas"
          :class="STEPPER_BUTTON_CLASSES"
          @click="emit('stepBatches', 1)"
        >
          +
        </button>
      </div>
    </span>
  </div>
</template>
