/**
 * Mensajes de los flujos de auth (módulo puro, unit-testeable).
 *
 * Los códigos de `?error=` los emite Better Auth al volver del proveedor y los
 * traduce el `sign-in` original; los `reason` los añade el shell Nuxt
 * (`app/middleware/auth.ts` y `useApi`) al mandar a `/sign-in`.
 */

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  account_not_linked:
    "No se pudo iniciar sesión con Google. La cuenta no está vinculada.",
  oauth_provider_not_found: "Proveedor de autenticación no configurado.",
  state_mismatch: "Error de seguridad. Intenta de nuevo.",
  state_not_found: "Error de seguridad. Intenta de nuevo.",
  please_restart_the_process:
    "El proceso de autenticación expiró. Intenta de nuevo.",
  invalid_callback_request: "Error de autenticación. Intenta de nuevo.",
  internal_server_error: "Error interno. Intenta de nuevo más tarde.",
  unable_to_create_session: "Error al crear sesión. Intenta de nuevo.",
  email_not_found: "Error de autenticación. Intenta de nuevo.",
};

const AUTH_ERROR_FALLBACK = "Error de autenticación. Intenta de nuevo.";

/** Sin código no hay alerta; con código desconocido, mensaje genérico. */
export function resolveAuthErrorMessage(code: unknown): string | null {
  if (typeof code !== "string" || code.length === 0) return null;
  return AUTH_ERROR_MESSAGES[code] ?? AUTH_ERROR_FALLBACK;
}

const AUTH_REASON_MESSAGES: Record<string, string> = {
  auth_required: "Inicia sesión para continuar.",
  session_expired: "Tu sesión expiró. Vuelve a iniciar sesión.",
};

/** Explicación del motivo por el que el shell pide iniciar sesión. */
export function resolveAuthReasonMessage(reason: unknown): string | null {
  if (typeof reason !== "string" || reason.length === 0) return null;
  return AUTH_REASON_MESSAGES[reason] ?? null;
}
