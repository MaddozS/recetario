import { z } from 'zod';
import { resolvePortalError } from './billing-messages';

const portalResponseSchema = z.object({ url: z.string() });

/**
 * Portal de cliente de Stripe (`POST /api/stripe/portal`).
 *
 * El endpoint exige sesión y CSRF; `useApi()` aporta el token. El error queda
 * inline y visible hasta reintentar (el baseline lo auto-ocultaba a los 6 s).
 */
export function useBillingPortal() {
  const api = useApi();
  const pending = ref(false);
  const error = ref<string | null>(null);

  async function openPortal(): Promise<void> {
    if (pending.value) return;

    pending.value = true;
    error.value = null;

    try {
      const { url } = await api('/api/stripe/portal', {
        method: 'POST',
        schema: portalResponseSchema,
      });
      window.location.href = url;
    } catch (cause) {
      pending.value = false;
      error.value = resolvePortalError(cause);
    }
  }

  return { pending, error, openPortal };
}
