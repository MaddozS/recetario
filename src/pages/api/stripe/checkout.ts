import type { APIRoute } from "astro";
import { stripe } from "@/lib/stripe";
import { getPlanByStripePriceId, getStripeCustomerId } from "@/lib/db/billing";
import { validateCsrf } from "@/lib/csrf";

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!validateCsrf(request)) {
    return new Response(JSON.stringify({ error: "CSRF validation failed" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: { priceId?: string; successUrl?: string; cancelUrl?: string };
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { priceId, successUrl, cancelUrl } = body;

  if (!priceId) {
    return new Response(JSON.stringify({ error: "Missing priceId" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const plan = await getPlanByStripePriceId(priceId);
  if (!plan) {
    return new Response(JSON.stringify({ error: "Invalid price ID" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const appOrigin = new URL(request.url).origin;

  function safeRedirectUrl(input: string | undefined, fallback: string): string {
    if (!input) return fallback;
    if (input.startsWith("/") && !input.startsWith("//")) return input;
    try {
      const parsed = new URL(input);
      if (parsed.origin === appOrigin) return input;
    } catch {
      // Relative paths without protocol — allow if they start with /
      if (input.startsWith("/") && !input.startsWith("//")) return input;
    }
    return fallback;
  }

  const userId = locals.user.id;
  const userEmail = locals.user.email;

  let customerId: string;

  const existingCustomerId = await getStripeCustomerId(userId);
  if (existingCustomerId) {
    customerId = existingCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail ?? undefined,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode: "subscription",
    subscription_data: {
      trial_period_days: 14,
    },
    success_url: safeRedirectUrl(successUrl, `${appOrigin}/settings/billing?success=1`),
    cancel_url: safeRedirectUrl(cancelUrl, `${appOrigin}/pricing?canceled=1`),
    metadata: {
      userId,
      planId: plan.id,
    },
  });

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
