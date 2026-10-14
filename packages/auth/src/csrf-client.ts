const COOKIE_NAME = 'csrf_token';

export function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const prefix = `${COOKIE_NAME}=`;
  const parts = document.cookie.split(';');
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}
