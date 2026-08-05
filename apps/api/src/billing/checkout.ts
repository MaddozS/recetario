import type { Handler } from "hono";
import { validateCsrf } from "@recetario/auth/server";
import {
  getSubscriptionPlanByStripePriceId,
  getStripeCustomerId,
  getSubscriptionByUserId,
  upsertSubscription,
} from "@recetario/db";
import {
  createCustomer,
  createCheckoutSession,
  updateStripeSubscription,
  isUpgrade,
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

    const redirectSuccessUrl = safeRedirectUrl(
      successUrl,
      `${appOrigin}/settings?tab=billing&success=1`,
      appOrigin,
    );
    const redirectCancelUrl = safeRedirectUrl(
      cancelUrl,
      `${appOrigin}/pricing?canceled=1`,
      appOrigin,
    );

    const currentSub = await getSubscriptionByUserId(userId, [
      "active",
      "trialing",
    ]);

    if (currentSub?.stripeSubscriptionId) {
      if (
        currentSub.planId === plan.id ||
        currentSub.plan?.stripePriceId === priceId
      ) {
        return c.json({ url: redirectSuccessUrl });
      }

      const isUpgradePlan = isUpgrade(
        {
          tier: currentSub.plan?.tier,
          billingInterval: currentSub.plan?.billingInterval,
        },
        { tier: plan.tier, billingInterval: plan.billingInterval },
      );

      const isTrialing = currentSub.status === "trialing";

      const updatedStripeSub = await updateStripeSubscription({
        subscriptionId: currentSub.stripeSubscriptionId,
        priceId,
        isUpgrade: isUpgradePlan,
        isTrialing,
      });

      await upsertSubscription(currentSub.stripeSubscriptionId, {
        id: currentSub.stripeSubscriptionId,
        userId,
        stripeCustomerId: currentSub.stripeCustomerId,
        planId: plan.id,
        status: updatedStripeSub.status,
        currentPeriodStart:
          typeof updatedStripeSub.current_period_start === "number" &&
          updatedStripeSub.current_period_start > 1000000000
            ? new Date(updatedStripeSub.current_period_start * 1000)
            : new Date(),
        currentPeriodEnd:
          typeof updatedStripeSub.current_period_end === "number" &&
          updatedStripeSub.current_period_end > 1000000000
            ? new Date(updatedStripeSub.current_period_end * 1000)
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: Boolean(updatedStripeSub.cancel_at_period_end),
        trialEnd: updatedStripeSub.trial_end
          ? new Date(updatedStripeSub.trial_end * 1000)
          : null,
      });

      return c.json({ url: redirectSuccessUrl });
    }

    const existingCustomerId = await getStripeCustomerId(userId);
    const customerId =
      existingCustomerId ??
      (await createCustomer({ email: user.email ?? undefined, userId })).id;

    const priorSub = await getSubscriptionByUserId(userId);
    const trialPeriodDays = priorSub ? undefined : 14;

    const checkoutSession = await createCheckoutSession({
      customerId,
      priceId,
      successUrl: redirectSuccessUrl,
      cancelUrl: redirectCancelUrl,
      userId,
      planId: plan.id,
      trialPeriodDays,
    });
    return c.json({ url: checkoutSession.url });
  };
}
