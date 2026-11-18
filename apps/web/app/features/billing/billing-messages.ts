/**
 * Copy de las acciones de facturación.
 *
 * Módulo puro: cubierto en `test/unit`. Un 4xx del envelope ya viene en español
 * (`No subscription found` se traduce en el front por ser un 404 conocido); un
 * 5xx o un fallo de red usan el fallback contextual.
 */

export const PORTAL_ERROR_MESSAGE = 'No se pudo abrir el portal.';
export const CHECKOUT_ERROR_MESSAGE = 'No se pudo iniciar el cambio de plan.';
export const PLAN_PRICE_MISSING_MESSAGE = 'Precio no configurado para este plan.';

type ErrorLike = {
  status?: number;
  code?: string;
  message?: string;
};

function asErrorLike(error: unknown): ErrorLike | null {
  return typeof error === 'object' && error !== null ? (error as ErrorLike) : null;
}

export function resolvePortalError(error: unknown): string {
  const candidate = asErrorLike(error);
  if (!candidate) return PORTAL_ERROR_MESSAGE;

  const status = candidate.status;
  if (typeof status !== 'number') {
    return 'Error de conexión al abrir el portal.';
  }

  // El 404 del API (`No subscription found`) no aporta al usuario.
  if (status === 404) {
    return PORTAL_ERROR_MESSAGE;
  }

  const message = candidate.message?.trim();
  if (status < 500 && message) {
    return message;
  }

  return PORTAL_ERROR_MESSAGE;
}

export function resolveCheckoutError(error: unknown): string {
  const candidate = asErrorLike(error);
  if (!candidate) return CHECKOUT_ERROR_MESSAGE;

  const status = candidate.status;
  if (typeof status !== 'number') {
    return 'Error de conexión al iniciar el cambio de plan.';
  }

  const message = candidate.message?.trim();
  if (status < 500 && message) {
    return message;
  }

  return CHECKOUT_ERROR_MESSAGE;
}
