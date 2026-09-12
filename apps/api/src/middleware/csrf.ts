import type { MiddlewareHandler } from "hono";
import {
  getTrustedOrigins,
  resolveRequestOrigin,
  validateCsrf,
} from "@recetario/auth/server";
import { ApiError } from "../errors";

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

// Signature-authenticated Stripe callback: no cookies, no browser origin.
const EXEMPT_PATHS = new Set(["/api/stripe/webhook"]);

const AUTH_PREFIX = "/api/auth/";

function isTrustedOrigin(origin: string, trustedOrigins: string[]): boolean {
  if (origin === "null") return false;

  let normalized: string;
  try {
    normalized = new URL(origin).origin;
  } catch {
    return false;
  }

  return trustedOrigins.some((trusted) => {
    try {
      return new URL(trusted).origin === normalized;
    } catch {
      return trusted === normalized;
    }
  });
}

function isAuthPath(path: string): boolean {
  return path === "/api/auth" || path.startsWith(AUTH_PREFIX);
}

function isFormContentType(contentType: string): boolean {
  return (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  );
}

/**
 * CSRF authority for every cookie-based mutation:
 * - cross-site requests are rejected;
 * - a browser `Origin`/`Referer`, when present, must be a trusted origin;
 * - browser requests that carry cookies must pass the double-submit check
 *   (`x-csrf-token` header or `_csrf` form field against the `csrf_token`
 *   cookie), except `/api/auth/**` which Better Auth guards with its own
 *   origin check.
 *
 * Requests without `Origin`/`Referer` are server-to-server (API service
 * binding, SSR fetch) and cannot be forged by a browser, which always sends
 * `Origin` on unsafe methods.
 */
export function csrfProtection(): MiddlewareHandler {
  return async (c, next) => {
    const method = c.req.method.toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      await next();
      return;
    }

    const path = c.req.path;
    if (EXEMPT_PATHS.has(path)) {
      await next();
      return;
    }

    if (c.req.header("sec-fetch-site") === "cross-site") {
      throw new ApiError("FORBIDDEN", "Cross-site request rejected");
    }

    const origin = resolveRequestOrigin(c.req.raw);
    if (origin !== null && !isTrustedOrigin(origin, getTrustedOrigins())) {
      throw new ApiError("FORBIDDEN", "Untrusted origin");
    }

    if (origin !== null && !isAuthPath(path) && c.req.header("cookie")) {
      const contentType = c.req.header("content-type") ?? "";
      let formData: FormData | undefined;
      if (isFormContentType(contentType)) {
        try {
          formData = await c.req.raw.clone().formData();
        } catch {
          formData = undefined;
        }
      }

      if (!validateCsrf(c.req.raw, formData)) {
        throw new ApiError("FORBIDDEN", "CSRF validation failed");
      }
    }

    await next();
  };
}
