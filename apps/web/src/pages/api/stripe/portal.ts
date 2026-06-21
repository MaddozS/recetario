import type { APIRoute } from "astro";
import { stripe } from "@recetario/billing";
import { getUserSubscription } from "@recetario/billing";
import { validateCsrf } from "@recetario/auth";

export const POST: APIRoute = async ({ request, locals, url }) => {
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
