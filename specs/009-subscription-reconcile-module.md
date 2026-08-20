# Spec: Subscription Reconcile Module

## Problem Statement

The KitchCalc subscription reconcile logic — reading a user's subscription row, reconciling it against live Stripe (status/period/cancel drift + scheduled downgrades), persisting drift, and shaping the `UserSubscriptionInfo` response — is duplicated nearly verbatim in two API handlers: `apps/api/src/billing/subscription.ts` and `apps/api/src/auth-session.ts`. The recent scheduled-downgrades feature added both copies in a single commit, and both copies are untested: the handler tests mock the whole `@recetario/db` module and never exercise the reconcile branches. The raw Stripe snake_case shape also leaks across the seam (8+ `as unknown as` casts + a string-keyed `getPeriod` parser), so any Stripe field rename breaks at runtime silently. A third, dead shaping path (`getUserSubscription` in `packages/stripe/src/billing.ts`) duplicates the shape and is no longer called.

## Solution

Extract the reconcile into one deep module in `packages/stripe` — a small interface (`reconcileSubscription(userId) → UserSubscriptionInfo | null`) with a rich implementation (DB read, live Stripe reconcile, drift persist, scheduled-change extraction, shaping). Both API handlers call it and translate `null` into their own fallback (`getDefaultSubscription()` for the session, 404 for the subscription endpoint). The module is the single place where subscription read/reconcile/shape lives, testable through an injected-deps factory seam, and the dead `getUserSubscription` + its schema are deleted. The `subscriptionResponseSchema` alias is removed in favor of the canonical `userSubscriptionInfoSchema`.

## User Stories

1. As a user with an active subscription, I want the session and subscription endpoints to return the same shaped subscription, so that I see consistent billing state across the app.
2. As a user whose Stripe subscription status changed (e.g. canceled, past-due), I want the module to detect the drift and update the DB row, so that the DB reflects live Stripe without waiting for a webhook.
3. As a user who scheduled a downgrade, I want the module to read the Stripe subscription schedule and populate `scheduledChange` (target tier/name/interval/effective date), so that the settings page shows the pending change.
4. As a user with a canceled-but-not-expired subscription, I want the module to keep returning my subscription (status canceled, cancel-at-period-end true), so that I keep access until my paid-through period ends.
5. As a user whose subscription is canceled AND past its period end, I want the module to return `null`, so that the session falls back to the free default and the subscription endpoint 404s.
6. As a user with a legacy DB subscription row that has no Stripe id, I want the module to shape from the DB row alone (no Stripe call), so that legacy/pre-Stripe rows still resolve.
7. As a user whose plan row is missing from the DB, I want the module to shape as free-tier (null limits, empty features) without crashing, so that a plan-less row doesn't break the session.
8. As a user when live Stripe is unreachable, I want the module to fall back to the shaped DB state (with `scheduledChange: null`) and log the failure, so that a Stripe blip doesn't break my session.
9. As a user when a DB read/write fails, I want the error to propagate to the API error handler (500), so that real data-layer failures are surfaced, not silently degraded.
10. As a developer, I want the reconcile tested through a factory seam with injected fakes, so that every branch (drift, no-drift, schedule, fallback, null paths) is covered without module mocking.
11. As a developer, I want the dead `getUserSubscription` and `userSubscriptionSchema` deleted, so that there is one canonical subscription shape, not three.
12. As a developer, I want the `subscriptionResponseSchema` alias removed everywhere in favor of `userSubscriptionInfoSchema`, so that one name means one shape.
13. As a developer, I want the status filter policy as a named `ReconcileStatus` enum, so that the statuses are a typed, shareable constant rather than a magic array.

## Implementation Decisions

- **Module location**: `packages/stripe`, new file `subscription-reconcile.ts`, exported from `@recetario/stripe/server` (the db-touching entry point). Root `index.ts` (pure helpers) stays untouched.
- **Interface**: one function `reconcileSubscription(userId: string) → Promise<UserSubscriptionInfo | null>`. Returns `null` for no DB row and for canceled-and-expired; callers translate (session → `getDefaultSubscription()`, subscription endpoint → `ApiError("NOT_FOUND")`). The module stays context-free — no request/env, deps injected.
- **Factory + pre-wired default**: `reconcileSubscriptionWith(deps: ReconcileDeps)` returns the async closure; `reconcileSubscription` is a module-level `const` composed with the real adapters. Tests use the factory; the pre-wired const is a trusted one-line composition (not directly tested).
- **Deps (narrow structural types, generated + SDK-typed)**:
  - `db`: `getSubscriptionByUserId(userId, statuses?)` → `SubscriptionGetPayload<{ include: { plan: true } }> | null` (generated Prisma type), `upsertSubscription` matching the real db signature (`Omit<SubscriptionUncheckedCreateInput, "stripeSubscriptionId">`), `getSubscriptionPlanByStripePriceId` → generated plan type.
  - `stripe`: `retrieveSubscription(id)` → `Stripe.Subscription`, `getSubscriptionSchedules(id)` → `Stripe.SubscriptionSchedule` (Stripe SDK types).
  - `log`: optional, defaults to `console.error`, used only on the Stripe/schedule failure catch (message + error).
