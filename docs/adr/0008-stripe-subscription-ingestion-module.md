# Stripe subscription ingestion is one deep module owning trusted Checkout and event processing

Checkout creation, canonical Stripe Subscription snapshot ingestion, and Stripe event processing live in a single server-only module (`packages/stripe/src/subscription-ingestion.ts`). It owns Stripe identity authority, Price resolution, period normalization, status policy, event ordering, and persistence policy. Checkout, sync, webhook, and reconcile callers all cross this one seam for every Stripe-originated Subscription mutation.

## Context

Four independent implementations interpreted Stripe Subscription state and wrote the local `Subscription` row: checkout plan changes, authenticated Checkout Session sync, webhook processing, and subscription reconcile. Each repeated Stripe price selection, period extraction, identity resolution, and persistence policy. Behavior had diverged: some paths invented billing dates (`now` / `now + 30 days`), some trusted Stripe metadata over the authenticated user, and the checkout plan-change path could persist a requested future downgrade as the active plan.

Webhook delivery had two further correctness gaps. The first `checkout.session.completed` event could arrive before a local Subscription existed, so persisted subscription linkage could not establish ownership. Duplicate, concurrent, and out-of-order Stripe events could overwrite newer Subscription state because processing had no durable attempt history or ordering cursor.

This spec supersedes the independent Subscription write paths left out of the Subscription Reconcile Module spec (ADR-0007). It partially revisits ADR-0006's "thin helpers" choice: repeated Stripe-to-Subscription translation and persistence policy demonstrably existed across four callers, so Stripe domain logic deepens. HTTP routing remains in the API and database persistence remains pure, so ADR-0006's high-level seams are preserved.

## Decision

### Deep module location and interface

The subscription-ingestion module lives in `packages/stripe` behind the server-only entry (`@recetario/stripe/server`). It is never exported from the browser-safe root. It exposes exactly three operations through `createSubscriptionIngestionWith(deps)` (factory + pre-wired `subscriptionIngestion` default, mirroring the reconcile pattern):

- `createTrustedCheckoutSession` — creates the Stripe Checkout Session, persists a trusted Checkout intent binding the authenticated user, Stripe Session, Stripe Customer, and selected Stripe Price, compensates (expires the Stripe Session) if local persistence fails, and returns the redirect URL only after intent persistence succeeds.
- `ingestSubscriptionSnapshot` — applies a canonical Stripe Subscription snapshot from an authenticated or otherwise trusted source.
- `processStripeEvent` — processes one verified Stripe event: retrieves current Stripe state for non-terminal events, enforces event ordering/idempotency via durable attempts, and applies or ignores the mutation.

### Ownership authority

- Checkout creation and authenticated sync use the authenticated user as authority.
- Initial webhook ingestion uses an unexpired Checkout intent as authority.
- Existing subscription events use persisted Stripe Subscription or Customer linkage as authority.
- Stripe metadata is optional corroborating evidence only. A mismatch is an ingestion failure; metadata never selects or overrides the owner.

### Checkout intent domain model

A durable Checkout intent binds authenticated user, Stripe Checkout Session, Stripe Customer, selected Stripe Price, creation/expiry time, state (pending → consumed), and the resulting Stripe Subscription identity. Pending intents expire after 24 hours; consumed intents remain durable for replay-safe correlation. Open Checkout Sessions created before Checkout intents existed are not backfilled — a hard cutover rejects their webhook/sync processing and requires a fresh authenticated Checkout.

### Stripe Price and plan authority

The currently active plan resolves exclusively from Stripe Subscription items matched against locally persisted active `SubscriptionPlan` Stripe Price IDs. Exactly one recognized Price is required; zero or multiple reject ingestion. `Subscription.planId` always represents the currently active Stripe Price — a scheduled downgrade target remains a scheduled change until Stripe activates it.

### Period normalization

One private normalizer reads current period dates from supported Stripe Subscription-level or recognized-item-level fields. Either location is acceptable; if both exist they must agree (contradictory values reject ingestion). Existing persisted period values may be preserved when Stripe omits the corresponding value; first-time ingestion rejects missing required period dates. Synthetic `now` / `now + 30 days` fallbacks are removed.

### Status policy

The raw Stripe subscription status is persisted. Recognized statuses map through an explicit entitlement policy; unknown future statuses remain stored and observable but receive no paid entitlement until explicitly supported (fail closed).

### Stripe event attempt domain model and ordering

Each verified delivery creates a durable attempt identified by Stripe event identity plus attempt sequence, retaining event type, Stripe creation time, Stripe Subscription identity, processing timestamps, outcome (applied/ignored/failed), and failure/ignored detail. All attempts are retained indefinitely.

- Processing acquires a transaction-scoped PostgreSQL advisory lock keyed by Stripe event ID. Under the lock, an existing applied/ignored attempt makes the new delivery an ignored duplicate.
- Processing also serializes by Stripe Subscription ID. Under that lock, `(event.created, event.id)` is compared with the latest terminal attempt for that Subscription; older or equal events are recorded as ignored stale/duplicate attempts and cannot overwrite newer state.
- Failed attempts never advance the terminal ordering cursor and never block a later retry. The database interface records a failed attempt independently after the mutation transaction fails.
- A valid supported event is acknowledged (HTTP 200) only after an applied or ignored attempt is durably recorded. Unsupported verified event types return 200 without a Subscription mutation. Invalid signatures are rejected by the HTTP handler before any attempt.

### Structured persistence seam

`packages/stripe` produces a validated `SubscriptionMutation` command (generated Prisma input type with `Omit`). `packages/db` exposes purpose-built persistence methods (`applySubscriptionMutation`, `recordFailedEventAttempt`, Checkout intent CRUD) that own only persistence, uniqueness, advisory-lock execution, and transaction atomicity — never Stripe payload parsing, Price meaning, identity authority, date normalization, or entitlement mapping. No generic Prisma transaction callback leaks upward.

### Reconcile relationship

Subscription reconcile keeps its public read/repair/shape interface (`reconcileSubscription(userId): Promise<UserSubscriptionInfo | null>` per ADR-0007) and its fallback behavior, but every drift write delegates through snapshot ingestion. It no longer constructs or persists Subscription mutation inputs directly.

### Plan-change recovery

If Stripe successfully changes an existing Subscription but local ingestion fails, the request returns failure and no automatic Stripe rollback is attempted. A retry first retrieves current Stripe state; if the target is already active or already scheduled, it ingests without repeating the Stripe mutation.

## Consequences

- Checkout, sync, webhook, and reconcile callers no longer interpret Stripe Subscription shapes or call Subscription write CRUD methods directly.
- Webhook routing retains only signature verification, event dispatch, and HTTP outcome translation.
- The Stripe event attempt + Checkout intent models are canonical domain terms (see the project glossary in `CONTEXT.md`).
- New Prisma migration `20260820061319_add_checkout_intents_and_stripe_event_attempts` adds both models; existing migrations are unchanged.
- Tests exercise the three ingestion operations through injected Stripe/persistence adapters, the structured db seam through mocked Prisma transactions, and HTTP outcomes through Hono `app.request()` — never private normalizers or advisory-lock SQL.
