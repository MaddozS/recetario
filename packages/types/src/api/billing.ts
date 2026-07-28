import { z } from "zod";

export const planSchema = z.object({
  id: z.string(),
  stripePriceId: z.string(),
  name: z.string(),
  tier: z.string(),
  billingInterval: z.string(),
  priceCents: z.number().int(),
  currency: z.string(),
  recipesLimit: z.number().int().nullable(),
  ingredientsLimit: z.number().int().nullable(),
  features: z.record(z.boolean()),
  active: z.boolean(),
});

export const plansListResponseSchema = z.array(planSchema);

export const subscriptionResponseSchema = z.object({
  tier: z.enum(["free", "basic", "pro"]),
  status: z
    .enum(["active", "trialing", "canceled", "past_due", "unpaid", "incomplete"])
    .nullable(),
  recipesLimit: z.number().int().nullable(),
  ingredientsLimit: z.number().int().nullable(),
  features: z.record(z.boolean()),
  priceCents: z.number().int().nullable(),
  currency: z.string().nullable(),
  billingInterval: z.enum(["monthly", "yearly"]).nullable(),
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  isTrial: z.boolean(),
  trialEnd: z.string().nullable(),
});

export type Plan = z.infer<typeof planSchema>;
export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
