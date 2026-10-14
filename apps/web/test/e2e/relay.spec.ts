import { expect, test } from '@nuxt/test-utils/playwright';
import { url } from '@nuxt/test-utils/e2e';

/**
 * Contrato del relay `/api/**` contra el stub del API (`:8788`): lo que el
 * navegador ve del otro lado debe ser exactamente lo que emitió Hono.
 */

const STUB_HOST = '127.0.0.1:8788';

test('relaya GET preservando status, cuerpo y el Host del destino', async ({ request }) => {
  const response = await request.get(url('/api/health'));

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
  expect(body.method).toBe('GET');
  expect(body.path).toBe('/api/health');
  // El fallback HTTP fija el Host del destino (lo que exige el hostAllowlist
  // de Hono en dev: INTERNAL_API_HOST=localhost:8787).
  expect(body.host).toBe(STUB_HOST);
});

test('reenvía cookies, Origin, Referer, Sec-Fetch-Site y el token CSRF', async ({ request }) => {
  const response = await request.get(url('/api/health'), {
    headers: {
      cookie: 'better-auth.session_token=abc; csrf_token=tok-123',
      origin: 'http://localhost:4321',
      referer: 'http://localhost:4321/recipes',
      'sec-fetch-site': 'same-origin',
      'x-csrf-token': 'tok-123',
    },
  });

  const body = await response.json();
  expect(body.cookie).toContain('better-auth.session_token=abc');
  expect(body.cookie).toContain('csrf_token=tok-123');
  expect(body.origin).toBe('http://localhost:4321');
  expect(body.referer).toBe('http://localhost:4321/recipes');
  expect(body.secFetchSite).toBe('same-origin');
  expect(body.csrf).toBe('tok-123');
});

test('reenvía el body raw de una mutación sin alterarlo', async ({ request }) => {
  const payload = JSON.stringify({
    name: 'Brownie',
    nested: { deep: [1, 2, 3] },
    unicode: 'café con leche ✓',
  });

  const response = await request.post(url('/api/echo'), {
    headers: { 'content-type': 'application/json', origin: 'http://localhost:4321' },
    data: payload,
  });

  expect(response.status()).toBe(200);
  expect((await response.json()).received).toBe(payload);
});

test('preserva múltiples Set-Cookie del API', async ({ request }) => {
  const response = await request.get(url('/api/multi-cookie'));

  expect(response.status()).toBe(200);
  const setCookies = response
    .headersArray()
    .filter((header) => header.name.toLowerCase() === 'set-cookie')
    .map((header) => header.value.split(';')[0])
    .sort();

  expect(setCookies).toEqual(['alpha=1', 'beta=2']);
});

test('aísla requests concurrentes con cookies distintas', async ({ request }) => {
  const call = (who: string) =>
    request
      .get(url('/api/health'), { headers: { cookie: `who=${who}` } })
      .then((response) => response.json());

  const [alice, bob] = await Promise.all([call('alice'), call('bob')]);

  expect(alice.cookie).toBe('who=alice');
  expect(bob.cookie).toBe('who=bob');
});

test('propaga los redirects del API sin seguirlos', async ({ request }) => {
  const response = await request.get(url('/api/redirect'), {
    maxRedirects: 0,
  });

  expect(response.status()).toBe(302);
  expect(response.headers().location).toBe('/api/health');
});

test('conserva el envelope de error del API', async ({ request }) => {
  const response = await request.get(url('/api/teapot'));

  expect(response.status()).toBe(418);
  expect(await response.json()).toEqual({
    error: {
      code: 'DOMAIN_ERROR',
      message: 'teapot',
      reason: 'ingredient_in_use',
    },
  });
});

test('responde 502 con headers de seguridad cuando el upstream cae', async ({ request }) => {
  const response = await request.get(url('/api/boom'));

  expect(response.status()).toBe(502);
  expect(response.headers()['x-frame-options']).toBe('DENY');
  expect(response.headers()['x-content-type-options']).toBe('nosniff');
  const body = await response.json();
  expect(body.error.code).toBe('INTERNAL');
  expect(body.error.message).toBe('API service request failed');
  expect(body.error.traceId).toMatch(/^web-/);
});

test('la sesión anónima se relaya como 200 null', async ({ request }) => {
  const response = await request.get(url('/api/auth/session'));

  expect(response.status()).toBe(200);
  expect(await response.json()).toBeNull();
});
