import type { Ref } from "vue";
import type { BreadcrumbTail } from "#shared/utils/navigation";

/**
 * Etiqueta dinámica de la última miga: la resuelve el middleware de la ruta
 * (para que el SSR ya la pinte) y la página la mantiene al día cuando el dato
 * cambia (p. ej. al renombrar la receta). El layout privado la combina con las
 * migas de `definePageMeta` vía `breadcrumbsWithTail`.
 *
 * El estado vive en `useState` (una vez por request/SSR) con la ruta que lo
 * declaró, así una etiqueta rancia de la página anterior no se filtra: el
 * layout sólo la aplica si `path` coincide.
 */

const BREADCRUMB_TAIL_KEY = "breadcrumb-tail";

/** Estado crudo: lo consume el layout privado. */
export function useBreadcrumbTailState(): Ref<BreadcrumbTail | null> {
  return useState<BreadcrumbTail | null>(BREADCRUMB_TAIL_KEY, () => null);
}

/** Escribe la etiqueta sin lifecycle: lo usa el middleware de ruta. */
export function setBreadcrumbTail(path: string, label: string | null): void {
  const tail = useBreadcrumbTailState();
  const trimmed = label?.trim() ?? "";
  tail.value = trimmed.length > 0 ? { path, label: trimmed } : null;
}

/** La página mantiene la etiqueta reactiva al dato (p. ej. un rename). */
export function useBreadcrumbTail(
  source: Ref<string | null | undefined>,
): void {
  const route = useRoute();
  const tail = useBreadcrumbTailState();

  watch(
    source,
    (label) => {
      const trimmed = label?.trim() ?? "";
      tail.value =
        trimmed.length > 0 ? { path: route.path, label: trimmed } : null;
    },
    { immediate: true },
  );

  onBeforeUnmount(() => {
    if (tail.value?.path === route.path) {
      tail.value = null;
    }
  });
}
