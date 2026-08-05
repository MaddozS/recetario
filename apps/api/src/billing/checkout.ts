import type { Handler } from "hono";
import { validateCsrf } from "@recetario/auth/server";
import {
  getSubscriptionPlanByStripePriceId,
  getStripeCustomerId,
} from "@recetario/db";
import {
  createCustomer,
  createCheckoutSession,
} from "@recetario/stripe/server";
import type { AuthVariables } from "../middleware/auth";
import { getAppOrigin, safeRedirectUrl } from "../url-utils";

export function stripeCheckoutHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = c.get("user");
    if (!validateCsrf(c.req.raw)) {
      return c.json({ error: "CSRF validation failed" }, 403);
    }

    let body: { priceId?: string; successUrl?: string; cancelUrl?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const { priceId, successUrl, cancelUrl } = body;
    if (!priceId) return c.json({ error: "Missing priceId" }, 400);

    const plan = await getSubscriptionPlanByStripePriceId(priceId);
    if (!plan) return c.json({ error: "Invalid price ID" }, 400);

    const appOrigin = getAppOrigin(c);
    const userId = user.id;
    const existingCustomerId = await getStripeCustomerId(userId);
    const customerId =
      existingCustomerId ??
      (await createCustomer({ email: user.email ?? undefined, userId })).id;
    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: safeRedirectUrl(
        successUrl,
        `${appOrigin}/settings/billing?success=1`,
        appOrigin,
      ),
      cancelUrl: safeRedirectUrl(
        cancelUrl,
        `${appOrigin}/pricing?canceled=1`,
        appOrigin,
      ),
      userId,
      planId: plan.id,
    });
    return c.json({ url: checkoutSession.url });
  };
}
