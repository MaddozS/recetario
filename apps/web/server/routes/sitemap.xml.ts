import { buildSitemapXml } from '#shared/utils/seo';

/** Sitemap de las cuatro rutas públicas indexables. */
export default defineEventHandler((event) => {
  const { siteUrl } = useRuntimeConfig(event).public;

  setHeader(event, 'content-type', 'application/xml; charset=utf-8');
  setHeader(event, 'cache-control', 'public, max-age=3600');

  return buildSitemapXml(siteUrl);
});
