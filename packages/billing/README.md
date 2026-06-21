# @recetario/billing

Stripe + subscription + plan configuration package for KitchCalc.

Handles Stripe client setup, subscription management, feature gating, billing queries,
pricing plan configuration, and currency formatting.

## Usage

```ts
import { stripe } from "@recetario/billing";
import { hasFeature, resolveSubscription } from "@recetario/billing";
import { getUserSubscription, seedSubscriptionPlans } from "@recetario/billing";
import { formatCurrency } from "@recetario/billing";

// Stripe client
const prices = await stripe.prices.list({ active: true });

// Feature gating
const sub = resolveSubscription(await getUserSubscription(userId));
const canProduce = hasFeature(sub, "production_planner");

// Pricing plans
const plans = await getPricingPlans();
```

## Exports

| Export                   | Source File        | Description                          |
| ------------------------ | ------------------ | ------------------------------------ |
| `stripe`                 | `stripe.ts`        | Stripe API client singleton          |
| `hasFeature`             | `subscription.ts`  | Check if user has a feature          |
| `resolveSubscription`    | `subscription.ts`  | Normalize subscription to UI type    |
| `getDefaultSubscription` | `subscription.ts`  | Get default free-tier subscription   |
| `canCreateRecipe`        | `subscription.ts`  | Check recipe limit                   |
| `canCreateIngredient`    | `subscription.ts`  | Check ingredient limit               |
| `getRemainingRecipes`    | `subscription.ts`  | Remaining recipe count               |
| `getRemainingIngredients`| `subscription.ts`  | Remaining ingredient count           |
| `isPaid`                 | `subscription.ts`  | Check if paid tier                   |
| `isPro`                  | `subscription.ts`  | Check if pro tier                    |
| `TIER_CONFIG`            | `plans-config.ts`  | Plan/tier configuration              |
| `formatCurrency`         | `formatters.ts`    | Format as MXN currency string        |
| `timeAgo`                | `formatters.ts`    | Relative time in Spanish             |
| `getUserSubscription`    | `billing.ts`       | Get active subscription for user     |
| `seedSubscriptionPlans`  | `billing.ts`       | Sync plans from Stripe               |
| `getPlanByStripePriceId` | `billing.ts`       | Look up plan by Stripe price ID      |
| `getStripeCustomerId`    | `billing.ts`       | Get Stripe customer ID for user      |
| `createOrUpdateSubscription` | `billing.ts`   | Upsert subscription record           |
| `cancelSubscription`     | `billing.ts`       | Mark subscription as canceled        |
| `markSubscriptionPastDue`| `billing.ts`       | Mark subscription as past_due        |
| `syncPlansFromStripe`    | `billing.ts`       | Sync all plans from Stripe           |
| `getPricingPlans`        | `billing.ts`       | Get formatted pricing plans          |
| `countUserRecipes`       | `billing.ts`       | Count user's recipes                 |
| `countUserIngredients`   | `billing.ts`       | Count user's ingredients             |

## Environment Variables

| Variable              | Description           |
| --------------------- | --------------------- |
| `STRIPE_SECRET_KEY`   | Stripe secret API key |
| `STRIPE_WEBHOOK_SECRET` | Stripe webhook signing secret |
| `STRIPE_PRICE_*`      | Stripe price IDs (optional, resolved from metadata) |

## Dependencies

- Requires `@recetario/db` as a peer dependency (Prisma `subscription` and `subscriptionPlan` models)
- `stripe` SDK for API communication
