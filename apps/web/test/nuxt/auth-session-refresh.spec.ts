import { mockNuxtImport, mountSuspended } from '@nuxt/test-utils/runtime';
import { flushPromises } from '@vue/test-utils';
import { defineComponent, h } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SessionResponse } from '@recetario/types';
import type { AuthState } from '#shared/types/auth';
import { buildAnonymousAuthState, buildAuthenticatedAuthState } from '#shared/types/auth';

/**
 * Revalidación de cliente (`useAuth().refresh()`): reemplaza el snapshot del
 * documento con lo que responde el API, preserva las preferencias locales
 * (cookie-first) y sólo expira cuando la respuesta confirma que no hay sesión.
 *
 * El transporte se mockea con `useRequestFetch`, que es lo que consume el
 * composable; `useState("auth")` persiste entre montajes del app de test, así
 * que cada caso fija su estado inicial.
 */

const SESSION: NonNullable<SessionResponse> = {
  user: {
    id: 'user-1',
    email: 'qa@example.com',
    name: 'QA Prueba',
    firstName: 'QA',
    lastName: 'Prueba',
    image: null,
    role: 'USER',
  },
  session: { id: 'session-1' },
  subscription: {
    tier: 'pro',
    status: 'active',
    recipesLimit: null,
    ingredientsLimit: null,
    features: { production_planner: true },
    priceCents: 1999,
    currency: 'MXN',
    billingInterval: 'monthly',
    currentPeriodEnd: '2026-10-15T12:00:00.000Z',
    cancelAtPeriodEnd: false,
    isTrial: false,
    trialEnd: null,
  },
  preferences: { userId: 'user-1', theme: 'dark', accentColor: 'emerald' },
  hasPasswordAuth: true,
};

type AuthHarness = {
  state: { value: AuthState };
  revision: { value: number };
  refresh: () => Promise<boolean>;
};

const state = vi.hoisted(() => ({
  request: vi.fn(),
  auth: null as unknown as AuthHarness,
}));

mockNuxtImport('useRequestFetch', () => () => state.request);

const Harness = defineComponent({
  setup() {
    state.auth = useAuth();
    return () => h('div');
  },
});

async function mountAuth(): Promise<AuthHarness> {
  await mountSuspended(Harness);
  await flushPromises();
  return state.auth;
}

function authenticatedState(): AuthState {
  return buildAuthenticatedAuthState(SESSION, {
    theme: 'dark',
    accentColor: 'emerald',
  });
}

beforeEach(() => {
  state.request.mockReset();
  state.request.mockResolvedValue(SESSION);
  for (const cookie of ['kitchcalc-theme', 'kitchcalc-accent']) {
    document.cookie = `${cookie}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
});

describe('useAuth().refresh()', () => {
  it('reemplaza el snapshot y avisa con revision', async () => {
    const auth = await mountAuth();
    auth.state.value = buildAnonymousAuthState({
      theme: 'system',
      accentColor: 'coral',
    });
    const revisionBefore = auth.revision.value;

    expect(await auth.refresh()).toBe(true);

    expect(state.request).toHaveBeenCalledWith(
      '/api/auth/session',
      expect.objectContaining({ method: 'GET' })
    );
    expect(auth.state.value.status).toBe('authenticated');
    expect(auth.state.value.user?.name).toBe('QA Prueba');
    expect(auth.state.value.subscription?.tier).toBe('pro');
    expect(auth.revision.value).toBe(revisionBefore + 1);
  });

  it('preserva las preferencias locales al revalidar', async () => {
    const auth = await mountAuth();
    auth.state.value = {
      ...authenticatedState(),
      preferences: { theme: 'light', accentColor: 'rose' },
    };

    await auth.refresh();

    expect(auth.state.value.preferences).toEqual({
      theme: 'light',
      accentColor: 'rose',
    });
  });

  it('siembra las preferencias cookie-first al pasar de anónimo a autenticado', async () => {
    const auth = await mountAuth();
    auth.state.value = buildAnonymousAuthState({
      theme: 'system',
      accentColor: 'coral',
    });
    document.cookie = 'kitchcalc-theme=light; path=/';
    document.cookie = 'kitchcalc-accent=blue; path=/';

    await auth.refresh();

    expect(auth.state.value.preferences).toEqual({
      theme: 'light',
      accentColor: 'blue',
    });
  });

  it('expira cuando el API confirma que no hay sesión', async () => {
    const auth = await mountAuth();
    auth.state.value = authenticatedState();
    state.request.mockResolvedValue(null);

    expect(await auth.refresh()).toBe(false);

    expect(auth.state.value.status).toBe('anonymous');
  });

  it('un fallo de red conserva el snapshot y lo registra', async () => {
    const auth = await mountAuth();
    auth.state.value = authenticatedState();
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.request.mockRejectedValue(new Error('offline'));

    expect(await auth.refresh()).toBe(false);

    expect(auth.state.value.status).toBe('authenticated');
    expect(logged).toHaveBeenCalled();
    logged.mockRestore();
  });

  it('un payload inesperado no pisa el estado', async () => {
    const auth = await mountAuth();
    auth.state.value = authenticatedState();
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    state.request.mockResolvedValue({ user: { id: 1 } });

    expect(await auth.refresh()).toBe(false);

    expect(auth.state.value.status).toBe('authenticated');
    logged.mockRestore();
  });
});
