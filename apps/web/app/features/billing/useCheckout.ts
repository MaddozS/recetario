import { z } from "zod";
import type { PricingPlan } from "@recetario/types";
import type { BillingInterval } from "./billing-interval";
import {
  PLAN_PRICE_MISSING_MESSAGE,
  resolveCheckoutError,
} from "./billing-messages";

const checkoutResponseSchema = z.object({ url: z.string() });

export type CheckoutUrls = {
  successUrl?: string;
  cancelUrl?: string;
};

/**
 * Inicio de checkout contra Hono (`POST /api/stripe/checkout`).
 *
 * El endpoint exige sesión y CSRF: `useApi()` aporta el token y resuelve el 401.
 * La página sólo llama a `startCheckout` para usuarios autenticados; el
 * anónimo ve la CTA de sign-in. Los URLs de retorno son configurables: `/pricing`
 * conserva los suyos y el dialog de Settings vuelve a `?tab=billing`.
 */
export function useCheckout() {
  const api = useApi();
  const pending = ref(false);
  const error = ref<string | null>(null);

  function priceIdFor(
    plan: PricingPlan,
    interval: BillingInterval,
  ): string | null {
    return interval === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId;
  }

  async function startCheckout(
    plan: PricingPlan,
    interval: BillingInterval,
    urls: CheckoutUrls = {},
  ): Promise<void> {
    const priceId = priceIdFor(plan, interval);
    if (!priceId) {
      error.value = PLAN_PRICE_MISSING_MESSAGE;
      return;
    }

    pending.value = true;
    error.value = null;

    try {
      const origin = window.location.origin;
      const { url } = await api("/api/stripe/checkout", {
        method: "POST",
        body: {
          priceId,
          successUrl:
            urls.successUrl ?? `${origin}/settings?tab=billing&success=1`,
          cancelUrl: urls.cancelUrl ?? `${origin}/pricing?canceled=1`,
        },
        schema: checkoutResponseSchema,
      });

      window.location.href = url;
    } catch (cause) {
      pending.value = false;
      error.value = resolveCheckoutError(cause);
    }
  }

  function clearError(): void {
    error.value = null;
  }

  return { pending, error, startCheckout, clearError };
}