- **Status policy**: `ReconcileStatus` enum (`Active`, `Trialing`, `Canceled`, `PastDue`) exported from the module; the dep still accepts `string[]` to match the real db function.
- **Drift-write**: the module persists drift (status/cancel/currentPeriodEnd) when live status or live cancel differs, writing the exact current field-for-field behavior (currentPeriodStart stays DB-sourced; no `planId` write; `trialEnd` DB-sourced). Write happens before the expired-canceled null check.
- **Fallback policy**: only the external Stripe reads (`retrieveSubscription` + `getSubscriptionSchedules`) are wrapped in a narrow try/catch → fall back to shaped DB state with `scheduledChange: null` + log. DB read/write errors propagate.
- **Schedule read**: conditional — only when `liveSub.schedule` exists and has >1 phases; `scheduledChange` built when the next phase's price resolves via `getSubscriptionPlanByStripePriceId`. `effectiveDate` from `nextPhase.start_date` (ISO); `targetTier`/`targetInterval` cast to the proper Zod unions (not `as any`). Schedule-read failure → `scheduledChange: null`, still returns shaped info.
- **Shaping**: module shapes via `userSubscriptionInfoSchema` (the canonical schema). DB plan is the source for tier/features/currency/priceCents/billingInterval; `isTrial` derives from the reconciled status; `cancelAtPeriodEnd` includes the `cancel_at` signal. Private helpers (`detectDrift`, `extractScheduledChange`, `shapeInfo`) + private `parseFeatures`; module-local features parser replaces the three existing copies. Null plan coalesces to free-tier.
- **Exports** (exactly four): `reconcileSubscriptionWith`, `reconcileSubscription`, `ReconcileDeps`, `ReconcileStatus`. No default export, no private-helper exports.
- **Dead-code removal**: delete `getUserSubscription` + `parseFeaturesJson` from `packages/stripe/src/billing.ts`; delete `userSubscriptionSchema` + `UserSubscription` type from `@recetario/types`; replace the `subscriptionResponseSchema` alias with `userSubscriptionInfoSchema` everywhere (handlers, `settings.astro`, `auth.ts`).
- **Session handler**: `resolveUserSubscription` becomes a one-line thin wrapper (`reconcileSubscription(userId) ?? getDefaultSubscription()`), kept in the `Promise.all` with prefs/credential reads.
- **Docs**: new ADR `0007-subscription-reconcile-module.md` (full interface: enum, deps, factory+const, fallback policy, drift-write contract) + a terse glossary term under "Billing & Stripe" in `CONTEXT.md`.
- **Follow-ups (not in scope)**: plan-drift reconciliation (live price → planId), live `trial_end`/`current_period_start` into the shape, subscription-row replacement/id cross-check.

## Testing Decisions

- **What makes a good test**: test external behavior through the module's interface — the factory seam with injected fakes — not implementation details or module-level mocks. Assert exact deep-equality on both the returned `UserSubscriptionInfo` and the `upsertSubscription` input (the module's output is deterministic from its inputs).
- **Modules tested**:
  - `packages/stripe/src/subscription-reconcile.test.ts` (new) — module suite through `reconcileSubscriptionWith` with `vi.fn()` fakes for `db`/`stripe`/`log`: no-row → null; no-Stripe-id → DB-only shape; status-drift → exact upsert + live status in info; no-drift (status + cancel match) → no upsert; cancel-drift; `cancel_at` signal; schedule happy path (scheduledChange populated), unresolved-next-plan, single-phase, schedule-read failure; Stripe-read failure → fallback + log called; expired-canceled → null (after write); grace-period (canceled + future end); null-period-end guard (canceled + null end ≠ expired); trialing → isTrial true; plan-less row → free shape; missing live period-end → DB fallback in write.
  - `apps/api/src/billing/subscription.test.ts` (updated) — mock `reconcileSubscription` from `@recetario/stripe/server`; drop the `@recetario/db` mock; assert 200 with fixture info, 404 on null, 401 without session.
  - `apps/api/src/auth-session.test.ts` (updated) — mock `reconcileSubscription`; keep the prefs/credential db mocks; assert session includes the fixture info, `getDefaultSubscription()` on null, plus the existing prefs/no-cookie/500 cases.
- **Prior art**: the existing handler tests (`subscription.test.ts`, `auth-session.test.ts`, `checkout.test.ts`) use Hono `app.request()` over the HTTP seam with module mocks; the existing `packages/stripe` tests (`stripe-api.test.ts`, `subscription.test.ts`) use direct `vi.fn()` fakes without module mocking — the module suite follows the latter.

## Out of Scope

- The Stripe webhook's write path (`writeSubscription`) — **superseded**: removed when all Stripe-originated writes moved through the subscription ingestion module (ADR-0008).
- Plan-drift reconciliation (live price → planId on drift) — documented follow-up.
- Reading live `trial_end` / `current_period_start` into the shape — documented follow-up.
- Subscription-row replacement / id cross-check (live sub id ≠ DB row id) — documented follow-up.
- The `checkout`, `sync-session`, `portal`, and `plans` handlers — untouched at the time; checkout/sync now delegate writes through ingestion (ADR-0008).
- `getPlanByStripePriceId` / `getStripeCustomerId` in `packages/stripe` — untouched.

## Further Notes

- The module follows ADR-0006 (Stripe domain logic lives in `packages/stripe`; db stays pure persistence). It does not contradict or reopen it — the webhook switch stays in the API; only the duplicated read/reconcile/shape engine moves.
- **Superseded by ADR-0008**: subscription reconcile now delegates its drift writes through snapshot ingestion; the webhook switch still lives in the API but dispatch is `processStripeEvent`.
- The current handlers' tests mock `@recetario/db` but never exercise the reconcile branches — this is the exact gap the factory seam closes.
- The recent scheduled-downgrades commit (1c6ed26) added the duplicate reconcile block to both handlers in one commit — this module is the locality fix for that.
- The `subscriptionResponseSchema` alias is load-bearing for the web (`settings.astro` apiFetch schema, `auth.ts` session schema), but since it's a pure alias of `userSubscriptionInfoSchema`, replacing the alias everywhere is a safe mechanical rename.
