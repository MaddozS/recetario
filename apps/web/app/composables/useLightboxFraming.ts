import { nextTick, ref, type Ref } from 'vue';

/**
 * Encuadre del lightbox: alterna entre ajuste y tamaño real y desplaza la
 * captura ampliada (arrastre con ratón, scroll nativo en táctil y doble
 * activación). El diálogo y su animación los gobierna el componente; aquí vive
 * sólo el estado del encuadre y el gesto.
 */
/** Ventana entre dos toques para alternar el encuadre en táctil. */
const DOUBLE_TAP_MS = 300;
/** Desplazamiento mínimo antes de considerar que el gesto es un arrastre. */
const DRAG_THRESHOLD = 4;

interface DragState {
  x: number;
  y: number;
  left: number;
  top: number;
  moved: boolean;
}

export function useLightboxFraming(stage: Ref<HTMLElement | null>) {
  const zoomed = ref(false);
  const dragging = ref(false);

  let drag: DragState | null = null;
  let lastTap = 0;

  /**
   * A tamaño real el desplazamiento aterriza en el centro de la captura —no en
   * su esquina vacía— y el contenedor sólo es desplazable cuando el encuadre ya
   * cambió, así que el scroll se fija tras el render.
   */
  async function setZoom(next: boolean): Promise<void> {
    zoomed.value = next;
    await nextTick();

    const element = stage.value;
    if (!element) return;

    element.scrollLeft = next ? (element.scrollWidth - element.clientWidth) / 2 : 0;
    element.scrollTop = next ? (element.scrollHeight - element.clientHeight) / 2 : 0;
  }

  function toggleZoom(): void {
    void setZoom(!zoomed.value);
  }

  /** El toque a medias de una sesión anterior no cuenta para la siguiente. */
  function reset(): void {
    lastTap = 0;
    drag = null;
    dragging.value = false;
  }

  /**
   * El doble toque en táctil no lo cuenta el sistema, así que ahí se mide la
   * ventana entre dos toques. El ratón lo resuelve el evento `dblclick` (que
   * respeta la velocidad configurada en el sistema operativo). Los dos
   * listeners viven en el escenario —no en la imagen— porque con la captura de
   * puntero activa los eventos de ratón se re-dirigen al elemento que captura.
   */
  function handleTap(event: MouseEvent): void {
    if (!('pointerType' in event) || event.pointerType !== 'touch') return;

    const now = Date.now();
    if (now - lastTap > DOUBLE_TAP_MS) {
      lastTap = now;
      return;
    }

    lastTap = 0;
    toggleZoom();
  }

  function handlePointerDown(event: PointerEvent): void {
    const element = stage.value;
    // El arrastre es para ratón: en táctil el pan lo hace el scroll nativo.
    if (!zoomed.value || !element || event.pointerType !== 'mouse' || event.button !== 0) {
      return;
    }

    drag = {
      x: event.clientX,
      y: event.clientY,
      left: element.scrollLeft,
      top: element.scrollTop,
      moved: false,
    };
    element.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: PointerEvent): void {
    const element = stage.value;
    if (!drag || !element) return;

    const deltaX = event.clientX - drag.x;
    const deltaY = event.clientY - drag.y;
    if (!drag.moved && Math.abs(deltaX) < DRAG_THRESHOLD && Math.abs(deltaY) < DRAG_THRESHOLD) {
      return;
    }

    drag.moved = true;
    dragging.value = true;
    element.scrollLeft = drag.left - deltaX;
    element.scrollTop = drag.top - deltaY;
  }

  function handlePointerEnd(event: PointerEvent): void {
    const element = stage.value;
    if (element?.hasPointerCapture(event.pointerId)) {
      element.releasePointerCapture(event.pointerId);
    }
    drag = null;
    dragging.value = false;
  }

  return {
    zoomed,
    dragging,
    setZoom,
    toggleZoom,
    reset,
    handleTap,
    handlePointerDown,
    handlePointerMove,
    handlePointerEnd,
  };
}
