import { buildRobotsTxt } from '#shared/utils/seo';

/**
 * `robots.txt` explícito: con indexación sólo se permiten las cuatro rutas
 * públicas; sin ella (staging, dev) se bloquea el sitio completo.
 */
export default defineEventHandler((event) => {
  const { siteUrl, indexable } = useRuntimeConfig(event).public;

  setHeader(event, 'content-type', 'text/plain; charset=utf-8');
  setHeader(event, 'cache-control', 'public, max-age=3600');

  return buildRobotsTxt({ siteUrl, indexable });
});
