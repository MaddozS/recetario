import type { Handler } from "hono";
import { getCookie, setCookie } from "hono/cookie";
import {
  csrfCookieOptions,
  getCsrfCookie,
  resolveCsrfToken,
} from "@recetario/auth/csrf";

/**
 * Reemite la cookie del doble-submit conservando el valor existente.
 *
 * La web lo llama (`ensureCsrfToken()`) antes de una mutación cuando el token
 * ya no está en el cookie jar —p. ej. una pestaña abierta más tiempo que la vida
 * de la cookie—, de modo que el guardado no dependa de recargar el documento.
 * El valor no viaja en el JSON: el cliente lo relee de `document.cookie`.
 */
export function csrfTokenHandler(): Handler {
  return (c) => {
    const name = getCsrfCookie();
    // El service binding conserva la URL pública del request; el fallback HTTP
    // de dev llega como `http://localhost:8787`, donde `Secure` rompería la
    // cookie en el navegador.
    const secure = new URL(c.req.url).protocol === "https:";

    setCookie(
      c,
      name,
      resolveCsrfToken(getCookie(c, name)),
      csrfCookieOptions(secure),
    );

    return c.json({ ok: true });
  };
}
