import type {
  AppNavItem,
  AppPage,
  BreadcrumbItem,
} from "#shared/types/navigation";

/**
 * Fuente única de la navegación privada: la consumen la sidebar, el bottom nav
 * móvil y los tests.
 */
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    page: "recipes",
    label: "Recetas",
    href: "/recipes",
    icon: "lucide:book-open",
  },
  {
    page: "ingredients",
    label: "Ingredientes",
    href: "/ingredients",
    icon: "lucide:package-search",
  },
  {
    page: "production",
    label: "Producción",
    href: "/produccion",
    icon: "lucide:factory",
    productionOnly: true,
  },
  {
    page: "settings",
    label: "Configuración",
    href: "/settings",
    icon: "lucide:settings",
  },
];

export function pageKeyFromPath(path: string): AppPage | null {
  if (path === "/recipes" || path.startsWith("/recipes/")) return "recipes";
  if (path === "/ingredients") return "ingredients";
  if (path === "/produccion") return "production";
  if (path === "/settings" || path.startsWith("/settings/")) return "settings";
  return null;
}

/**
 * Rutas privadas: sin caché compartida y fuera de índices. La lista es la
 * misma que la de secciones del shell (`pageKeyFromPath`) y la consumen el
 * middleware de Nitro (cabeceras) y el layout privado (meta `robots`).
 */
export function isPrivatePath(pathname: string): boolean {
  return pageKeyFromPath(pathname) !== null;
}

export function visibleNavItems(showProduction: boolean): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => !item.productionOnly || showProduction);
}

/** Migas resueltas por una página que conoce su etiqueta después del setup. */
export type BreadcrumbTail = { path: string; label: string };

/**
 * Combina las migas declaradas por `definePageMeta` con la etiqueta dinámica
 * que una página resuelve en tiempo de ejecución (p. ej. el nombre de la
 * receta). El tail sólo aplica a la ruta que lo declaró y reemplaza el último
 * ítem; sin él se conserva el fallback estático.
 */
export function breadcrumbsWithTail(
  base: readonly BreadcrumbItem[],
  tail: BreadcrumbTail | null,
  path: string,
): BreadcrumbItem[] {
  const items = [...base];
  if (!tail || tail.path !== path || tail.label.trim().length === 0) {
    return items;
  }
  const label: BreadcrumbItem = { label: tail.label };
  return items.length > 0 ? [...items.slice(0, -1), label] : [label];
}
