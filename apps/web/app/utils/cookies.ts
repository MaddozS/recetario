import { readCookie } from '#shared/utils/preferences';

/** Lee una cookie desde `document.cookie` (sólo cliente). */
export function readDocumentCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  return readCookie(document.cookie, name);
}

/** Escribe una cookie de presentación desde el cliente. */
export function writeDocumentCookie(name: string, value: string): void {
  if (typeof document === 'undefined') return;
  const oneYear = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${oneYear}; SameSite=Lax`;
}
