import { randomBytes } from "node:crypto";

const TOKEN_BYTES = 32;
const CSRF_COOKIE = "csrf_token";
const CSRF_HEADER = "x-csrf-token";
const CSRF_FORM_FIELD = "_csrf";

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

export function setCsrfCookieHeader(headers: Headers, token: string): void {
  headers.append(
    "Set-Cookie",
    `${CSRF_COOKIE}=${token}; Path=/; SameSite=Strict; Max-Age=3600${process.env.NODE_ENV === "production" ? "; Secure" : ""}`,
  );
}

export function validateCsrf(
  request: Request,
  formData?: FormData,
): boolean {
  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookieToken = extractCookie(cookieHeader, CSRF_COOKIE);
  if (!cookieToken) return false;

  if (formData) {
    const formToken = formData.get(CSRF_FORM_FIELD);
    return typeof formToken === "string" && formToken === cookieToken;
  }

  const headerToken = request.headers.get(CSRF_HEADER);
  return typeof headerToken === "string" && headerToken === cookieToken;
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
