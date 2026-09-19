import type { Handler } from "hono";
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
import { ApiError } from "../errors";
import { getAppOrigin, safeRedirectUrl } from "../url-utils";

export function stripeCheckoutHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = c.get("user");

    let body: { priceId?: string; successUrl?: string; cancelUrl?: string };
    try {
      body = await c.req.json();
    } catch {
      throw new ApiError("VALIDATION_ERROR", "Invalid request body");
    }

    const { priceId, successUrl, cancelUrl } = body;
    if (!priceId) throw new ApiError("VALIDATION_ERROR", "Missing priceId");

    const plan = await getSubscriptionPlanByStripePriceId(priceId);
    if (!plan) throw new ApiError("VALIDATION_ERROR", "Invalid price ID");

    const appOrigin = getAppOrigin(c);
    const userId = user.id;

    const baseSuccessUrl = `${appOrigin}/settings?tab=billing&success=1`;
    const redirectSuccessUrl = safeRedirectUrl(
      successUrl,
      baseSuccessUrl,
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
        console.error("[checkout] changePlanIfNeeded failed:", change.error);
        throw new ApiError("INTERNAL", "Could not apply the plan change");
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
        console.error("[checkout] ingestSubscriptionSnapshot failed:", ingestResult.error);
        throw new ApiError("INTERNAL", "Could not reconcile the subscription");
      }

      // No Checkout Session here: local state was ingested synchronously
      // above, so the redirect needs no session_id-based sync.
      return c.json({ url: redirectSuccessUrl });
    }

    const existingCustomerId = await getStripeCustomerId(userId);
    const customerId =
      existingCustomerId ??
      (await createCustomer({ email: user.email ?? undefined, userId })).id;

    const priorSub = await getSubscriptionByUserId(userId);
    const trialPeriodDays = priorSub ? undefined : 14;

    // `{CHECKOUT_SESSION_ID}` is substituted by Stripe on redirect, so the
    // settings page can run the post-payment sync-session flow.
    const checkoutSuccessUrl = `${redirectSuccessUrl}${
      redirectSuccessUrl.includes("?") ? "&" : "?"
    }session_id={CHECKOUT_SESSION_ID}`;

    const result = await subscriptionIngestion.createTrustedCheckoutSession({
      customerId,
      priceId,
      successUrl: checkoutSuccessUrl,
      cancelUrl: redirectCancelUrl,
      userId,
      planId: plan.id,
      trialPeriodDays,
    });
    if (!result.ok) {
      console.error("[checkout] createTrustedCheckoutSession failed:", result.error);
      throw new ApiError("INTERNAL", "Could not start the checkout session");
    }
    return c.json({ url: result.url });
  };
}
