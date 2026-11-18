import { createServer } from 'node:http';
import { gzipSync } from 'node:zlib';
import { describe, expect, it, vi } from 'vitest';
import {
  buildUpstreamRequest,
  forwardApiRequest,
  relayFailureResponse,
  resolveBindingFromEnv,
  resolveInternalApiUrl,
} from '../../server/utils/api-transport';

const INTERNAL_API_URL = 'http://localhost:8787';
const PUBLIC_URL = 'https://app.example.com';
const OAUTH_PAYLOAD = JSON.stringify({
  url: 'https://accounts.google.com/o/oauth2/v2/auth',
});

function makeRequest(path = '/api/health', init: RequestInit = {}) {
  return new Request(`${PUBLIC_URL}${path}`, init);
}

/**
 * Upstream real que comprime igual que el API (workerd responde gzip si el
 * cliente lo pide). `fetchImpl` es el `fetch` global, así que el test cubre la
 * negociación de contenido de punta a punta.
 */
async function withGzipUpstream(
  run: (internalApiUrl: string, seen: { acceptEncoding?: string }) => Promise<void>
): Promise<void> {
  const seen: { acceptEncoding?: string } = {};
  const server = createServer((request, response) => {
    seen.acceptEncoding = request.headers['accept-encoding'];
    if (request.headers['accept-encoding']?.includes('gzip')) {
      response.writeHead(200, {
        'content-type': 'application/json',
        'content-encoding': 'gzip',
      });
      response.end(gzipSync(OAUTH_PAYLOAD));
      return;
    }
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(OAUTH_PAYLOAD);
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  try {
    await run(`http://127.0.0.1:${port}`, seen);
  } finally {
    await new Promise<void>((resolve) => {
      server.closeAllConnections();
      server.close(() => resolve());
    });
  }
}

describe('resolveBindingFromEnv', () => {
  it('devuelve el binding cuando expone fetch', () => {
    const binding = { fetch: vi.fn(async () => new Response('ok')) };
    expect(resolveBindingFromEnv({ API: binding })).toBe(binding);
  });

  it('ignora valores sin fetch utilizable', () => {
    expect(resolveBindingFromEnv({})).toBeUndefined();
    expect(resolveBindingFromEnv({ API: 'no-es-un-binding' })).toBeUndefined();
    expect(resolveBindingFromEnv({ API: { fetch: 42 } })).toBeUndefined();
  });
});

describe('resolveInternalApiUrl', () => {
  it('prioriza INTERNAL_API_URL del entorno', () => {
    expect(resolveInternalApiUrl({ INTERNAL_API_URL: 'http://api:9000' }, INTERNAL_API_URL)).toBe(
      'http://api:9000'
    );
  });

  it('cae al valor por defecto cuando falta o no es string', () => {
    expect(resolveInternalApiUrl({}, INTERNAL_API_URL)).toBe(INTERNAL_API_URL);
    expect(resolveInternalApiUrl({ INTERNAL_API_URL: '' }, INTERNAL_API_URL)).toBe(
      INTERNAL_API_URL
    );
    expect(resolveInternalApiUrl({ INTERNAL_API_URL: 7 }, INTERNAL_API_URL)).toBe(INTERNAL_API_URL);
  });
});

describe('buildUpstreamRequest', () => {
  it('preserva método, URL y headers dejando los redirects en manual', () => {
    const request = makeRequest('/api/recipes?category=pan', {
      method: 'POST',
      headers: { cookie: 'a=1', origin: PUBLIC_URL },
      body: JSON.stringify({ name: 'Brownie' }),
    });
    const upstream = buildUpstreamRequest(request);

    expect(upstream.method).toBe('POST');
    expect(upstream.url).toBe(`${PUBLIC_URL}/api/recipes?category=pan`);
    expect(upstream.headers.get('cookie')).toBe('a=1');
    expect(upstream.headers.get('origin')).toBe(PUBLIC_URL);
    expect(upstream.redirect).toBe('manual');
  });
});

describe('forwardApiRequest — rama binding', () => {
  it('usa el binding en producción y no toca el request entrante', async () => {
    const binding = {
      fetch: vi.fn(async () => new Response('relayed', { status: 201 })),
    };
    const fetchImpl = vi.fn();

    const response = await forwardApiRequest(
      makeRequest('/api/recipes?x=1', {
        headers: { cookie: 'session=abc', origin: PUBLIC_URL },
      }),
      { binding, internalApiUrl: INTERNAL_API_URL, useBinding: true, fetchImpl }
    );

    expect(response.status).toBe(201);
    expect(await response.text()).toBe('relayed');
    expect(fetchImpl).not.toHaveBeenCalled();

    const forwarded = binding.fetch.mock.calls[0]?.[0] as Request;
    expect(forwarded.url).toBe(`${PUBLIC_URL}/api/recipes?x=1`);
    expect(forwarded.headers.get('cookie')).toBe('session=abc');
    expect(forwarded.headers.get('origin')).toBe(PUBLIC_URL);
    expect(forwarded.redirect).toBe('manual');
  });

  it('ignora el binding fuera de producción', async () => {
    const binding = { fetch: vi.fn() };
    const fetchImpl = vi.fn(async () => new Response('fallback'));

    await forwardApiRequest(makeRequest(), {
      binding,
      internalApiUrl: INTERNAL_API_URL,
      useBinding: false,
      fetchImpl,
    });

    expect(binding.fetch).not.toHaveBeenCalled();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe('forwardApiRequest — fallback HTTP', () => {
  it('reescribe al origen interno conservando path y query', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));

    await forwardApiRequest(makeRequest('/api/recipes?category=pan'), {
      internalApiUrl: INTERNAL_API_URL,
      useBinding: false,
      fetchImpl,
    });

    const [target, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    expect(String(target)).toBe(`${INTERNAL_API_URL}/api/recipes?category=pan`);
    expect(init.method).toBe('GET');
    expect(init.redirect).toBe('manual');
  });

  it('no reenvía host ni content-length (los fija el destino)', async () => {
    const fetchImpl = vi.fn(async () => new Response('ok'));

    await forwardApiRequest(
      makeRequest('/api/preferences', {
        method: 'PUT',
        headers: { host: 'app.example.com', 'content-length': '17', cookie: 'csrf=1' },
        body: JSON.stringify({ theme: 'dark' }),
      }),
      { internalApiUrl: INTERNAL_API_URL, useBinding: false, fetchImpl }
    );

    const [, init] = fetchImpl.mock.calls[0] as [URL, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get('host')).toBeNull();
    expect(headers.get('content-length')).toBeNull();
    expect(headers.get('cookie')).toBe('csrf=1');
  });

  it('no declara content-encoding si el body ya llega descomprimido', async () => {
    await withGzipUpstream(async (internalApiUrl, seen) => {
      const response = await forwardApiRequest(
        makeRequest('/api/auth/sign-in/social', {
          method: 'POST',
          headers: {
            'accept-encoding': 'gzip, deflate, br',
            'content-type': 'application/json',
          },
          body: JSON.stringify({ provider: 'google' }),
        }),
        { internalApiUrl, useBinding: false }
      );

      const bytes = new Uint8Array(await response.arrayBuffer());
      // `fetch` descomprime el body pero conserva el header del upstream: si se
      // reenvía el `accept-encoding` del navegador, el cliente intenta
      // descomprimir texto plano y falla con ERR_CONTENT_DECODING_FAILED.
      expect(seen.acceptEncoding).toBe('identity');
      expect(response.headers.get('content-encoding')).toBeNull();
      expect(new TextDecoder().decode(bytes)).toBe(OAUTH_PAYLOAD);
    });
  });

  it('reenvía el body y exige duplex en mutaciones', async () => {
    const fetchImpl = vi.fn(async () => new Response(null, { status: 204 }));

    await forwardApiRequest(makeRequest('/api/echo', { method: 'POST', body: 'cuerpo-raw' }), {
      internalApiUrl: INTERNAL_API_URL,
      useBinding: false,
      fetchImpl,
    });

    const [, init] = fetchImpl.mock.calls[0] as [URL, RequestInit & { duplex?: string }];
    expect(init.method).toBe('POST');
    expect(init.body).toBeDefined();
    expect(init.duplex).toBe('half');
  });

  it('sin transporte configurado responde 500 con el envelope compartido', async () => {
    const response = await forwardApiRequest(makeRequest(), { useBinding: false });
    expect(response.status).toBe(500);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe('INTERNAL');
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
  });
});

describe('relayFailureResponse', () => {
  it('responde el envelope INTERNAL con headers de seguridad', async () => {
    const response = relayFailureResponse(502, 'API service request failed');

    expect(response.status).toBe(502);
    expect(response.headers.get('content-type')).toBe('application/json');
    expect(response.headers.get('x-frame-options')).toBe('DENY');
    expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
    expect(response.headers.get('content-security-policy')).toContain("default-src 'self'");

    const body = (await response.json()) as {
      error: { code: string; message: string; traceId: string };
    };
    expect(body.error.code).toBe('INTERNAL');
    expect(body.error.message).toBe('API service request failed');
    expect(body.error.traceId).toMatch(/^web-/);
  });
});
