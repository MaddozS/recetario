import {
  OG_IMAGE_PATH,
  canonicalUrl,
  pageSeoFor,
  robotsMetaContent,
  type PublicPagePath,
} from '#shared/utils/seo';

/**
 * Metadata de una página pública indexable: title/description únicos, canonical
 * absoluto, OG/Twitter y `robots` según el gate de indexación.
 *
 * `NUXT_PUBLIC_INDEXABLE` es fail-closed: sin la variable, todas las públicas
 * quedan `noindex,nofollow` y `robots.txt` bloquea el sitio completo (staging).
 */
export function usePageSeo(path: PublicPagePath): void {
  const { siteUrl, indexable } = useRuntimeConfig().public;
  const page = pageSeoFor(path);
  const canonical = canonicalUrl(siteUrl, path);

  useSeoMeta({
    title: page.title,
    description: page.description,
    ogTitle: page.title,
    ogDescription: page.description,
    ogUrl: canonical,
    ogType: 'website',
    ogSiteName: 'KitchCalc',
    ogImage: canonicalUrl(siteUrl, OG_IMAGE_PATH),
    twitterCard: 'summary_large_image',
    twitterTitle: page.title,
    twitterDescription: page.description,
  });

  useHead({
    link: [{ rel: 'canonical', href: canonical }],
    meta: [{ name: 'robots', content: robotsMetaContent(indexable) }],
  });
}
