import type { Ref } from "vue";

/**
 * Destino de la navegación en curso (`null` si no hay ninguna). Lo escribe el
 * plugin `nav-pending` desde el router y lo consumen los enlaces del shell para
 * pintar su estado pendiente **desde el primer frame** del click: la barra de
 * progreso sólo aparece si la navegación tarda más que su propio throttle.
 */

const NAV_PENDING_KEY = "nav-pending";

export function useNavPending(): Ref<string | null> {
  return useState<string | null>(NAV_PENDING_KEY, () => null);
}
