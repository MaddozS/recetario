import { describe, expect, it } from 'vitest';
import { buildAuthenticatedAuthState } from '#shared/types/auth';
import { isDocumentRequest } from '../../server/utils/session-state';

const SESSION = {
  user: {
    id: 'user-1',
    email: 'qa@example.com',
    name: '',
    firstName: 'QA',
    lastName: 'Prueba',
    image: null,
  },
  session: { id: 'session-1', expiresAt: '2026-01-01T00:00:00.000Z' },
  subscription: {
    tier: 'pro' as const,
    status: 'active',
    recipesLimit: null,
    ingredientsLimit: null,
    features: { production_planner: true },
    priceCents: null,
    currency: null,
    billingInterval: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
  },
};

describe('isDocumentRequest', () => {
  it('acepta documentos HTML', () => {
    for (const pathname of [
      '/',
      '/recipes',
      '/recipes/123',
      '/ingredients',
      '/produccion',
      '/settings',
      '/sign-in',
      '/_payload.json',
    ]) {
      expect(isDocumentRequest('GET', pathname), pathname).toBe(true);
      expect(isDocumentRequest('HEAD', pathname), pathname).toBe(true);
    }
  });

  it('ignora mutaciones y llamadas al API', () => {
    expect(isDocumentRequest('POST', '/recipes')).toBe(false);
    expect(isDocumentRequest('GET', '/api/auth/session')).toBe(false);
    expect(isDocumentRequest('GET', '/api/recipes')).toBe(false);
  });

  it('ignora assets y rutas internas de Nuxt', () => {
    for (const pathname of [
      '/_nuxt/entry.js',
      '/_ipx/f_webp/logo.png',
      '/__nuxt_error',
      '/favicon.ico',
      '/robots.txt',
      '/sitemap.xml',
      '/kitchcalc_logo.svg',
      '/.well-known/security.txt',
    ]) {
      expect(isDocumentRequest('GET', pathname), pathname).toBe(false);
    }
  });
});

describe('buildAuthenticatedAuthState', () => {
  it('deriva el nombre visible cuando el usuario no tiene nombre', () => {
    const state = buildAuthenticatedAuthState(SESSION, {
      theme: 'system',
      accentColor: 'coral',
    });

    expect(state.status).toBe('authenticated');
    expect(state.session).toEqual({ id: 'session-1' });
    expect(state.user.name).toBe('qa');
    expect(state.user.email).toBe('qa@example.com');
    expect(state.user.hasPasswordAuth).toBe(false);
    expect(state.user.role).toBe('USER');
    expect(state.subscription.tier).toBe('pro');
    expect(state.preferences).toEqual({
      theme: 'system',
      accentColor: 'coral',
    });
  });

  it('propaga hasPasswordAuth y el rol cuando existen', () => {
    const state = buildAuthenticatedAuthState(
      {
        ...SESSION,
        user: { ...SESSION.user, name: 'QA Prueba', role: 'ADMIN' },
        hasPasswordAuth: true,
      },
      { theme: 'dark', accentColor: 'emerald' }
    );

    expect(state.user.name).toBe('QA Prueba');
    expect(state.user.role).toBe('ADMIN');
    expect(state.user.hasPasswordAuth).toBe(true);
  });
});
