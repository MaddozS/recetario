<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue';

/**
 * Lightbox del landing: `<dialog>` nativo controlado por estado Vue con dos
 * encuadres (ajuste y tamaño real). El encuadre y el gesto viven en
 * `useLightboxFraming`; aquí queda el ciclo de vida del diálogo. El cierre
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
/** Ventana de ajuste: la captura entera cabe en el viewport. */
const FIT_FRAME = 'max-h-[85dvh] max-w-[90vw]';

const dialog = ref<HTMLDialogElement | null>(null);
const stage = ref<HTMLDivElement | null>(null);

const {
  zoomed,
  dragging,
  setZoom,
  toggleZoom,
  reset: resetFraming,
  handleTap,
  handlePointerDown,
  handlePointerMove,
  handlePointerEnd,
} = useLightboxFraming(stage);

let closingTimer: number | null = null;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Reabrir durante la animación de salida cancela el cierre pendiente. */
function cancelClose(): void {
  if (closingTimer !== null) {
    window.clearTimeout(closingTimer);
    closingTimer = null;
  }
  dialog.value?.classList.remove('closing');
}

/** La página de detrás no se desplaza mientras el diálogo está abierto. */
function setScrollLock(locked: boolean): void {
  document.body.style.overflow = locked ? 'hidden' : '';
}

function closeAnimated(): void {
  const element = dialog.value;
  if (!element?.open || closingTimer !== null) return;

  if (prefersReducedMotion()) {
    element.close();
    setScrollLock(false);
    return;
  }

  element.classList.add('closing');
  closingTimer = window.setTimeout(() => {
    closingTimer = null;
    element.classList.remove('closing');
    element.close();
    setScrollLock(false);
  }, CLOSING_MS);
}

function handleCancel(event: Event): void {
  // El cierre lo gobierna el estado del padre (y lleva animación).
  event.preventDefault();
  emit('close');
}

function handleClick(event: MouseEvent): void {
  if (event.target === dialog.value) {
    emit('close');
  }
}

watch(
  () => props.open,
  (open) => {
    const element = dialog.value;
    if (!element) return;

    if (open) {
      cancelClose();
      resetFraming();
      void setZoom(false);
      if (!element.open) element.showModal();
      setScrollLock(true);
    } else if (element.open) {
      closeAnimated();
    }
  }
);

onBeforeUnmount(() => {
  cancelClose();
  setScrollLock(false);
  if (dialog.value?.open) dialog.value.close();
});
</script>

<template>
  <dialog
    ref="dialog"
    data-lightbox
    class="backdrop:bg-backdrop/50 border-none bg-transparent p-0 open:grid open:h-dvh open:max-h-none open:w-screen open:max-w-none open:place-items-center"
    @cancel="handleCancel"
    @click="handleClick"
  >
    <div
      ref="stage"
      data-lightbox-stage
      :data-zoomed="zoomed ? '1' : '0'"
      class="relative"
      :class="[
        zoomed ? `${FIT_FRAME} overflow-auto` : 'overflow-hidden',
        zoomed && dragging ? 'cursor-grabbing' : '',
        zoomed && !dragging ? 'cursor-grab' : '',
      ]"
      @pointerdown="handlePointerDown"
      @pointermove="handlePointerMove"
      @pointerup="handlePointerEnd"
      @pointercancel="handlePointerEnd"
      @click="handleTap"
      @dblclick="toggleZoom"
    >
      <img
        data-lightbox-img
        :src="src || undefined"
        :alt="alt"
        class="border-border/30 block h-auto w-auto rounded-2xl border object-contain shadow-2xl"
        :class="zoomed ? 'max-w-none' : FIT_FRAME"
      />
    </div>
    <button
      type="button"
      data-lightbox-close
      class="focus-ring text-muted-foreground hover:text-foreground bg-background/80 hover:bg-background absolute top-4 right-4 z-20 flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-full backdrop-blur-sm transition-colors"
      aria-label="Cerrar"
      @click="emit('close')"
    >
      <Icon name="lucide:x" :size="22" />
    </button>
    <button
      type="button"
      data-lightbox-zoom
      class="focus-ring text-foreground bg-background/80 hover:bg-background absolute bottom-4 left-1/2 z-20 flex min-h-11 -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full px-4 backdrop-blur-sm transition-colors"
      @click="toggleZoom"
    >
      <Icon :name="zoomed ? 'lucide:minimize-2' : 'lucide:maximize-2'" :size="18" />
      {{ zoomed ? 'Ajustar' : 'Ver a tamaño real' }}
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
