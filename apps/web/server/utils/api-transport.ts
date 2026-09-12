import type { H3Event } from "h3";
import { setSecurityHeaders } from "@recetario/config/request";

/**
 * Transporte hacia el worker `apps/api`.
 *
 * En producción (workerd) se usa el service binding `API` y el request entrante
 * se reenvía verbatim: método, URL/host, query, body/stream, `Cookie`, `Origin`,
 * `Referer`, `Sec-Fetch-Site`, `x-csrf-token` y `Content-Type` llegan al API tal
 * como los mandó el navegador (lo exige `csrfProtection()` de Hono).
 *
 * En desarrollo el binding no está conectado al worker del API (instancias
 * separadas de miniflare), así que se cae a HTTP contra `INTERNAL_API_URL`.
 */

export type ApiServiceBinding = {
  fetch: (
    input: string | URL | Request,
    init?: RequestInit,
  ) => Promise<Response>;
};

export type ForwardOptions = {
  binding?: ApiServiceBinding;
  internalApiUrl?: string;
  useBinding: boolean;
  fetchImpl?: typeof fetch;
};

export type ApiCallInit = {
  method?: string;
  headers?: HeadersInit;
  body?: BodyInit | null;
};

/** Headers que fija el transporte de destino, no el request entrante. */
const TRANSPORT_OWNED_HEADERS = ["host", "content-length"];

export function resolveBindingFromEnv(
  env: Record<string, unknown>,
): ApiServiceBinding | undefined {
  const api = env.API as ApiServiceBinding | undefined;
  return typeof api?.fetch === "function" ? api : undefined;
}

export function resolveInternalApiUrl(
  env: Record<string, unknown>,
  fallback: string,
): string {
  const value = env.INTERNAL_API_URL;
  return typeof value === "string" && value.length > 0 ? value : fallback;
}

export function relayFailureResponse(status: number, message: string): Response {
  const response = new Response(
    JSON.stringify({
      error: {
        code: "INTERNAL",
        message,
        traceId: `web-${crypto.randomUUID()}`,
      },
    }),
    { status, headers: { "content-type": "application/json" } },
  );
  setSecurityHeaders(response);
  return response;
}

/**
 * Preserva 3xx (callbacks OAuth de Better Auth, reset-password) en lugar de
 * seguirlos, y deja el resto del request intacto.
 */
export function buildUpstreamRequest(request: Request): Request {
  return new Request(request, { redirect: "manual" });
}

export async function forwardApiRequest(
  request: Request,
  options: ForwardOptions,
): Promise<Response> {
  const { binding, internalApiUrl, useBinding, fetchImpl = fetch } = options;

  if (useBinding && binding) {
    return binding.fetch(buildUpstreamRequest(request));
  }

  if (!internalApiUrl) {
    return relayFailureResponse(500, "API transport not configured");
  }

  const incoming = new URL(request.url);
  const headers = new Headers(request.headers);
  for (const header of TRANSPORT_OWNED_HEADERS) {
    headers.delete(header);
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  return fetchImpl(new URL(`${incoming.pathname}${incoming.search}`, internalApiUrl), init);
}

export function getCloudflareEnv(event: H3Event): Record<string, unknown> {
  const env = (event.context.cloudflare as { env?: unknown } | undefined)?.env;
  return env && typeof env === "object" ? (env as Record<string, unknown>) : {};
}

export function getTransportOptions(event: H3Event): ForwardOptions {
  const env = getCloudflareEnv(event);
  // Orden: binding de plataforma (`.dev.vars` vía el proxy de wrangler) →
  // `process.env` (dev/CI) → `runtimeConfig` horneado en el build.
  const internalApiUrl = resolveInternalApiUrl(
    env,
    typeof process.env.INTERNAL_API_URL === "string" &&
      process.env.INTERNAL_API_URL.length > 0
      ? process.env.INTERNAL_API_URL
      : useRuntimeConfig(event).internalApiUrl,
  );
  return {
    binding: resolveBindingFromEnv(env),
    internalApiUrl,
    // `import.meta.dev` sólo es true en `nuxt dev`; en un build servido por
    // `wrangler dev` o por Cloudflare se usa el binding real.
    useBinding: !import.meta.dev,
  };
}

/** Relay transparente de `/api/**`: devuelve la respuesta del API sin tocarla. */
export async function relayApiRequest(event: H3Event): Promise<Response> {
  try {
    return await forwardApiRequest(toWebRequest(event), getTransportOptions(event));
  } catch (error) {
    console.error("[/api relay] upstream request failed:", error);
    return relayFailureResponse(502, "API service request failed");
  }
}

/**
 * Llamada server-side al API (bootstrap de sesión y carga SSR de datos).
 * Reenvía las cookies del request entrante; en producción conserva el host
 * público, igual que hacía `apiFetch` en Astro.
 */
export async function callApi(
  event: H3Event,
  path: string,
  init: ApiCallInit = {},
): Promise<Response> {
  const incoming = toWebRequest(event);
  const method = (init.method ?? "GET").toUpperCase();
  const headers = new Headers(init.headers);
  const cookie = incoming.headers.get("cookie");
  if (cookie && !headers.has("cookie")) {
    headers.set("cookie", cookie);
  }
  if (!headers.has("accept")) {
    headers.set("accept", "application/json");
  }

  const request = new Request(new URL(path, incoming.url), {
    method,
    headers,
    body: method === "GET" || method === "HEAD" ? undefined : init.body,
    redirect: "manual",
  });

  return forwardApiRequest(request, getTransportOptions(event));
}
