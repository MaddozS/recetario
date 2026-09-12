import type { AppNavItem, AppPage } from "#shared/types/navigation";

/**
 * Fuente única de la navegación privada: la consumen la sidebar, el bottom nav
 * móvil y los tests.
 */
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  { page: "recipes", label: "Recetas", href: "/recipes", icon: "lucide:book-open" },
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
  return APP_NAV_ITEMS.filter(
    (item) => !item.productionOnly || showProduction,
  );
}
