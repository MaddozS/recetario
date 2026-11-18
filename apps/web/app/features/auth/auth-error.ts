/**
 * Error de las rutas de auth con el código del proveedor preservado.
 *
 * En estos endpoints conviven tres formatos de error:
 * - Better Auth: `{ message, code }` (p. ej. `EMAIL_NOT_VERIFIED`).
 * - Rutas custom del API: `{ error: "<mensaje>", code, errors? }`.
 * - Envelope de Hono: `{ error: { code, message } }`.
 *
 * Módulo puro (sin Vue ni Nuxt) para poder cubrirlo en `test/unit`: el
 * normalizador de `useApi()` sólo entiende el envelope y convertiría
 * `EMAIL_NOT_VERIFIED` en un error genérico.
 */

export const AUTH_NETWORK_ERROR_MESSAGE =
  'No pudimos conectar con el servidor. Inténtalo de nuevo.';

const AUTH_UNKNOWN_ERROR_MESSAGE = 'Ocurrió un error. Intenta de nuevo.';

export class AuthApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly errors: readonly string[];

  constructor(code: string, message: string, status: number, errors: readonly string[] = []) {
    super(message);
    this.name = 'AuthApiError';
    this.code = code;
    this.status = status;
    this.errors = errors;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/** Normaliza cualquier fallo de `$fetch` a un `AuthApiError` tipado. */
export function toAuthApiError(cause: unknown): AuthApiError {
  const candidate = cause as {
    status?: unknown;
    data?: unknown;
    response?: unknown;
  };
  const status =
    typeof candidate?.status === 'number'
      ? candidate.status
      : (candidate?.response as Response | undefined)?.status;

  const data = candidate?.data;
  if (typeof status !== 'number') {
    return new AuthApiError('NETWORK_ERROR', AUTH_NETWORK_ERROR_MESSAGE, 0);
  }

  // Respuesta HTTP sin cuerpo parseable: es un error del servidor, no de red.
  if (!isRecord(data)) {
    return new AuthApiError('INTERNAL', AUTH_UNKNOWN_ERROR_MESSAGE, status);
  }

  const envelope = data.error;
  if (isRecord(envelope)) {
    return new AuthApiError(
      asString(envelope.code) ?? 'INTERNAL',
      asString(envelope.message) ?? AUTH_UNKNOWN_ERROR_MESSAGE,
      status
    );
  }

  const errors = Array.isArray(data.errors)
    ? data.errors.filter((entry): entry is string => typeof entry === 'string')
    : [];

  return new AuthApiError(
    asString(data.code) ?? 'INTERNAL',
    asString(data.message) ?? asString(envelope) ?? AUTH_UNKNOWN_ERROR_MESSAGE,
    status,
    errors
  );
}
