<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from "vue";

/**
 * Lightbox del landing: `<dialog>` nativo controlado por estado Vue. El cierre
 * (backdrop, botón, Escape) avisa al padre; la animación de salida se resuelve
 * aquí y se respeta `prefers-reduced-motion`.
 */
const props = defineProps<{
  open: boolean;
  src: string;
  alt: string;
}>();

const emit = defineEmits<{ close: [] }>();

const CLOSING_MS = 150;

const dialog = ref<HTMLDialogElement | null>(null);

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function closeAnimated(): void {
  const element = dialog.value;
  if (!element?.open) return;

  if (prefersReducedMotion()) {
    element.close();
    return;
  }

  element.classList.add("closing");
  window.setTimeout(() => {
    element.classList.remove("closing");
    element.close();
  }, CLOSING_MS);
}

function handleCancel(event: Event): void {
  // El cierre lo gobierna el estado del padre (y lleva animación).
  event.preventDefault();
  emit("close");
}

function handleClick(event: MouseEvent): void {
  if (event.target === dialog.value) {
    emit("close");
  }
}

watch(
  () => props.open,
  (open) => {
    const element = dialog.value;
    if (!element) return;

    if (open && !element.open) {
      element.showModal();
    } else if (!open && element.open) {
      closeAnimated();
    }
  },
);

onBeforeUnmount(() => {
  if (dialog.value?.open) dialog.value.close();
});
</script>

<template>
  <dialog
    ref="dialog"
    data-lightbox
    class="backdrop:bg-backdrop/50 border-none bg-transparent p-0 open:grid open:h-dvh open:w-screen open:place-items-center"
    @cancel="handleCancel"
    @click="handleClick"
  >
    <div class="relative">
      <img
        data-lightbox-img
        :src="src || undefined"
        :alt="alt"
        class="border-border/30 block h-auto max-h-[85dvh] w-auto max-w-[90vw] rounded-2xl border object-contain shadow-2xl"
      />
    </div>
    <button
      type="button"
      data-lightbox-close
      class="text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background fixed top-4 right-4 z-20 flex min-h-10 min-w-10 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition-colors"
      aria-label="Cerrar"
      @click="emit('close')"
    >
      <Icon name="lucide:x" :size="22" />
    </button>
  </dialog>
</template>

<style>
[data-lightbox]::backdrop {
  backdrop-filter: blur(4px);
  animation: backdropIn 200ms var(--ease-out);
}

[data-lightbox].closing::backdrop {
  animation: backdropOut 150ms var(--ease-in);
}

[data-lightbox][open] > div:first-child {
  animation: lightboxIn 200ms var(--ease-out);
}

[data-lightbox].closing > div:first-child {
  animation: lightboxOut 150ms var(--ease-in);
}

@keyframes lightboxIn {
  from {
    opacity: 0;
    transform: scale(0.92);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

@keyframes lightboxOut {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.92);
  }
}

@keyframes backdropIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes backdropOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
  }
}

@media (prefers-reduced-motion: reduce) {
  [data-lightbox]::backdrop,
  [data-lightbox].closing::backdrop,
  [data-lightbox][open] > div:first-child,
  [data-lightbox].closing > div:first-child {
    animation: none !important;
  }
}
</style>
