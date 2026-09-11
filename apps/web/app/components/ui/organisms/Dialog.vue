<script setup lang="ts">
import { ref } from "vue";

withDefaults(
  defineProps<{
    id: string;
    title?: string;
    description?: string;
    submitting?: boolean;
  }>(),
  { submitting: false },
);

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
    class="backdrop:bg-backdrop/50 fixed inset-0 m-auto w-[calc(100vw-2rem)] max-w-md rounded-3xl p-0"
    @click="handleClick"
    @cancel="handleCancel"
  >
    <div class="border-border bg-card rounded-3xl border p-6 shadow-2xl">
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
