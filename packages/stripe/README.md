# @recetario/stripe

Stripe client and subscription-domain helpers for KitchCalc.

## Usage

```ts
import {
  createCheckoutSession,
  listPrices,
  verifyWebhookSignature,
} from '@recetario/stripe/server';
import { hasFeature, getDefaultSubscription } from '@recetario/stripe';
```

The package owns the Stripe singleton, Stripe API calls, tier configuration, feature gating, pricing-plan enrichment, and pure subscription helpers. HTTP routing and subscription lifecycle persistence belong to `apps/api`.

## Exports

- `listPrices` maps active Stripe prices to `SyncPlanInput` values for the db seed command.
- `createCustomer`, `createCheckoutSession`, and `createPortalSession` wrap Stripe API calls.
- `verifyWebhookSignature` and `retrieveSubscription` support API webhook handling.
- `getPricingPlans` enriches persisted plans for the API response.
- `hasFeature`, `isPaid`, `isPro`, `canCreateRecipe`, `canCreateIngredient`, `getRemainingRecipes`, `getRemainingIngredients`, and `getDefaultSubscription` are pure helpers.
- `formatCurrency` and `timeAgo` provide shared formatting.

## Environment Variables

| Variable            | Description           |
| ------------------- | --------------------- |
| `STRIPE_SECRET_KEY` | Stripe secret API key |

## Dependencies

- `@recetario/db` for persistence reads.
- `@recetario/types` for shared Zod contracts.
- `stripe` for API communication.
