import type Stripe from "stripe";
import type { SyncPlanInput } from "@recetario/types";
import { stripe } from "./stripe-client";

export { stripe };
import { FEATURE_FLAGS } from "./plans-config";

export async function listPrices(): Promise<SyncPlanInput[]> {
  const prices = await stripe.prices.list({ active: true, expand: ["data.product"], limit: 100 });
  const result: SyncPlanInput[] = [];

  for (const price of prices.data) {
    const product = price.product as Stripe.Product;
    const tier = product.metadata?.tier;
    const interval = price.recurring?.interval;
    if (!tier || !FEATURE_FLAGS[tier] || (interval !== "month" && interval !== "year")) continue;

    result.push({
      id: `${tier}_${interval}ly`,
      stripePriceId: price.id,
      name: product.name,
      tier,
      billingInterval: interval === "month" ? "monthly" : "yearly",
      priceCents: price.unit_amount ?? 0,
      currency: price.currency ?? "usd",
      recipesLimit: product.metadata?.recipes_limit ? Number(product.metadata.recipes_limit) : null,
      ingredientsLimit: product.metadata?.ingredients_limit ? Number(product.metadata.ingredients_limit) : null,
      featuresJson: JSON.stringify(FEATURE_FLAGS[tier]),
      active: true,
    });
  }

  return result;
}

export async function createCustomer(input: { email?: string; userId: string }): Promise<Stripe.Customer> {
  return stripe.customers.create({ email: input.email, metadata: { userId: input.userId } });
}

export async function createCheckoutSession(input: {
  customerId: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  userId: string;
  planId: string;
  trialPeriodDays?: number;
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    mode: "subscription",
    ...(input.trialPeriodDays != null && input.trialPeriodDays > 0
      ? { subscription_data: { trial_period_days: input.trialPeriodDays } }
      : {}),
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { userId: input.userId, planId: input.planId },
  });
}

export async function updateStripeSubscription(input: {
  subscriptionId: string;
  priceId: string;
  isUpgrade: boolean;
  isTrialing: boolean;
}): Promise<Stripe.Subscription> {
  const subscription = await stripe.subscriptions.retrieve(input.subscriptionId);
  const itemId = subscription.items.data[0]?.id;
  if (!itemId) {
    throw new Error("Subscription item not found");
  }

  if (input.isUpgrade) {
    const updateParams: Stripe.SubscriptionUpdateParams = {
      items: [{ id: itemId, price: input.priceId }],
      proration_behavior: "always_invoice",
    };
    return stripe.subscriptions.update(input.subscriptionId, updateParams);
  } else {
    let schedule: Stripe.SubscriptionSchedule;
    if (typeof subscription.schedule === "string" && subscription.schedule) {
      schedule = await stripe.subscriptionSchedules.retrieve(subscription.schedule);
    } else {
      schedule = await stripe.subscriptionSchedules.create({
        from_subscription: input.subscriptionId,
      });
    }

    const currentPhase = schedule.phases[schedule.phases.length - 1];
    const currentPriceId =
      (typeof currentPhase?.items[0]?.price === "string"
        ? currentPhase.items[0].price
        : currentPhase?.items[0]?.price?.id) ||
      subscription.items.data[0].price.id;

    const currentPeriodEnd =
      (subscription as { current_period_end?: number }).current_period_end ||
      subscription.items.data[0]?.current_period_end;

    await stripe.subscriptionSchedules.update(schedule.id, {
      end_behavior: "release",
      phases: [
        {
          items: [{ price: currentPriceId, quantity: 1 }],
          start_date: currentPhase ? currentPhase.start_date : "now",
          end_date: currentPhase ? currentPhase.end_date : currentPeriodEnd,
        },
        {
          items: [{ price: input.priceId, quantity: 1 }],
          start_date: currentPhase ? currentPhase.end_date : currentPeriodEnd,
        },
      ],
    });

    return stripe.subscriptions.retrieve(input.subscriptionId);
  }
}

export async function createPortalSession(customerId: string, returnUrl: string): Promise<Stripe.BillingPortal.Session> {
  return stripe.billingPortal.sessions.create({ customer: customerId, return_url: returnUrl });
}

export async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<Stripe.Event> {
  try {
    return await stripe.webhooks.constructEventAsync(payload, signature, secret);
  } catch {
    return stripe.webhooks.constructEvent(payload, signature, secret);
  }
}

export async function retrieveSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  return stripe.subscriptions.retrieve(subscriptionId);
}

export async function retrieveCheckoutSession(sessionId: string): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.retrieve(sessionId);
}

