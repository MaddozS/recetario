import { NOINDEX_ROBOTS } from '#shared/utils/seo';

/**
 * Metadata de las rutas fuera de índices (auth): título único y `robots`.
 *
 * Deliberadamente **sin canonical y sin OG**: el token y el email viajan en la
 * query de `/reset-password` y `/verify-email` y no pueden entrar en metadata.
 */
export function useNoindexSeo(title: string): void {
  useHead({
    title,
    meta: [{ name: 'robots', content: NOINDEX_ROBOTS }],
  });
}
