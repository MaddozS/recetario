import type { Handler } from "hono";
import { validateCsrf } from "@recetario/auth/server";
import {
  getSubscriptionPlanByStripePriceId,
  getStripeCustomerId,
  getSubscriptionByUserId,
} from "@recetario/db";
import {
  createCustomer,
  isUpgrade,
  subscriptionIngestion,
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

      const change = await subscriptionIngestion.changePlanIfNeeded({
        subscriptionId: currentSub.stripeSubscriptionId,
        priceId,
        isUpgrade: isUpgradePlan,
        isTrialing: currentSub.status === "trialing",
      });
      if (!change.ok) {
        return c.json({ error: change.error }, 500);
      }

      // Local ingestion is not atomic with the Stripe mutation; ingest the
      // retrieved snapshot so local state reflects Stripe's active Price.
      const ingestResult =
        await subscriptionIngestion.ingestSubscriptionSnapshot({
          snapshot: subscriptionIngestion.snapshotFromSubscription(
            change.subscription,
            currentSub.stripeCustomerId ?? "",
          ),
          context: { authority: "authenticated-user", userId },
        });
      if (!ingestResult.ok) {
        return c.json({ error: ingestResult.error }, 500);
      }

      return c.json({ url: redirectSuccessUrl });
    }

    const existingCustomerId = await getStripeCustomerId(userId);
    const customerId =
      existingCustomerId ??
      (await createCustomer({ email: user.email ?? undefined, userId })).id;

    const priorSub = await getSubscriptionByUserId(userId);
    const trialPeriodDays = priorSub ? undefined : 14;

    const result = await subscriptionIngestion.createTrustedCheckoutSession({
      customerId,
      priceId,
      successUrl: redirectSuccessUrl,
      cancelUrl: redirectCancelUrl,
      userId,
      planId: plan.id,
      trialPeriodDays,
    });
    if (!result.ok) {
      return c.json({ error: result.error }, 500);
    }
    return c.json({ url: result.url });
  };
}
