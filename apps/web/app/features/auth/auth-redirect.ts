/**
 * Query params y redirects locales de los flujos de auth.
 *
 * Módulo puro (sin imports ni aliases) para poder cubrirlo en `test/unit`.
 * Paridad con `packages/auth/src/sign-in.ts` (`getSafeRedirect`) y con el
 * saneado de `callbackURL` de `verify-email`.
 */

/** Primer valor no vacío de un query param de `useRoute()` (colapsa arrays). */
export function queryString(value: unknown): string | null {
  if (typeof value === 'string') return value.length > 0 ? value : null;
  if (Array.isArray(value)) {
    const first = value.find(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0
    );
    return first ?? null;
  }
  return null;
}

/** Sólo rutas locales: nada de `//host` (protocol-relative) ni de esquemas. */
function isLocalPath(value: string): boolean {
  return value.startsWith('/') && !value.includes('//') && !value.includes(':');
}

/** Destino post-login: `?redirect=` válido o `/recipes`. */
export function getSafeRedirect(raw: unknown): string {
  const value = queryString(raw);
  return value && isLocalPath(value) ? value : '/recipes';
}

/**
 * Destino post-verificación: `callbackURL` local distinto de la raíz o
 * `/sign-in` (mismo contrato que el SSR de `verify-email`).
 */
export function safeCallbackPath(raw: unknown): string {
  const value = queryString(raw);
  return value && value !== '/' && isLocalPath(value) ? value : '/sign-in';
}

/**
 * Email de `?email=` para prellenar el formulario de recuperación. Se descarta
 * lo que no tenga forma de email para no prometer un prellenado inexistente.
 */
export function queryEmail(raw: unknown): string | null {
  const value = queryString(raw);
  return value && value.includes('@') ? value : null;
}
