import Stripe from "stripe";

// ponytail: lazy init — avoids reading STRIPE_SECRET_KEY at import time
// in Vite SSR where .env isn't loaded into process.env.
let _stripe: Stripe | undefined;

function initStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  _stripe = new Stripe(secret, {
    apiVersion: "2026-04-22.dahlia",
  });
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, key) {
    const client = initStripe();
    const value = (client as unknown as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
