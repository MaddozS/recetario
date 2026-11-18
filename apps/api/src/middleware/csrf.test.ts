import { describe, it, expect } from 'vitest';
import { Hono } from 'hono';
import { envelope } from '../envelope';
import { errorHandler } from '../error-handler';
import { csrfProtection } from './csrf';

const TOKEN = 'a'.repeat(64);
const TRUSTED_ORIGIN = 'http://localhost:4321';
const UNTRUSTED_ORIGIN = 'https://evil.example';

function buildApp() {
  const app = new Hono();
  app.onError(errorHandler());
  app.use('*', envelope());
  app.use('*', csrfProtection());
  app.get('/api/recipes', (c) => c.json({ ok: true }));
  app.post('/api/recipes', (c) => c.json({ ok: true }, 201));
  app.post('/api/account/change-password', (c) => c.json({ ok: true }));
  app.post('/api/auth/sign-in/email', (c) => c.json({ ok: true }));
  app.post('/api/auth/forgot-password', (c) => c.json({ ok: true }));
  app.post('/api/stripe/webhook', (c) => c.json({ ok: true }));
  return app;
}

function post(path: string, headers: Record<string, string>, body?: string) {
  return buildApp().request(path, { method: 'POST', headers, body });
}

describe('csrfProtection', () => {
  it('lets non-mutating requests through regardless of origin', async () => {
    const res = await buildApp().request('/api/recipes', {
      headers: { origin: UNTRUSTED_ORIGIN, cookie: 'session=1' },
    });
    expect(res.status).toBe(200);
  });

  it('accepts a trusted origin with a matching token header', async () => {
    const res = await post('/api/recipes', {
      origin: TRUSTED_ORIGIN,
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': TOKEN,
    });
    expect(res.status).toBe(201);
  });

  it('rejects a trusted origin without the token', async () => {
    const res = await post('/api/recipes', {
      origin: TRUSTED_ORIGIN,
      cookie: `session=1; csrf_token=${TOKEN}`,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: { code: 'FORBIDDEN', message: 'CSRF validation failed' },
    });
  });

  it('rejects a mismatched token', async () => {
    const res = await post('/api/recipes', {
      origin: TRUSTED_ORIGIN,
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': 'b'.repeat(64),
    });
    expect(res.status).toBe(403);
  });

  it('rejects a token of a different length', async () => {
    const res = await post('/api/recipes', {
      origin: TRUSTED_ORIGIN,
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': 'short',
    });
    expect(res.status).toBe(403);
  });

  it('accepts a matching _csrf form field', async () => {
    const res = await post(
      '/api/account/change-password',
      {
        origin: TRUSTED_ORIGIN,
        cookie: `session=1; csrf_token=${TOKEN}`,
        'content-type': 'application/x-www-form-urlencoded',
      },
      `_csrf=${TOKEN}`
    );
    expect(res.status).toBe(200);
  });

  it('skips the token check when the request carries no cookies', async () => {
    const res = await post('/api/recipes', { origin: TRUSTED_ORIGIN });
    expect(res.status).toBe(201);
  });

  it('rejects an untrusted origin even with a valid token', async () => {
    const res = await post('/api/recipes', {
      origin: UNTRUSTED_ORIGIN,
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': TOKEN,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: { code: 'FORBIDDEN', message: 'Untrusted origin' },
    });
  });

  it('rejects a literal null origin', async () => {
    const res = await post('/api/recipes', {
      origin: 'null',
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': TOKEN,
    });
    expect(res.status).toBe(403);
  });

  it('rejects cross-site requests', async () => {
    const res = await post('/api/recipes', {
      origin: TRUSTED_ORIGIN,
      'sec-fetch-site': 'cross-site',
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': TOKEN,
    });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({
      error: { code: 'FORBIDDEN', message: 'Cross-site request rejected' },
    });
  });

  it('falls back to the Referer origin when Origin is missing', async () => {
    const res = await post('/api/recipes', {
      referer: `${TRUSTED_ORIGIN}/settings?tab=billing`,
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': TOKEN,
    });
    expect(res.status).toBe(201);

    const untrusted = await post('/api/recipes', {
      referer: `${UNTRUSTED_ORIGIN}/settings`,
      cookie: `session=1; csrf_token=${TOKEN}`,
      'x-csrf-token': TOKEN,
    });
    expect(untrusted.status).toBe(403);
  });

  it('lets internal requests without Origin/Referer through', async () => {
    const res = await post('/api/recipes', {
      cookie: `session=1; csrf_token=${TOKEN}`,
    });
    expect(res.status).toBe(201);
  });

  it('exempts Better Auth routes from the token check', async () => {
    const res = await post('/api/auth/sign-in/email', {
      origin: TRUSTED_ORIGIN,
      cookie: `csrf_token=${TOKEN}`,
    });
    expect(res.status).toBe(200);
  });

  it('still enforces the origin rule on Better Auth routes', async () => {
    const res = await post('/api/auth/forgot-password', {
      origin: UNTRUSTED_ORIGIN,
    });
    expect(res.status).toBe(403);
  });

  it('exempts the Stripe webhook', async () => {
    const res = await post('/api/stripe/webhook', {
      origin: UNTRUSTED_ORIGIN,
      'stripe-signature': 'sig',
    });
    expect(res.status).toBe(200);
  });
});
