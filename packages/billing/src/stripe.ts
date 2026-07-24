import Stripe from "stripe";
import { lazyInit } from "@recetario/config/lazy";

// ponytail: lazy init — avoids reading STRIPE_SECRET_KEY at import time
// in Vite SSR where .env isn't loaded into process.env.
function initStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  return new Stripe(secret, {
    apiVersion: "2026-04-22.dahlia",
  });
}

export const stripe = lazyInit("stripe", initStripe);
