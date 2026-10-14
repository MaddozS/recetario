import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { envelope } from './envelope';
import { errorHandler } from './error-handler';

const {
  mockGetSession,
  mockAuth,
  mockGetUserPreferences,
  mockCreateUserPreferences,
  mockGetCredentialAccount,
  mockGetSubscriptionInfo,
} = vi.hoisted(() => {
  const mockGetSession = vi.fn();
  const mockAuth = {
    api: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  };
  const mockGetUserPreferences = vi.fn();
  const mockCreateUserPreferences = vi.fn();
  const mockGetCredentialAccount = vi.fn();
  const mockGetSubscriptionInfo = vi.fn();
  return {
    mockGetSession,
    mockAuth,
    mockGetUserPreferences,
    mockCreateUserPreferences,
    mockGetCredentialAccount,
    mockGetSubscriptionInfo,
  };
});

vi.mock('@recetario/auth/server', () => ({
  auth: mockAuth,
}));

vi.mock('@recetario/db', () => ({
  getUserPreferences: (userId: string) => mockGetUserPreferences(userId),
  createUserPreferences: (userId: string, prefs: unknown) =>
    mockCreateUserPreferences(userId, prefs),
  getCredentialAccount: (userId: string) => mockGetCredentialAccount(userId),
}));

vi.mock('@recetario/stripe/server', () => ({
  getSubscriptionInfo: (userId: string) => mockGetSubscriptionInfo(userId),
}));

const { authSessionHandler } = await import('./auth-session');

const sessionFixture = {
  user: {
    id: 'user-1',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    image: null,
  },
  session: {
    id: 'sess-1',
    userId: 'user-1',
    token: 'tok-1',
    expiresAt: new Date('2030-01-01T00:00:00Z'),
  },
};

const infoFixture = {
  tier: 'pro',
  status: 'active',
  recipesLimit: null,
  ingredientsLimit: null,
  features: { recipe_duplicate: true, pdf_export: true },
  priceCents: 1999,
  currency: 'mxn',
  billingInterval: 'monthly',
  currentPeriodEnd: '2030-01-01T00:00:00.000Z',
  cancelAtPeriodEnd: false,
  isTrial: false,
  trialEnd: null,
  scheduledChange: null,
};

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use('*', envelope());
  app.get('/api/auth/session', authSessionHandler());
  return app;
}

describe('authSessionHandler', () => {
  beforeEach(() => {
    mockGetSession.mockReset();
    mockGetUserPreferences.mockReset();
    mockCreateUserPreferences.mockReset();
    mockGetCredentialAccount.mockReset();
    mockGetSubscriptionInfo.mockReset();
  });

  it('returns the session with preferences and subscription when the cookie is valid', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetUserPreferences.mockResolvedValueOnce({
      userId: 'user-1',
      theme: 'dark',
      accentColor: 'emerald',
    });
    mockGetSubscriptionInfo.mockResolvedValueOnce(infoFixture);

    const res = await buildApp().request('/api/auth/session', {
      headers: { cookie: 'better-auth.session_token=valid' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      user: { id: string };
      session: { token: string };
      preferences: { theme: string; accentColor: string };
      subscription: { tier: string };
    };
    expect(body.user.id).toBe('user-1');
    expect(body.session.token).toBe('tok-1');
    expect(body.preferences).toEqual({
      userId: 'user-1',
      theme: 'dark',
      accentColor: 'emerald',
    });
    expect(body.subscription).toEqual(infoFixture);
    expect(mockGetSession).toHaveBeenCalledTimes(1);
    expect(mockGetUserPreferences).toHaveBeenCalledWith('user-1');
    expect(mockGetSubscriptionInfo).toHaveBeenCalledWith('user-1');
  });

  it('falls back to the free default subscription when getSubscriptionInfo returns null', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetUserPreferences.mockResolvedValueOnce({
      userId: 'user-1',
      theme: 'dark',
      accentColor: 'emerald',
    });
    mockGetSubscriptionInfo.mockResolvedValueOnce(null);

    const res = await buildApp().request('/api/auth/session', {
      headers: { cookie: 'better-auth.session_token=valid' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      subscription: { tier: string; status: string | null };
    };
    expect(body.subscription.tier).toBe('free');
    expect(body.subscription.status).toBeNull();
  });

  it('creates default preferences if none exist for user', async () => {
    mockGetSession.mockResolvedValueOnce(sessionFixture);
    mockGetUserPreferences.mockResolvedValueOnce(null);
    mockCreateUserPreferences.mockResolvedValueOnce({
      userId: 'user-1',
      theme: 'system',
      accentColor: 'coral',
    });

    const res = await buildApp().request('/api/auth/session', {
      headers: { cookie: 'better-auth.session_token=valid' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      preferences: { theme: string; accentColor: string };
    };
    expect(body.preferences).toEqual({
      userId: 'user-1',
      theme: 'system',
      accentColor: 'coral',
    });
    expect(mockCreateUserPreferences).toHaveBeenCalledWith('user-1', {
      theme: 'system',
      accentColor: 'coral',
    });
  });

  it('returns null when no cookie is present', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request('/api/auth/session');
    expect(res.status).toBe(200);
    const body = (await res.json()) as null;
    expect(body).toBeNull();
    expect(mockGetSession).toHaveBeenCalledTimes(1);
  });

  it('returns null when the cookie is invalid or expired', async () => {
    mockGetSession.mockResolvedValueOnce(null);
    const res = await buildApp().request('/api/auth/session', {
      headers: { cookie: 'better-auth.session_token=garbage' },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as null;
    expect(body).toBeNull();
  });

  it('returns a 500 ApiErrorResponse when getSession throws', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('db down'));
    const res = await buildApp().request('/api/auth/session');
    expect(res.status).toBe(500);
    const body = (await res.json()) as {
      error: { code: string; message: string };
    };
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('Internal server error');
  });
});
