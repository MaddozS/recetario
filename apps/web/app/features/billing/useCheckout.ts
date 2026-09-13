import { z } from "zod";
import type { PricingPlan } from "@recetario/types";
import type { BillingInterval } from "./billing-interval";

const checkoutResponseSchema = z.object({ url: z.string() });

/**
 * Inicio de checkout contra Hono (`POST /api/stripe/checkout`).
 *
 * El endpoint exige sesión y CSRF: `useApi()` aporta el token y resuelve el 401.
 * La página sólo llama a `startCheckout` para usuarios autenticados; el
 * anónimo ve la CTA de sign-in.
 */
export function useCheckout() {
  const api = useApi();
  const pending = ref(false);
  const error = ref<string | null>(null);

  function priceIdFor(plan: PricingPlan, interval: BillingInterval): string | null {
    return interval === "monthly" ? plan.monthlyPriceId : plan.yearlyPriceId;
  }

  async function startCheckout(
    plan: PricingPlan,
    interval: BillingInterval,
  ): Promise<void> {
    const priceId = priceIdFor(plan, interval);
    if (!priceId) {
      error.value = "Precio no configurado para este plan.";
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
          successUrl: `${origin}/settings?tab=billing&success=1`,
          cancelUrl: `${origin}/pricing?canceled=1`,
        },
        schema: checkoutResponseSchema,
      });

      window.location.href = url;
    } catch (cause) {
      pending.value = false;
      error.value =
        cause instanceof Error ? cause.message : "No se pudo iniciar el pago.";
    }
  }

  return { pending, error, startCheckout };
}
