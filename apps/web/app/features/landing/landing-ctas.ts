/**
 * Destinos centralizados de los botones de llamada a la acción del landing.
 *
 * Evita la inconsistencia donde "Comenzar gratis" mandaba a `/sign-in` (login)
 * en vez de a `/sign-up` (registro), y centraliza las redirecciones de planes
 * de pago según el estado de autenticación.
 */
export const LANDING_CTAS = {
  signUp: '/sign-up',
  signIn: '/sign-in',
  app: '/recipes',
  planCheckout: (planId: string, isAuthenticated: boolean): string => {
    if (planId === 'free') {
      return isAuthenticated ? '/recipes' : '/sign-up?redirect=/recipes';
    }
    return isAuthenticated ? '/pricing' : '/sign-up?redirect=/pricing';
  },
} as const;
