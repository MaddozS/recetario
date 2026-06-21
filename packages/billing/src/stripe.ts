import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

export const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2026-04-22.dahlia",
});
