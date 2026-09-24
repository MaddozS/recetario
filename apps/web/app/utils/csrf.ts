/**
 * Pre-flight del doble-submit: garantiza que la cookie `csrf_token` exista
 * antes de una mutación.
 *
 * La cookie la emiten el middleware de Nitro (en cada documento con sesión) y
 * `GET /api/csrf`. Si el documento vive más que la cookie —edición larga,
 * pestaña restaurada del bfcache— el token desaparece del cookie jar y
 * `useApi()` mandaría la mutación sin `x-csrf-token`: el API responde 403
 * `CSRF validation failed` y el guardado no vuelve hasta recargar. Aquí se pide
 * un token nuevo y la mutación sigue su curso.
 */

export const CSRF_TOKEN_PATH = "/api/csrf";

export type CsrfEnsurerDeps = {
  /** Lee el token del cookie jar (`null` si no hay). */
  getToken: () => string | null;
  /** Emite/refresca la cookie contra el API. */
  refresh: () => Promise<unknown>;
};

/**
 * Estado a nivel de módulo: varias instancias de `useApi()` (página y
 * diálogos) comparten **una** renovación concurrente en vez de disparar una
 * cada una. Se limpia al settlearla, así un fallo permite reintentar en la
 * siguiente mutación.
 */
let inFlight: Promise<void> | null = null;

export function createCsrfEnsurer({
  getToken,
  refresh,
}: CsrfEnsurerDeps): () => Promise<void> {
  return async function ensureCsrfToken(): Promise<void> {
    if (getToken()) return;

    if (inFlight === null) {
      inFlight = Promise.resolve(refresh())
        .then(() => undefined)
        .finally(() => {
          inFlight = null;
        });
    }

    await inFlight;
  };
}
