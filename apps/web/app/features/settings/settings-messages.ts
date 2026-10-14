/**
 * Copy de las mutaciones de Settings.
 *
 * Módulo puro y sin aliases: cubierto en `test/unit`. Los mensajes del envelope
 * del API ya llegan en español (los handlers de cuenta traducen los errores de
 * Better Auth); un 5xx o un fallo de red usan el fallback contextual en vez de
 * exponer `Internal server error`.
 */

export const NAME_UPDATED_MESSAGE = 'Nombre actualizado correctamente.';
export const PASSWORD_UPDATED_MESSAGE = 'Contraseña actualizada correctamente.';
export const PREFERENCES_SAVED_MESSAGE = 'Preferencias guardadas correctamente.';
export const PREFERENCES_SAVE_ERROR_MESSAGE = 'Error al guardar las preferencias.';

const FALLBACK_MESSAGES: Record<'name' | 'password', string> = {
  name: 'Error al actualizar el nombre.',
  password: 'Error al cambiar la contraseña.',
};

const NETWORK_MESSAGES: Record<'name' | 'password', string> = {
  name: 'Error de conexión al actualizar el nombre.',
  password: 'Error de conexión al cambiar la contraseña.',
};

type ErrorLike = {
  status?: number;
  message?: string;
};

function asErrorLike(error: unknown): ErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : null;
}

function resolveError(error: unknown, action: 'name' | 'password'): string {
  const candidate = asErrorLike(error);
  if (!candidate) return FALLBACK_MESSAGES[action];

  // Un objeto sin `status` es un fallo de transporte (fetch): copy de conexión.
  const status = candidate.status;
  if (typeof status !== 'number') {
    return NETWORK_MESSAGES[action];
  }

  const message = candidate.message?.trim();
  if (status < 500 && message) {
    return message;
  }

  return FALLBACK_MESSAGES[action];
}

export function resolveAccountNameError(error: unknown): string {
  return resolveError(error, 'name');
}

export function resolveAccountPasswordError(error: unknown): string {
  return resolveError(error, 'password');
}
