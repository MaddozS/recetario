/** Migas de pan declaradas por cada página vía `definePageMeta`. */
export type BreadcrumbItem = { label: string; href?: string };

/** Secciones privadas del shell; gobiernan el estado activo de la navegación. */
export type AppPage = 'recipes' | 'ingredients' | 'production' | 'settings';

export type AppNavItem = {
  page: AppPage;
  label: string;
  href: string;
  icon: string;
  /** Sólo visible con la feature `production_planner`. */
  productionOnly?: boolean;
};
