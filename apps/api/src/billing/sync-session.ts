import type { Handler } from "hono";
import {
  getSubscriptionPlanByStripePriceId,
  upsertSubscription,
} from "@recetario/db";
import {
  retrieveCheckoutSession,
  retrieveSubscription,
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

      const subscriptionId =
        typeof session.subscription === "string"
          ? session.subscription
          : session.subscription.id;
      const customerId =
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? "";

      const metadata = session.metadata;
      const sub = await retrieveSubscription(subscriptionId);
      const items = sub.items?.data;
      const priceId = items?.[0]?.price?.id ?? null;

      const planId =
        metadata?.planId ??
        (priceId
          ? (await getSubscriptionPlanByStripePriceId(priceId))?.id
          : null);
      const userId = metadata?.userId ?? user.id;

      if (!planId || !userId) return c.json({ ok: false });

      const subData = sub as unknown as {
        current_period_start?: number;
        current_period_end?: number;
      };

      const startTs =
        typeof subData.current_period_start === "number" &&
        subData.current_period_start > 0
          ? subData.current_period_start
          : 0;
      const endTs =
        typeof subData.current_period_end === "number" && subData.current_period_end > 0
          ? subData.current_period_end
          : 0;

      const currentPeriodStart =
        startTs > 0 ? new Date(startTs * 1000) : new Date();
      const currentPeriodEnd =
        endTs > 0
          ? new Date(endTs * 1000)
          : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      await upsertSubscription(subscriptionId, {
        id: subscriptionId,
        userId,
        stripeCustomerId: customerId,
        planId,
        status: sub.status,
        currentPeriodStart,
        currentPeriodEnd,
        cancelAtPeriodEnd: Boolean(sub.cancel_at_period_end),
        trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      });

      return c.json({ ok: true });
    } catch (err) {
      console.error("[syncCheckoutSession] error:", err);
      return c.json({ ok: false }, 500);
    }
  };
}
