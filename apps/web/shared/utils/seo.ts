/**
 * SEO de las páginas públicas indexables. Fuente única para la app (metadata
 * por página y sitemap) y para Nitro (`/robots.txt`, `/sitemap.xml`): los
 * builders son puros para poder testearlos sin runtime.
 */

/** Origen de producción; se sobrescribe por entorno con `NUXT_PUBLIC_SITE_URL`. */
export const SITE_URL_DEFAULT = "https://app.kitchcalc.com";

export const INDEX_ROBOTS = "index, follow";
export const NOINDEX_ROBOTS = "noindex, nofollow";

export interface PublicPageSeo {
  readonly path: string;
  readonly title: string;
  readonly description: string;
}

/** Las cuatro rutas indexables aprobadas: metadata, sitemap y allow de robots. */
export const PUBLIC_PAGES = [
  {
    path: "/",
    title: "KitchCalc | Calcula el costo real de tus recetas",
    description:
      "Gestiona costos, márgenes y precios de tus recetas de forma simple y rápida.",
  },
  {
    path: "/pricing",
    title: "Planes y precios | KitchCalc",
    description:
      "Compara los planes Free, Basic y Pro de KitchCalc: recetas, ingredientes y planificador de producción. Suscripción segura con Stripe.",
  },
  {
    path: "/privacy",
    title: "Política de privacidad | KitchCalc",
    description:
      "Cómo KitchCalc recopila, usa y protege tus datos: autenticación, pagos con Stripe, cookies y seguridad.",
  },
  {
    path: "/terms",
    title: "Términos del servicio | KitchCalc",
    description:
      "Condiciones de uso de KitchCalc: cuentas, planes y pagos, límites de uso, propiedad de los datos y cancelación.",
  },
] as const satisfies readonly PublicPageSeo[];

export type PublicPagePath = (typeof PUBLIC_PAGES)[number]["path"];

export const NOT_FOUND_SEO = {
  title: "Página no encontrada | KitchCalc",
  description: "La página que buscas no existe o fue movida.",
} as const;

export const OG_IMAGE_PATH = "/kitchcalc_logo.webp";

export function pageSeoFor(path: PublicPagePath): PublicPageSeo {
  const page = PUBLIC_PAGES.find((entry) => entry.path === path);
  if (!page) {
    throw new Error(`Sin SEO definido para ${path}`);
  }
  return page;
}

/** Las rutas del landing público (acento coral y layout propio). */
export function isPublicMarketingPath(path: string): boolean {
  return PUBLIC_PAGES.some((page) => page.path === path);
}

/** Canonical absoluto, sin query ni hash. La home conserva la barra final. */
export function canonicalUrl(siteUrl: string, path: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function robotsMetaContent(indexable: boolean): string {
  return indexable ? INDEX_ROBOTS : NOINDEX_ROBOTS;
}

export function buildSitemapXml(siteUrl: string): string {
  const urls = PUBLIC_PAGES.map(
    (page) =>
      `  <url>\n    <loc>${canonicalUrl(siteUrl, page.path)}</loc>\n  </url>`,
  ).join("\n");

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    urls,
    "</urlset>",
    "",
  ].join("\n");
}

export interface RobotsTxtOptions {
  readonly siteUrl: string;
  readonly indexable: boolean;
}

/**
 * Sin indexación (staging, dev, e2e sin flag) se bloquea todo; con indexación
 * sólo se permiten las cuatro rutas públicas y el resto queda fuera.
 */
export function buildRobotsTxt({ siteUrl, indexable }: RobotsTxtOptions): string {
  if (!indexable) {
    return "User-agent: *\nDisallow: /\n";
  }

  const allows = PUBLIC_PAGES.map((page) =>
    page.path === "/" ? "Allow: /$" : `Allow: ${page.path}$`,
  ).join("\n");

  return [
    "User-agent: *",
    allows,
    "Disallow: /",
    "",
    `Sitemap: ${canonicalUrl(siteUrl, "/sitemap.xml")}`,
    "",
  ].join("\n");
}
