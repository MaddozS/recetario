<script setup lang="ts">
import { computed } from "vue";
import {
  multiplierStepFor,
  normalizeMultiplier,
  parseMultiplierParam,
  showAdjustedQuantity,
} from "./recipe-detail-format";

/**
 * Contador «Mezclas» del detalle. Es un control *controlado*: no guarda el
 * valor, lo emite, de modo que la fila móvil y la de escritorio comparten el
 * mismo estado (`?multiplier=`) sin recargar la página (Astro recargaba).
 */
const props = defineProps<{ multiplier: number }>();
const emit = defineEmits<{ change: [value: number] }>();

const step = computed(() => multiplierStepFor(props.multiplier));
const adjusted = computed(() => showAdjustedQuantity(props.multiplier));

const BUTTON_CLASSES =
  "text-muted-foreground hover:bg-hover-muted flex h-6 w-6 cursor-pointer items-center justify-center rounded-full font-bold transition-colors active:scale-95";

function stepBy(direction: 1 | -1): void {
  emit(
    "change",
    normalizeMultiplier(
      Math.max(props.multiplier + direction * step.value, 0.01),
    ),
  );
}

function onInput(event: Event): void {
  emit(
    "change",
    parseMultiplierParam((event.target as HTMLInputElement).value),
  );
}
</script>

<template>
  <div
    class="flex w-full items-center justify-between gap-2 rounded-xl border px-2 py-1.5 shadow-sm transition-colors sm:w-auto sm:justify-start"
    :class="
      adjusted ? 'border-accent-200 bg-accent-50/30' : 'border-border bg-card'
    "
  >
    <span
      class="text-subtle-foreground px-2 text-[10px] font-black tracking-widest uppercase"
    >
      Mezclas
    </span>
    <div
      class="border-border-light bg-background flex items-center gap-1 rounded-full border p-1"
    >
      <button
        type="button"
        aria-label="Disminuir mezclas"
        :class="BUTTON_CLASSES"
        @click="stepBy(-1)"
      >
        -
      </button>
      <input
        type="number"
        step="0.0001"
        min="0.0001"
        aria-label="Multiplicador"
        class="text-foreground focus-visible:ring-accent-500 w-10 border-none bg-transparent p-0 text-center font-mono text-sm font-semibold tabular-nums focus:outline-none focus-visible:ring-2"
        :value="multiplier"
        @change="onInput"
      />
      <button
        type="button"
        aria-label="Aumentar mezclas"
        :class="BUTTON_CLASSES"
        @click="stepBy(1)"
      >
        +
      </button>
    </div>
  </div>
</template>
