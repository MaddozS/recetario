<script setup lang="ts">
import { computed, ref } from "vue";

const props = withDefaults(
  defineProps<{
    id: string;
    title?: string;
    description?: string;
    submitting?: boolean;
    /** Ancho del panel. `md` es el comportamiento original del kit. */
    size?: "md" | "lg" | "xl";
    /** Panel con scroll interno (`max-h` + `overflow-y-auto`) para formularios altos. */
    scroll?: boolean;
  }>(),
  { submitting: false, size: "md", scroll: false },
);

const SIZE_CLASSES: Record<"md" | "lg" | "xl", string> = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
};

const sizeClass = computed(() => SIZE_CLASSES[props.size]);

const bodyClasses = computed(() => [
  "border-border bg-card rounded-3xl border p-6 shadow-2xl",
  props.scroll ? "max-h-[min(82vh,44rem)] overflow-y-auto" : "",
]);

const dialog = ref<HTMLDialogElement | null>(null);

// Paridad con `bindDialogBackdrop`, ahora como lógica del componente: ni el
// backdrop ni Escape cierran mientras el diálogo esté ocupado.
function isBusy(el: HTMLDialogElement): boolean {
  return (
    el.dataset.submitting === "1" || el.getAttribute("aria-busy") === "true"
  );
}

function handleClick(event: MouseEvent) {
  const el = dialog.value;
  if (!el || isBusy(el)) return;
  if (event.target === el) el.close();
}

function handleCancel(event: Event) {
  const el = dialog.value;
  if (el && isBusy(el)) event.preventDefault();
}

defineExpose({
  open: () => dialog.value?.showModal(),
  close: () => dialog.value?.close(),
});
</script>

<template>
  <dialog
    :id="id"
    ref="dialog"
    data-animated
    :data-submitting="submitting ? '1' : undefined"
    :aria-busy="submitting ? 'true' : undefined"
    class="backdrop:bg-backdrop/50 fixed inset-0 m-auto w-[calc(100vw-2rem)] rounded-3xl p-0"
    :class="sizeClass"
    @click="handleClick"
    @cancel="handleCancel"
  >
    <div :class="bodyClasses">
      <div v-if="title" class="mb-4">
        <h2 class="text-foreground text-lg font-bold">
          {{ title }}
        </h2>
        <p v-if="description" class="text-muted-foreground mt-1 text-sm">
          {{ description }}
        </p>
      </div>
      <slot />
    </div>
  </dialog>
</template>
