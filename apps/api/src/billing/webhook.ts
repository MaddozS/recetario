import type { Handler } from 'hono';
import { verifyWebhookSignature, subscriptionIngestion } from '@recetario/stripe/server';

export function stripeWebhookHandler(): Handler {
  return async (c) => {
    const payload = await c.req.text();
    const signature = c.req.header('stripe-signature');
    if (!signature) return c.text('Missing stripe-signature header', 400);

    let event: Awaited<ReturnType<typeof verifyWebhookSignature>>;
    try {
      const webhookSecret =
        ((c.env as Record<string, string | undefined>) ?? {}).STRIPE_WEBHOOK_SECRET ??
        process.env.STRIPE_WEBHOOK_SECRET ??
        '';
      event = await verifyWebhookSignature(payload, signature, webhookSecret);
    } catch (err) {
      console.error('[Stripe Webhook Error] Signature verification failed:', err);
      return c.text('Invalid signature', 400);
    }

    const result = await subscriptionIngestion.processStripeEvent({
      event: event as never,
    });

    if (!result.ok) {
      // Retryable failure: Stripe will redeliver.
      return c.text(result.error, 500);
    }

    // Applied, idempotent duplicate, stale, or unsupported event: 200.
    return c.text('OK');
  };
}
