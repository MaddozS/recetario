import type { APIRoute } from "astro";
import Stripe from "stripe";
import { getUserSubscription } from "../../../lib/recipe-data";

const stripe = new Stripe(
  import.meta.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || "",
  { apiVersion: "2026-04-22.dahlia" },
);

export const POST: APIRoute = async ({ locals, url }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const subscription = await getUserSubscription(locals.user.id);
  if (!subscription?.stripeCustomerId) {
    return new Response(JSON.stringify({ error: "No subscription found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: `${url.origin}/settings/billing`,
  });

  return new Response(JSON.stringify({ url: portalSession.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
