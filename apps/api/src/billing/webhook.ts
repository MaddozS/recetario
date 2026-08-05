import type { Handler } from "hono";
import {
  getSubscriptionPlanByStripePriceId,
  getSubscriptionByStripeId,
  upsertSubscription,
  updateSubscription,
} from "@recetario/db";
import {
  retrieveSubscription,
  verifyWebhookSignature,
} from "@recetario/stripe/server";
import { createSubscriptionInputSchema } from "@recetario/types";

function getPeriod(obj: unknown, field: string): number {
  if (obj && typeof obj === "object" && field in obj) {
    const val = (obj as Record<string, unknown>)[field];
    return typeof val === "number" ? val : 0;
  }
  return 0;
}

async function writeSubscription(input: {
  stripeSubscriptionId: string;
  stripeCustomerId: string;
  priceId: string | null;
  userId: string | null;
  planId: string | null;
  status: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  trialEnd: Date | null;
}): Promise<void> {
  const validated = createSubscriptionInputSchema.parse(input);
  let planId = validated.planId;
  let userId = validated.userId;
  if (!planId && input.priceId) {
    planId =
      (await getSubscriptionPlanByStripePriceId(input.priceId))?.id ?? null;
  }
  if (!userId) {
    userId =
      (await getSubscriptionByStripeId(input.stripeSubscriptionId))?.userId ??
      null;
  }
  if (!planId || !userId) return;

  await upsertSubscription(validated.stripeSubscriptionId, {
    id: validated.stripeSubscriptionId,
    userId,
    stripeCustomerId: validated.stripeCustomerId,
    planId,
    status: validated.status,
    currentPeriodStart: validated.currentPeriodStart,
    currentPeriodEnd: validated.currentPeriodEnd,
    cancelAtPeriodEnd: validated.cancelAtPeriodEnd,
    trialEnd: validated.trialEnd ?? null,
  });
}

export function stripeWebhookHandler(): Handler {
  return async (c) => {
    const payload = await c.req.text();
    const signature = c.req.header("stripe-signature");
    if (!signature) return c.text("Missing stripe-signature header", 400);

    let event: Awaited<ReturnType<typeof verifyWebhookSignature>>;
    try {
      const webhookSecret =
        ((c.env as Record<string, string | undefined>) ?? {})
          .STRIPE_WEBHOOK_SECRET ??
        process.env.STRIPE_WEBHOOK_SECRET ??
        "";
      event = await verifyWebhookSignature(payload, signature, webhookSecret);
    } catch (err) {
      console.error(
        "[Stripe Webhook Error] Signature verification failed:",
        err,
      );
      return c.text("Invalid signature", 400);
    }

    const obj = event.data.object as unknown as Record<string, unknown>;

    switch (event.type) {
      case "checkout.session.completed": {
        const metadata = obj.metadata as Record<string, string> | undefined;
        const subscriptionId =
          typeof obj.subscription === "string" ? obj.subscription : null;
        const customerId =
          typeof obj.customer === "string" ? obj.customer : null;
        if (!subscriptionId || !customerId) break;
        const sub = await retrieveSubscription(subscriptionId);
        const items = sub.items?.data;
        const priceId = items?.[0]?.price?.id ?? null;
        await writeSubscription({
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
          priceId,
          userId: metadata?.userId ?? null,
          planId: metadata?.planId ?? null,
          status: sub.status,
          currentPeriodStart: new Date(
            getPeriod(sub, "current_period_start") * 1000,
          ),
          currentPeriodEnd: new Date(
            getPeriod(sub, "current_period_end") * 1000,
          ),
          cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
          trialEnd: getPeriod(sub, "trial_end")
            ? new Date(getPeriod(sub, "trial_end") * 1000)
            : null,
        });
        break;
      }
      case "customer.subscription.updated": {
        const items = obj.items as
          | { data?: Array<{ price?: { id?: string } }> }
          | undefined;
        const priceId = items?.data?.[0]?.price?.id ?? null;
        await writeSubscription({
          stripeSubscriptionId: obj.id as string,
          stripeCustomerId:
            typeof obj.customer === "string" ? obj.customer : "",
          priceId,
          userId: null,
          planId: null,
          status: obj.status as string,
          currentPeriodStart: new Date(
            getPeriod(obj, "current_period_start") * 1000,
          ),
          currentPeriodEnd: new Date(
            getPeriod(obj, "current_period_end") * 1000,
          ),
          cancelAtPeriodEnd: Boolean(obj.cancel_at_period_end),
          trialEnd: getPeriod(obj, "trial_end")
            ? new Date(getPeriod(obj, "trial_end") * 1000)
            : null,
        });
        break;
      }
      case "customer.subscription.deleted": {
        const dbSub = await getSubscriptionByStripeId(obj.id as string);
        if (dbSub) {
          await updateSubscription(obj.id as string, {
            status: "canceled",
            cancelAtPeriodEnd: true,
          });
        }
        break;
      }
      case "invoice.payment_failed": {
        const subscriptionId =
          typeof obj.subscription === "string" ? obj.subscription : null;
        if (subscriptionId) {
          const dbSub = await getSubscriptionByStripeId(subscriptionId);
          if (dbSub) {
            await updateSubscription(subscriptionId, { status: "past_due" });
          }
        }
        break;
      }
    }
    return c.text("OK");
  };
}
