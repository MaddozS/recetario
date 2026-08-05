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
}): Promise<Stripe.Checkout.Session> {
  return stripe.checkout.sessions.create({
    customer: input.customerId,
    line_items: [{ price: input.priceId, quantity: 1 }],
    mode: "subscription",
    subscription_data: { trial_period_days: 14 },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    metadata: { userId: input.userId, planId: input.planId },
  });
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
