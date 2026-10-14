<script setup lang="ts">
import { nextTick, ref } from 'vue';
import type { ComponentPublicInstance } from 'vue';

/**
 * Tabs del detalle. Controladas por el padre (el hash de la URL): este
 * componente sólo pinta y emite, así que el deep link y el back/forward los
 * resuelve el router. Las flechas mueven la selección y el foco, como en el baseline.
 */
const props = defineProps<{
  tabs: ReadonlyArray<{ id: string; label: string }>;
  active: string;
}>();

const emit = defineEmits<{ select: [id: string] }>();

const tabButtons = ref<HTMLButtonElement[]>([]);

function setTabRef(element: Element | ComponentPublicInstance | null, index: number): void {
  if (element instanceof HTMLButtonElement) {
    tabButtons.value[index] = element;
  }
}

function onKeydown(event: KeyboardEvent, index: number): void {
  const count = props.tabs.length;
  let nextIndex = -1;

  if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
    nextIndex = (index + 1) % count;
  } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
    nextIndex = (index - 1 + count) % count;
  }

  if (nextIndex < 0) return;

  event.preventDefault();
  const next = props.tabs[nextIndex];
  if (!next) return;

  emit('select', next.id);
  void nextTick(() => tabButtons.value[nextIndex]?.focus());
}
</script>

<template>
  <div class="border-border mb-6 flex border-b" role="tablist" aria-label="Secciones de la receta">
    <button
      v-for="(tab, index) in tabs"
      :id="`tab-${tab.id}`"
      :key="tab.id"
      :ref="(element: Element | ComponentPublicInstance | null) => setTabRef(element, index)"
      type="button"
      role="tab"
      class="-mb-px cursor-pointer border-b-2 px-4 py-2.5 text-sm font-bold transition-colors"
      :class="
        tab.id === active
          ? 'border-accent-500 text-accent-700'
          : 'text-muted-foreground hover:border-border border-transparent'
      "
      :aria-selected="tab.id === active ? 'true' : 'false'"
      :aria-controls="`panel-${tab.id}`"
      @click="emit('select', tab.id)"
      @keydown="onKeydown($event, index)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>
