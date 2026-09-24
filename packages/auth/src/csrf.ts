import { randomBytes, timingSafeEqual } from "node:crypto";

const TOKEN_BYTES = 32;
const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const CSRF_FORM_FIELD = "_csrf";

/**
 * Vida de la cookie del token: la de la sesión de Better Auth (7 días). Antes
 * caducaba en 1 h mientras la sesión seguía viva, así que cualquier documento
 * de más de una hora (edición larga, pestaña restaurada del bfcache) se quedaba
 * sin poder mutar: el cliente mandaba la mutación sin `x-csrf-token` y el API
 * respondía 403 `CSRF validation failed` hasta recargar.
 */
export const CSRF_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

export type CsrfCookieOptions = {
  path: string;
  sameSite: "strict";
  httpOnly: false;
  secure: boolean;
  maxAge: number;
};

/**
 * Opciones de la cookie para sus dos emisores: el middleware de Nitro de la web
 * y `GET /api/csrf` del API. Una sola definición evita que las dos políticas se
 * desincronicen (`h3`/`cookie-es` y Hono aceptan los mismos nombres y el
 * `sameSite` en minúsculas).
 */
export function csrfCookieOptions(secure: boolean): CsrfCookieOptions {
  return {
    path: "/",
    sameSite: "strict",
    httpOnly: false,
    secure,
    maxAge: CSRF_COOKIE_MAX_AGE,
  };
}

/**
 * Conserva el token ya emitido y sólo genera uno nuevo cuando no hay ninguno:
 * el API valida `header === cookie`, así que rotarlo rompería en vuelo las
 * peticiones del cliente que estén usando el valor anterior.
 */
export function resolveCsrfToken(existing?: string | null): string {
  return existing && existing.length > 0 ? existing : generateToken();
}

export function generateToken(): string {
  return randomBytes(TOKEN_BYTES).toString("hex");
}

export function getCsrfCookie(): string {
  return CSRF_COOKIE;
}

export function getCsrfHeader(): string {
  return CSRF_HEADER;
}

export function getCsrfFormField(): string {
  return CSRF_FORM_FIELD;
}

/**
 * Origins allowed to send browser mutations to the API. Shared with Better
 * Auth's `trustedOrigins` so both layers accept exactly the same requests.
 */
export function getTrustedOrigins(): string[] {
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:4321";
  const apiOrigin = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";
  return [apiOrigin, webOrigin];
}

export function extractCsrfCookie(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie") ?? "";
  return extractCookie(cookieHeader, CSRF_COOKIE);
}

/**
 * Origin of the browser that issued the request: `Origin` first, `Referer` as
 * fallback. `null` means the request was not browser-originated (service
 * binding / SSR fetch / tests / non-browser clients).
 */
export function resolveRequestOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const referer = request.headers.get("referer");
  if (!referer) return null;

  try {
    return new URL(referer).origin;
  } catch {
    return null;
  }
}

/**
 * Double-submit check: the `csrf_token` cookie must match either the
 * `x-csrf-token` header or the `_csrf` form field.
 */
export function validateCsrf(request: Request, formData?: FormData): boolean {
  const cookieToken = extractCsrfCookie(request);
  if (!cookieToken) return false;

  const headerToken = request.headers.get(CSRF_HEADER);
  if (typeof headerToken === "string" && tokensMatch(headerToken, cookieToken)) {
    return true;
  }

  if (formData) {
    const formToken = formData.get(CSRF_FORM_FIELD);
    if (typeof formToken === "string" && tokensMatch(formToken, cookieToken)) {
      return true;
    }
  }

  return false;
}

function tokensMatch(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

function extractCookie(cookieHeader: string, name: string): string | null {
  const prefix = `${name}=`;
  const parts = cookieHeader.split(";");
  for (const part of parts) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) {
      return trimmed.slice(prefix.length);
    }
  }
  return null;
}
