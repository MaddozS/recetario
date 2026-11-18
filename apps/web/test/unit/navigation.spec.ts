import { describe, expect, it } from 'vitest';
import {
  APP_NAV_ITEMS,
  breadcrumbsWithTail,
  isInternalHref,
  matchesPendingHref,
  pageKeyFromPath,
  visibleNavItems,
} from '../../shared/utils/navigation';

describe('pageKeyFromPath', () => {
  it('mapea cada sección privada y sus subrutas', () => {
    expect(pageKeyFromPath('/recipes')).toBe('recipes');
    expect(pageKeyFromPath('/recipes/123')).toBe('recipes');
    expect(pageKeyFromPath('/recipes/123?edit=true')).toBe('recipes');
    expect(pageKeyFromPath('/ingredients')).toBe('ingredients');
    expect(pageKeyFromPath('/produccion')).toBe('production');
    expect(pageKeyFromPath('/settings')).toBe('settings');
    expect(pageKeyFromPath('/settings/billing')).toBe('settings');
  });

  it('devuelve null fuera del shell privado', () => {
    expect(pageKeyFromPath('/')).toBeNull();
    expect(pageKeyFromPath('/sign-in')).toBeNull();
    expect(pageKeyFromPath('/pricing')).toBeNull();
    expect(pageKeyFromPath('/recipe')).toBeNull();
  });
});

describe('breadcrumbsWithTail', () => {
  const base = [{ label: 'Recetas', href: '/recipes' }, { label: 'Receta' }];

  it('reemplaza la última miga con la etiqueta dinámica de la ruta', () => {
    expect(
      breadcrumbsWithTail(base, { path: '/recipes/4', label: 'Pan de prueba' }, '/recipes/4')
    ).toEqual([{ label: 'Recetas', href: '/recipes' }, { label: 'Pan de prueba' }]);
  });

  it('ignora la etiqueta si es de otra ruta (navegación posterior)', () => {
    expect(
      breadcrumbsWithTail(base, { path: '/recipes/4', label: 'Pan de prueba' }, '/recipes')
    ).toEqual(base);
  });

  it('sin etiqueta o en blanco conserva el fallback estático', () => {
    expect(breadcrumbsWithTail(base, null, '/recipes/4')).toEqual(base);
    expect(breadcrumbsWithTail(base, { path: '/recipes/4', label: '   ' }, '/recipes/4')).toEqual(
      base
    );
  });

  it('sin migas base usa la etiqueta como única miga', () => {
    expect(
      breadcrumbsWithTail([], { path: '/recipes/4', label: 'Pan de prueba' }, '/recipes/4')
    ).toEqual([{ label: 'Pan de prueba' }]);
  });
});

describe('visibleNavItems', () => {
  it('declara las cuatro secciones con sus rutas e íconos', () => {
    expect(APP_NAV_ITEMS.map((item) => item.href)).toEqual([
      '/recipes',
      '/ingredients',
      '/produccion',
      '/settings',
    ]);
    for (const item of APP_NAV_ITEMS) {
      expect(item.icon).toMatch(/^lucide:/);
    }
  });

  it('oculta Producción sin la feature del plan', () => {
    expect(visibleNavItems(false).map((item) => item.page)).toEqual([
      'recipes',
      'ingredients',
      'settings',
    ]);
    expect(visibleNavItems(true).map((item) => item.page)).toEqual([
      'recipes',
      'ingredients',
      'production',
      'settings',
    ]);
  });
});

describe('isInternalHref', () => {
  it('acepta rutas internas', () => {
    expect(isInternalHref('/recipes')).toBe(true);
    expect(isInternalHref('/pricing?plan=pro')).toBe(true);
    expect(isInternalHref('/apidocs')).toBe(true);
    expect(isInternalHref('recipes')).toBe(true);
  });

  it('rechaza externos, protocolos no HTTP, anclas y el relay', () => {
    expect(isInternalHref('https://example.com/recetas')).toBe(false);
    expect(isInternalHref('http://example.com')).toBe(false);
    expect(isInternalHref('//cdn.example.com/x')).toBe(false);
    expect(isInternalHref('mailto:hola@kitchcalc.app')).toBe(false);
    expect(isInternalHref('tel:+34600000000')).toBe(false);
    expect(isInternalHref('#features')).toBe(false);
    expect(isInternalHref('   ')).toBe(false);
    expect(isInternalHref('/api')).toBe(false);
    expect(isInternalHref('/api/auth/session')).toBe(false);
  });
});

describe('matchesPendingHref', () => {
  it('ignora query y hash del destino', () => {
    expect(matchesPendingHref('/settings?tab=billing', '/settings')).toBe(true);
    expect(matchesPendingHref('/pricing?plan=pro#faq', '/pricing')).toBe(true);
  });

  it('marca la sección también en sus subrutas', () => {
    expect(matchesPendingHref('/recipes/4?edit=true', '/recipes')).toBe(true);
    expect(matchesPendingHref('/settings/billing', '/settings')).toBe(true);
  });

  it('no marca otras secciones ni rutas fuera del shell', () => {
    expect(matchesPendingHref('/ingredients', '/recipes')).toBe(false);
    expect(matchesPendingHref('/recipes/4', '/ingredients')).toBe(false);
    expect(matchesPendingHref('/pricing', '/sign-in')).toBe(false);
  });

  it('sin navegación pendiente no marca nada', () => {
    expect(matchesPendingHref(null, '/recipes')).toBe(false);
    expect(matchesPendingHref('', '/recipes')).toBe(false);
  });
});
