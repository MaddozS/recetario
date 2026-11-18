import { z } from 'zod';

export const subscriptionTierSchema = z.enum(['free', 'basic', 'pro']);
export const KNOWN_SUBSCRIPTION_STATUSES = [
  'active',
  'trialing',
  'canceled',
  'past_due',
  'unpaid',
  'incomplete',
] as const;
/** Raw Stripe statuses; unknown future statuses pass through raw and observable. */
export const subscriptionStatusSchema = z
  .union([z.enum(KNOWN_SUBSCRIPTION_STATUSES), z.string()])
  .nullable();
export const billingIntervalSchema = z.enum(['monthly', 'yearly']).nullable();

export const planFeatureSchema = z.object({
  text: z.string(),
  // Etiqueta de fila para la matriz de `/pricing`: el nombre de la dimensión
  // cuando la frase cambia entre planes ("Recetas" para "Hasta 10 recetas").
  // Sin ella la frase hace de etiqueta, así que es opcional.
  label: z.string().min(1).optional(),
  included: z.boolean(),
  status: z.literal('coming_soon').optional(),
});

export const tierConfigSchema = z.object({
  name: z.string(),
  description: z.string(),
  // Sólo texto: la presentación del badge la decide la UI (no viaja una clase
  // Tailwind desde el API).
  badge: z.object({ text: z.string() }).nullable(),
  limits: z.object({
    recipes: z.number().int().nullable(),
    ingredients: z.number().int().nullable(),
  }),
  features: z.array(planFeatureSchema),
});

export const userSubscriptionInfoSchema = z.object({
  tier: subscriptionTierSchema,
  status: subscriptionStatusSchema,
  recipesLimit: z.number().int().nullable(),
  ingredientsLimit: z.number().int().nullable(),
  features: z.record(z.boolean()),
  priceCents: z.number().int().nullable(),
  currency: z.string().nullable(),
  billingInterval: billingIntervalSchema,
  currentPeriodEnd: z.string().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  isTrial: z.boolean(),
  trialEnd: z.string().nullable(),
  scheduledChange: z
    .object({
      targetTier: subscriptionTierSchema,
      targetPlanName: z.string(),
      targetInterval: billingIntervalSchema,
      effectiveDate: z.string(),
    })
    .nullable()
    .optional(),
});

export const syncPlanInputSchema = z.object({
  id: z.string(),
  tier: z.string(),
  billingInterval: z.enum(['monthly', 'yearly']),
  stripePriceId: z.string(),
  priceCents: z.number().int(),
  currency: z.string(),
  name: z.string(),
  recipesLimit: z.number().int().nullable(),
  ingredientsLimit: z.number().int().nullable(),
  featuresJson: z.string(),
  active: z.boolean().default(true),
});

export const pricingPlanSchema = z.object({
  id: z.string(),
  tier: subscriptionTierSchema,
  name: z.string(),
  description: z.string(),
  badge: z.object({ text: z.string() }).nullable(),
  currency: z.string(),
  monthlyPriceId: z.string().nullable(),
  monthlyDisplay: z.string().nullable(),
  yearlyPriceId: z.string().nullable(),
  yearlyDisplay: z.string().nullable(),
  yearlyPerMonthDisplay: z.string().nullable(),
  features: z.array(planFeatureSchema),
});

export const plansListResponseSchema = z.array(pricingPlanSchema);
export const planSchema = syncPlanInputSchema.extend({
  features: z.record(z.boolean()),
});

export type SubscriptionTier = z.infer<typeof subscriptionTierSchema>;
export type UserSubscriptionInfo = z.infer<typeof userSubscriptionInfoSchema>;
export type SyncPlanInput = z.infer<typeof syncPlanInputSchema>;
export type PlanFeature = z.infer<typeof planFeatureSchema>;
export type TierConfig = z.infer<typeof tierConfigSchema>;
export type PricingPlan = z.infer<typeof pricingPlanSchema>;
export type Plan = z.infer<typeof planSchema>;
