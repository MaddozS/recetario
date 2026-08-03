# Stripe domain logic lives in `packages/stripe`; db stays pure persistence

The `stripe` singleton, Stripe API calls, and subscription/plan domain rules live in a dedicated `packages/stripe` package (renamed from `@recetario/stripe`). `packages/db` is pure persistence: it never imports the Stripe SDK, never holds a `stripe` singleton, and contains no runtime plan-seeding logic. The plans seed is a command run in dev and in the API deploy workflow — not at runtime.

## Context

`@recetario/stripe` was a mixed bag: it owned Stripe domain logic (webhook lifecycle, checkout, pricing, feature gating) *and* raw subscription reads/shaping (`getUserSubscription`, `getPlanByStripePriceId`). Meanwhile `packages/db/src/billing.ts` held the `stripe` singleton, `FEATURE_FLAGS`, `syncPlansFromStripe`/`seedSubscriptionPlans`, and plan upserts — importing the Stripe SDK into the data layer. The web app imported `@recetario/stripe` directly for `resolveSubscription`, `hasFeature`, `buildPricingPlans`, and more, creating a tangled dependency graph.

The data-layer boundary (ADR-0005) had already established `packages/db` as pure persistence, but the billing/stripe code had not been moved to match.

## Considered Options

- **Keep the status quo** (singleton + sync in db, billing split). Rejected: db imports Stripe, violating the boundary; web depends on a billing package that mixes Stripe with shaping; the runtime auto-seed (`seedSubscriptionPlans()` in webhook/plans/subscription handlers) made plans depend on first traffic.
- **Move everything Stripe into `packages/stripe`, db keeps only CRUD, seed as command (chosen)**. The stripe package owns the singleton, `listPrices()`, checkout/portal helpers, webhook signature verification, `TIER_CONFIG`, `buildPricingPlans`, feature-gating helpers, and `UserSubscription`/`PricingPlan` shaping. `packages/db` keeps only pure persistence and gains `syncPlans(data)` taking a minimal `SyncPlanInput[]`. The seed script lives at `packages/db/prisma/seed-plans.ts` (the one db→stripe import) and runs in the API deploy workflow after `migrate deploy` (prod) or via `pnpm --filter @recetario/db seed:plans` (dev).
- **B (seed fetches in stripe, db writes) vs A (db fetches)** — settled on B: `listPrices()` (stripe) fetches and maps to `SyncPlanInput[]`; db's `syncPlans` does pure upsert+deactivate. Keeps Stripe types out of db.
- **Thin helpers vs thick facade** — settled on thin: stripe exposes `createCheckoutSession`, `createPortalSession`, `verifyWebhookSignature`, `listPrices`; the API keeps the webhook switch/dispatch and calls db CRUD directly. Stripe never owns HTTP routing.
- **Web consumes Zod, not billing helpers** — web drops `resolveSubscription`/`buildPricingPlans`; all subscription/pricing types move to `@recetario/types` as Zod schemas; the API's `/api/billing/plans` returns enriched plans (from `buildPricingPlans` + Zod), and web fetches that directly. Pure helpers (`hasFeature`, `isPro`, `isPaid`, `getDefaultSubscription`, `formatCurrency`, `timeAgo`) stay in stripe.

## Consequences

- `packages/db` no longer imports the Stripe SDK; its `src/` is stripe-free. The only db→stripe edge is the dev/deploy seed script.
- The dependency graph becomes one-way: db ← stripe ← apps/api, and db ← apps/api, db ← apps/auth.
- Plans are seeded deterministically at deploy time (API workflow after `migrate deploy`) and on demand in dev; there is no runtime auto-seed, so a deploy is required after Stripe price/tier changes.
- The API deploy workflow needs a `STRIPE_SECRET_KEY` GitHub secret (in addition to `DATABASE_URL`) to run the seed step. `STRIPE_SECRET_KEY` is a CI secret here — a deliberate exception to the manual-secrets rule (ADR-0004), since the seed runs in GitHub Actions.
- `apps/web` depends on `@recetario/types` for subscription/pricing shapes and on `@recetario/stripe` only for pure helpers; it no longer calls `resolveSubscription`/`buildPricingPlans`.
- `@recetario/stripe` is renamed to `@recetario/stripe`; all imports update accordingly.
- `syncPlansFromStripe`, `seedSubscriptionPlans`, `FEATURE_FLAGS`, and the db `stripe` singleton are removed from `packages/db`.
