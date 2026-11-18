import type { BreadcrumbItem } from '#shared/types/navigation';

declare module '#app' {
  interface PageMeta {
    /** Miga de pan que pinta el shell privado (serializable en el payload). */
    breadcrumbs?: BreadcrumbItem[];
    /** `false` oculta la sidebar en el shell privado. */
    sidebar?: boolean;
  }
}
