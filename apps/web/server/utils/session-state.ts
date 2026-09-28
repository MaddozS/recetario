import type { H3Event } from "h3";
import { sessionResponseSchema, type SessionResponse } from "@recetario/types";
import { callApi } from "./api-transport";

const SESSION_PATH = "/api/auth/session";

const SKIPPED_PREFIXES = [
  "/api/",
  "/_nuxt/",
  "/_ipx/",
  "/__nuxt",
  "/.well-known/",
  "/__webpack_hmr",
];

/**
 * Sólo los documentos HTML necesitan bootstrap de sesión: los assets estáticos,
 * las llamadas a `/api/**` (que relayamos tal cual) y los endpoints internos no.
 */
export function isDocumentRequest(method: string, pathname: string): boolean {
  if (method.toUpperCase() !== "GET" && method.toUpperCase() !== "HEAD") {
    return false;
  }

  if (SKIPPED_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  // Assets con extensión (`/favicon.ico`, `/logo.svg`, …). `.json` queda fuera
  // de la regla para no romper payloads de Nuxt.
  const lastSegment = pathname.slice(pathname.lastIndexOf("/") + 1);
  const dotIndex = lastSegment.lastIndexOf(".");
  return dotIndex <= 0 || lastSegment.slice(dotIndex) === ".json";
}

export function shouldBootstrapSession(event: H3Event): boolean {
  return isDocumentRequest(event.method, getRequestURL(event).pathname);
}

/**
 * Sesión del request desde el API. Un payload inesperado o un API caído se
 * tratan como anónimo: el render nunca se cae por el bootstrap.
 */
export async function fetchSession(
  event: H3Event,
): Promise<SessionResponse | null> {
  try {
    const response = await callApi(event, SESSION_PATH);
    if (!response.ok) {
      console.error(
        `[session] ${SESSION_PATH} responded ${response.status}; treating as anonymous`,
      );
      return null;
    }

    const parsed = sessionResponseSchema.safeParse(await response.json());
    if (!parsed.success) {
      console.error("[session] unexpected payload:", parsed.error.issues);
      return null;
    }
    return parsed.data;
  } catch (error) {
    console.error("[session] request to the API failed:", error);
    return null;
  }
}
