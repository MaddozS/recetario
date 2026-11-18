import type { AppNavItem, AppPage, BreadcrumbItem } from '#shared/types/navigation';

/**
 * Fuente única de la navegación privada: la consumen la sidebar, el bottom nav
 * móvil y los tests.
 */
export const APP_NAV_ITEMS: readonly AppNavItem[] = [
  {
    page: 'recipes',
    label: 'Recetas',
    href: '/recipes',
    icon: 'lucide:book-open',
  },
  {
    page: 'ingredients',
    label: 'Ingredientes',
    href: '/ingredients',
    icon: 'lucide:package-search',
  },
  {
    page: 'production',
    label: 'Producción',
    href: '/produccion',
    icon: 'lucide:factory',
    productionOnly: true,
  },
  {
    page: 'settings',
    label: 'Configuración',
    href: '/settings',
    icon: 'lucide:settings',
  },
];

export function pageKeyFromPath(path: string): AppPage | null {
  if (path === '/recipes' || path.startsWith('/recipes/')) return 'recipes';
  if (path === '/ingredients') return 'ingredients';
  if (path === '/produccion') return 'production';
  if (path === '/settings' || path.startsWith('/settings/')) return 'settings';
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

/** Pathname de un href, sin query ni hash (para comparar destinos). */
function pathnameOf(href: string): string {
  const [withoutHash = ''] = href.split('#');
  const [pathname = ''] = withoutHash.split('?');
  return pathname;
}

/**
 * Enlaces que debe resolver el router de Vue (`NuxtLink`). Quedan fuera los
 * externos y los protocolos no HTTP (`mailto:`, `tel:`…), los anclas de la
 * misma página (`#seccion`) y el relay same-origin `/api/**`.
 */
export function isInternalHref(href: string): boolean {
  const value = href.trim();
  if (value.length === 0 || value.startsWith('#') || value.startsWith('//')) {
    return false;
  }
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return false;
  return value !== '/api' && !value.startsWith('/api/');
}

/**
 * ¿El enlace apunta al destino que se está navegando? Ignora query y hash, y
 * para las secciones del shell compara por sección —igual que el estado activo
 * (`pageKeyFromPath`)— para que `/recipes/4` marque «Recetas» como pendiente.
 */
export function matchesPendingHref(pending: string | null, href: string): boolean {
  if (!pending) return false;
  const pendingPath = pathnameOf(pending);
  if (pendingPath.length === 0) return false;

  const hrefPath = pathnameOf(href);
  const pendingKey = pageKeyFromPath(pendingPath);
  const hrefKey = pageKeyFromPath(hrefPath);
  if (pendingKey !== null && hrefKey !== null) return pendingKey === hrefKey;
  return pendingPath === hrefPath;
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
  path: string
): BreadcrumbItem[] {
  const items = [...base];
  if (!tail || tail.path !== path || tail.label.trim().length === 0) {
    return items;
  }
  const label: BreadcrumbItem = { label: tail.label };
  return items.length > 0 ? [...items.slice(0, -1), label] : [label];
}
