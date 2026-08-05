# Spec: Stripe Billing Route Decomposition & URL Utilities

## Problem Statement

As the API router file grew, Stripe billing route implementations—such as Stripe checkout session creation, customer portal redirection, and webhook signature verification alongside event database synchronization—were written inline inside the main API entrypoint. This shallow pattern bloated the central router file, mixed route mounting with complex event parsing and database sync logic, and made Stripe billing event processing difficult to test and maintain in isolation.

## Solution

Decompose the inline Stripe billing routes out of the main API router entrypoint into dedicated, deep route handler modules under the billing subsystem. Encapsulate private webhook processing helpers (signature verification, timestamp mapping, and subscription database persistence) behind a simple handler interface. Additionally, extract shared HTTP request origin and redirect URL calculation utilities into a dedicated API utility module with comprehensive unit tests.

## User Stories

1. As a subscriber initiating a plan purchase, I want the API checkout endpoint to validate CSRF tokens, resolve active subscription plans, and create a Stripe checkout session, so that I can securely upgrade my account plan.
2. As a subscriber managing my active plan, I want the API customer portal endpoint to validate my session and CSRF token and return a Stripe portal URL, so that I can update my billing details or manage my subscription.
3. As a developer operating the system, I want Stripe webhook events (`checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`) to be parsed, signature-verified, and persisted to the database inside a dedicated billing module, so that billing state synchronization is reliable and isolated from general API routing.
4. As a maintainer, I want `apps/api/src/index.ts` to act as a thin composition layer that mounts pre-built route handlers, so that the router code is easy to read, navigate, and modify without risk of introducing side-effects to unrelated endpoints.
5. As a maintainer, I want URL resolution and safe redirect validation functions extracted into a pure utility module, so that origin and redirect logic can be unit-tested without initializing server instances.

## Implementation Decisions

- **Route Module Decomposition**: Extract inline handlers into discrete billing route handler modules (`stripeCheckoutHandler`, `stripePortalHandler`, `stripeWebhookHandler`) following the established handler factory pattern (`export function xyzHandler(): Handler`).
- **Composition Layer**: The main API router remains a pure route mounting table, registering billing routes cleanly via `app.post("/api/stripe/checkout", stripeCheckoutHandler())`, `app.post("/api/stripe/portal", stripePortalHandler())`, and `app.post("/api/stripe/webhook", stripeWebhookHandler())`.
- **Private Webhook Encapsulation**: Signature validation, Stripe timestamp conversions, payload schema validation, and database subscription upserts operate as private implementation helpers internal to the webhook handler module, ensuring full locality and preventing helper leakage.
- **Shared Request URL Utilities**: Extract `getAppOrigin` and `safeRedirectUrl` into a dedicated URL utility module within the API package, serving both billing checkout/portal redirects and auth password-reset flows.
- **Data Layer Boundary Compliance**: Keep pure database persistence scoped inside database package CRUD methods (`upsertSubscription`, `updateSubscription`, `getSubscriptionPlanByStripePriceId`, `getSubscriptionByStripeId`, `getStripeCustomerId`), maintaining strict separation between route handling and persistence.

## Testing Decisions

- **Testing Strategy**: Tests exercise external HTTP request/response behavior through Hono's request dispatch interface (`app.request()`) without asserting private internal helper calls.
- **Modules Tested**:
  - Webhook processing: Verified against valid and invalid Stripe webhook signature headers, payload parsing, and subscription database synchronization for all 4 supported event types.
  - Checkout & Portal: Verified for CSRF token rejection, invalid price ID error responses, and correct redirect URL structure.
  - URL Utilities: Verified against environment bindings, fallback origins, relative path redirects, and cross-origin redirect rejection.
- **Prior Art**: Testing patterns follow existing API handler tests (such as `apps/api/src/billing/subscription.test.ts` and `apps/api/src/billing/plans.test.ts`).

## Out of Scope

- Modifying Stripe API domain contracts or price synchronization scripts (`packages/stripe`).
- Altering the Prisma schema or database subscription model definitions.
- Refactoring user profile or non-Stripe authentication endpoints.

## Further Notes

This spec codifies the architectural refactoring decision produced by `/improve-codebase-architecture` for Candidate 1.
