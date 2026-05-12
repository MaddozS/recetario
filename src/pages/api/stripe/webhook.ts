import type { APIRoute } from "astro";
import Stripe from "stripe";
import {
  createOrUpdateSubscription,
  cancelSubscription,
  markSubscriptionPastDue,
  seedSubscriptionPlans,
} from "@/lib/db/billing";

const stripe = new Stripe(
  import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "",
  { apiVersion: "2026-04-22.dahlia" },
);

const webhookSecret =
  import.meta.env.STRIPE_WEBHOOK_SECRET ||
  process.env.STRIPE_WEBHOOK_SECRET ||
  "";

function getPeriod(obj: unknown, field: string): number {
  if (obj && typeof obj === "object" && field in obj) {
    const val = (obj as Record<string, unknown>)[field];
    return typeof val === "number" ? val : 0;
  }
  return 0;
}

export const POST: APIRoute = async ({ request }) => {
  await seedSubscriptionPlans();

  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", (err as Error).message);
    return new Response("Invalid signature", { status: 400 });
  }

  const obj = event.data.object as unknown as Record<string, unknown>;

  switch (event.type) {
    case "checkout.session.completed": {
      const metadata = obj.metadata as Record<string, string> | undefined;
      const customerId = typeof obj.customer === "string" ? obj.customer : null;
      const subscriptionId =
        typeof obj.subscription === "string" ? obj.subscription : null;

      if (!subscriptionId || !customerId) break;

      let sub: unknown;
      try {
        sub = await stripe.subscriptions.retrieve(subscriptionId);
      } catch {
        break;
      }

      await createOrUpdateSubscription({
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        userId: metadata?.userId ?? null,
        planId: metadata?.planId ?? null,
        status: (sub as Record<string, unknown>).status as string,
        currentPeriodStart: new Date(
          getPeriod(sub, "current_period_start") * 1000,
        ),
        currentPeriodEnd: new Date(getPeriod(sub, "current_period_end") * 1000),
        cancelAtPeriodEnd: Boolean(
          (sub as Record<string, unknown>).cancel_at_period_end,
        ),
        trialEnd: getPeriod(sub, "trial_end")
          ? new Date(getPeriod(sub, "trial_end") * 1000)
          : null,
      });
      break;
    }

    case "customer.subscription.updated": {
      const customerId = typeof obj.customer === "string" ? obj.customer : null;

      await createOrUpdateSubscription({
        stripeSubscriptionId: obj.id as string,
        stripeCustomerId: customerId ?? "",
        userId: null,
        planId: null,
        status: obj.status as string,
        currentPeriodStart: new Date(
          getPeriod(obj, "current_period_start") * 1000,
        ),
        currentPeriodEnd: new Date(getPeriod(obj, "current_period_end") * 1000),
        cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
        trialEnd: getPeriod(obj, "trial_end")
          ? new Date(getPeriod(obj, "trial_end") * 1000)
          : null,
      });
      break;
    }

    case "customer.subscription.deleted": {
      await cancelSubscription(obj.id as string);
      break;
    }

    case "invoice.payment_failed": {
      const subscriptionId =
        typeof obj.subscription === "string" ? obj.subscription : null;

      if (subscriptionId) {
        await markSubscriptionPastDue(subscriptionId);
      }
      break;
    }
  }

  return new Response("OK", { status: 200 });
};
