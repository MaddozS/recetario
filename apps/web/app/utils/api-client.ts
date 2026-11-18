import type { ZodType } from 'zod';
import { ApiErrorResponseSchema } from '@recetario/types';
import { ApiError } from './api-error';

export type ApiFetchMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type ApiFetchInit = {
  method: ApiFetchMethod;
  headers: Record<string, string>;
  body?: string;
  signal?: AbortSignal;
};

export type ApiFetchOptions<T> = {
  method?: ApiFetchMethod;
  body?: unknown;
  schema?: ZodType<T>;
  headers?: Record<string, string>;
  signal?: AbortSignal;
};

/**
 * Transporte universal. En SSR lo aporta `useRequestFetch()` (hereda cookies y
 * resuelve por `localFetch`) y en cliente el `$fetch` global; ambos lanzan
 * `FetchError` para respuestas no-2xx.
 */
export type ApiFetchImpl = (path: string, init: ApiFetchInit) => Promise<unknown>;

export const MUTATING_METHODS: readonly ApiFetchMethod[] = ['POST', 'PUT', 'PATCH', 'DELETE'];

/**
 * Doble-submit CSRF: las mutaciones envían el token leído de la cookie
 * `csrf_token` (la re-emite el middleware de Nitro en cada documento).
 */
export function csrfHeaderFor(method: string, token: string | null): Record<string, string> {
  const isMutating = MUTATING_METHODS.includes(method as ApiFetchMethod);
  return isMutating && token ? { 'x-csrf-token': token } : {};
}

function newTraceId(): string {
  return `web-${crypto.randomUUID()}`;
}

/**
 * Normaliza un error HTTP al envelope compartido. Devuelve `null` cuando no es
 * una respuesta HTTP (fallo de red): esos errores se propagan tal cual para no
 * perder su causa.
 */
function toApiError(error: unknown): ApiError | null {
  const candidate = error as { status?: unknown; data?: unknown; response?: unknown };
  const status =
    typeof candidate?.status === 'number'
      ? candidate.status
      : (candidate?.response as Response | undefined)?.status;

  if (typeof status !== 'number') {
    return error instanceof ApiError ? error : null;
  }

  const parsed = ApiErrorResponseSchema.safeParse(candidate?.data);
  if (!parsed.success) {
    return new ApiError('INTERNAL', 'Internal error', { traceId: newTraceId() }, status);
  }

  const { code, message, issues, reason, traceId } = parsed.data.error;
  return new ApiError(code, message, { issues, reason, traceId: traceId ?? newTraceId() }, status);
}

/**
 * Cliente tipado contra `/api/**` (el relay same-origin). Valida la respuesta
 * con Zod y normaliza cualquier error al envelope compartido de Hono.
 */
export async function apiFetch<T>(
  fetchImpl: ApiFetchImpl,
  path: string,
  options: ApiFetchOptions<T> = {}
): Promise<T> {
  const { method = 'GET', body, schema, headers = {}, signal } = options;
  // Better Auth responde 415 a cualquier mutación que llegue sin `content-type`
  // en cuanto el request trae body: el navegador manda `Content-Length: 0` y el
  // relay materializa un stream vacío, así que las mutaciones siempre son JSON.
  const payload = body === undefined && MUTATING_METHODS.includes(method) ? {} : body;
  const requestHeaders: Record<string, string> = {
    accept: 'application/json',
    ...headers,
  };
  if (payload !== undefined) {
    requestHeaders['content-type'] = 'application/json';
  }

  let data: unknown;
  try {
    data = await fetchImpl(path, {
      method,
      headers: requestHeaders,
      body: payload === undefined ? undefined : JSON.stringify(payload),
      signal,
    });
  } catch (error) {
    throw toApiError(error) ?? error;
  }

  return schema ? schema.parse(data) : (data as T);
}
