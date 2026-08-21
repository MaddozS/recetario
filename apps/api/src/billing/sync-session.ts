import type { Handler } from "hono";
import {
  getCheckoutIntentBySession,
} from "@recetario/db";
import {
  retrieveCheckoutSession,
  retrieveSubscription,
  subscriptionIngestion,
} from "@recetario/stripe/server";
import { getAuthUser } from "../middleware/auth";
import type { AuthVariables } from "../middleware/auth";

export function syncCheckoutSessionHandler(): Handler<{ Variables: AuthVariables }> {
  return async (c) => {
    const user = await getAuthUser(c);
    let body: { sessionId?: string };
    try {
      body = await c.req.json();
    } catch {
      return c.json({ error: "Invalid request body" }, 400);
    }

    const { sessionId } = body;
    if (!sessionId || typeof sessionId !== "string") {
      return c.json({ error: "Missing sessionId" }, 400);
    }

    try {
      const session = await retrieveCheckoutSession(sessionId);
      if (!session || !session.subscription) {
        return c.json({ ok: false });
      }

      // Ownership authority: the authenticated user plus a trusted Checkout
      // intent. Metadata can corroborate but never override.
      const intent = await getCheckoutIntentBySession(session.id ?? sessionId);
      if (!intent || intent.userId !== user.id) {
        return c.json({ ok: false }, 409);
      }
      if (intent.state === "pending" && intent.expiresAt < new Date()) {
        return c.json({ ok: false }, 409);
      }

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? "";

      // Retrieve the current Stripe state; the local plan resolves from the
      // Checkout intent, never from the requested Price alone.
      const sub = await retrieveSubscription(subscriptionId);
      const snapshot = subscriptionIngestion.snapshotFromSubscription(
        sub,
        customerId,
      );

      const ingestResult =
        await subscriptionIngestion.ingestSubscriptionSnapshot({
          snapshot,
          metadata: (session.metadata as Record<string, string> | null) ?? null,
          context: { authority: "checkout-intent", intent },
        });

      if (!ingestResult.ok) {
        return c.json({ ok: false }, 500);
      }

      return c.json({ ok: true });
    } catch (err) {
      console.error("[syncCheckoutSession] error:", err);
      return c.json({ ok: false }, 500);
    }
  };
}
