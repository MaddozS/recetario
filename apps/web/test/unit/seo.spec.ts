import { describe, expect, it } from 'vitest';
import {
  AUTH_PAGES,
  INDEX_ROBOTS,
  NOINDEX_ROBOTS,
  NOT_FOUND_SEO,
  PUBLIC_PAGES,
  SITE_URL_DEFAULT,
  authPageTitleFor,
  buildRobotsTxt,
  buildSitemapXml,
  canonicalUrl,
  isAuthPath,
  isCoralAccentPath,
  isPublicMarketingPath,
  pageSeoFor,
  robotsMetaContent,
} from '../../shared/utils/seo';

const SITE = 'https://app.kitchcalc.com';
const PRIVATE_PATHS = [
  '/recipes',
  '/ingredients',
  '/produccion',
  '/settings',
  '/sign-in',
  '/sign-up',
];

describe('PUBLIC_PAGES', () => {
  it('declara exactamente las cinco rutas indexables aprobadas', () => {
    expect(PUBLIC_PAGES.map((page) => page.path)).toEqual([
      '/',
      '/funciones',
      '/pricing',
      '/privacy',
      '/terms',
    ]);
    expect(SITE_URL_DEFAULT).toBe(SITE);
  });

  it('tiene title y description únicos y no vacíos', () => {
    for (const key of ['title', 'description'] as const) {
      const values = PUBLIC_PAGES.map((page) => page[key]);
      expect(values.every((value) => value.length > 0)).toBe(true);
      expect(new Set(values).size).toBe(values.length);
    }
  });

  it('resuelve cada página por path', () => {
    expect(pageSeoFor('/pricing').title).toBe('Planes y precios | KitchCalc');
    expect(NOT_FOUND_SEO.title).toBe('Página no encontrada | KitchCalc');
  });
});

describe('isPublicMarketingPath', () => {
  it('sólo reconoce las rutas públicas (el acento coral depende de esto)', () => {
    for (const page of PUBLIC_PAGES) {
      expect(isPublicMarketingPath(page.path)).toBe(true);
    }
    for (const path of PRIVATE_PATHS) {
      expect(isPublicMarketingPath(path)).toBe(false);
    }
  });
});

describe('AUTH_PAGES', () => {
  it('declara las cinco rutas de auth sin solaparse con las indexables', () => {
    expect(AUTH_PAGES.map((page) => page.path)).toEqual([
      '/sign-in',
      '/sign-up',
      '/forgot-password',
      '/reset-password',
      '/verify-email',
    ]);
    for (const page of AUTH_PAGES) {
      expect(isPublicMarketingPath(page.path)).toBe(false);
    }
  });

  it('tiene títulos únicos no vacíos y resolubles por path', () => {
    const titles = AUTH_PAGES.map((page) => page.title);
    expect(titles.every((title) => title.length > 0)).toBe(true);
    expect(new Set(titles).size).toBe(titles.length);

    expect(authPageTitleFor('/sign-in')).toBe('Iniciar sesión | KitchCalc');
    expect(authPageTitleFor('/reset-password')).toBe('Nueva contraseña | KitchCalc');
  });

  it('queda fuera del sitemap y del allow de robots', () => {
    const sitemap = buildSitemapXml(SITE);
    const robots = buildRobotsTxt({ siteUrl: SITE, indexable: true });

    for (const page of AUTH_PAGES) {
      expect(sitemap).not.toContain(page.path);
      expect(robots).not.toContain(`Allow: ${page.path}`);
    }
    expect(robots).toContain('Disallow: /');
  });
});

describe('isAuthPath / isCoralAccentPath', () => {
  it('el acento coral cubre públicas y auth, no las privadas', () => {
    for (const page of [...PUBLIC_PAGES, ...AUTH_PAGES]) {
      expect(isCoralAccentPath(page.path)).toBe(true);
    }
    expect(isAuthPath('/sign-in')).toBe(true);
    expect(isAuthPath('/recipes')).toBe(false);
    expect(isCoralAccentPath('/recipes')).toBe(false);
    expect(isCoralAccentPath('/settings?tab=billing')).toBe(false);
  });
});

describe('canonicalUrl', () => {
  it('compone URLs absolutas y conserva la barra final de la home', () => {
    expect(canonicalUrl(SITE, '/')).toBe(`${SITE}/`);
    expect(canonicalUrl(SITE, '/pricing')).toBe(`${SITE}/pricing`);
    expect(canonicalUrl(`${SITE}/`, '/terms')).toBe(`${SITE}/terms`);
  });
});

describe('robotsMetaContent', () => {
  it('distingue la rama indexable de la bloqueada', () => {
    expect(robotsMetaContent(true)).toBe(INDEX_ROBOTS);
    expect(robotsMetaContent(false)).toBe(NOINDEX_ROBOTS);
  });
});

describe('buildSitemapXml', () => {
  it('lista exactamente las cuatro rutas públicas', () => {
    const xml = buildSitemapXml(SITE);
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);

    expect(locs).toEqual(PUBLIC_PAGES.map((page) => canonicalUrl(SITE, page.path)));
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"');
  });

  it('no filtra rutas privadas ni de autenticación', () => {
    const xml = buildSitemapXml(SITE);
    for (const path of [...PRIVATE_PATHS, '/reset-password', '/verify-email']) {
      expect(xml).not.toContain(path);
    }
  });
});

describe('buildRobotsTxt', () => {
  it('con indexación permite sólo las cuatro rutas y publica el sitemap', () => {
    const robots = buildRobotsTxt({ siteUrl: SITE, indexable: true });

    expect(robots).toContain('User-agent: *');
    for (const allow of ['Allow: /$', 'Allow: /pricing$', 'Allow: /privacy$', 'Allow: /terms$']) {
      expect(robots).toContain(allow);
    }
    expect(robots).toContain('Disallow: /');
    expect(robots).toContain(`Sitemap: ${SITE}/sitemap.xml`);
  });

  it('sin indexación (staging) bloquea todo y no publica sitemap', () => {
    const robots = buildRobotsTxt({ siteUrl: SITE, indexable: false });

    expect(robots).toBe('User-agent: *\nDisallow: /\n');
    expect(robots).not.toContain('Sitemap');
    expect(robots).not.toContain('Allow:');
  });
});
