# Subscription reconcile lives in `packages/stripe` as one deep module

The subscription reconcile engine — reading the user's subscription row, reconciling it against live Stripe, persisting drift, and shaping the `UserSubscriptionInfo` response — lives in a single deep module (`packages/stripe/src/subscription-reconcile.ts`). Both API handlers call it; `null` means "no subscription" and each caller translates it to its own fallback.

## Context

The KitchCalc subscription reconcile logic was duplicated nearly verbatim in two API handlers: `apps/api/src/billing/subscription.ts` and `apps/api/src/auth-session.ts`. The scheduled-downgrades feature added both copies in one commit, and both were untested (handler tests mock `@recetario/db` and never exercise the reconcile branches). The raw Stripe snake_case shape leaked across the seam via `as unknown as` casts and a string-keyed period parser, so Stripe field renames failed silently at runtime. A third, dead shaping path (`getUserSubscription` in `packages/stripe/src/billing.ts`) duplicated the shape and was no longer called.

## Decision

### Interface

One function, exported from `@recetario/stripe/server` (the db-touching entry point):

```ts
reconcileSubscription(userId: string): Promise<UserSubscriptionInfo | null>
```

- Returns `null` for no DB row and for canceled-and-expired subscriptions.
- Callers translate: the session handler falls back to `getDefaultSubscription()`, the `/api/billing/subscription` endpoint throws `ApiError("NOT_FOUND")`.
- The module is context-free — no request/env; dependencies are injected.

### Factory + pre-wired default

- `reconcileSubscriptionWith(deps: ReconcileDeps)` returns the async closure.
- `reconcileSubscription` is a module-level `const` composed with the real adapters (db CRUD methods + `retrieveSubscription` + `stripe.subscriptionSchedules.retrieve`).
- Tests use the factory with `vi.fn()` fakes; the pre-wired const is a trusted one-line composition, not directly tested.

### Dependencies (`ReconcileDeps`)

Narrow structural types, generated Prisma types + Stripe SDK types:

| Key | Signature |
|-----|-----------|
| `db.getSubscriptionByUserId` | `(userId, statuses?) => Promise<SubscriptionGetPayload<{ include: { plan: true } }> \| null>` |
| `db.upsertSubscription` | `(stripeSubscriptionId, Omit<SubscriptionUncheckedCreateInput, "stripeSubscriptionId">) => Promise<unknown>` |
| `db.getSubscriptionPlanByStripePriceId` | `(stripePriceId) => Promise<SubscriptionPlan \| null>` |
| `stripe.retrieveSubscription` | `(id) => Promise<Stripe.Subscription>` |
| `stripe.getSubscriptionSchedules` | `(id) => Promise<Stripe.SubscriptionSchedule>` |
| `log` | optional; defaults to `console.error`; used only on Stripe/schedule failure |

### Status policy

`ReconcileStatus` enum (`Active`, `Trialing`, `Canceled`, `PastDue`) is exported from the module. The dep still accepts `string[]` to match the real db function signature.

### Drift-write contract

The module persists drift (status/cancel/currentPeriodEnd) when live status or live cancel differs, writing exactly the current field-for-field behavior:

- `currentPeriodStart` stays DB-sourced
- `currentPeriodEnd` comes from live only when present, else DB-sourced
- no `planId` write
- `trialEnd` DB-sourced

The write happens **before** the expired-canceled null check, so drift is persisted even when the result is `null`.

### Fallback policy

Only the external Stripe reads (`retrieveSubscription` + `getSubscriptionSchedules`) are wrapped in a narrow try/catch → fall back to shaped DB state with `scheduledChange: null` + log. DB read/write errors **propagate** to the API error handler (500) — real data-layer failures are surfaced, not silently degraded. The schedule path wraps only the `getSubscriptionSchedules` call; the subsequent `getSubscriptionPlanByStripePriceId` DB read is outside the catch so its errors propagate too.

### Schedule read

Conditional — only when `liveSub.schedule` exists and has >1 phases. `scheduledChange` is built when the next phase's price resolves via `getSubscriptionPlanByStripePriceId`. `effectiveDate` comes from `nextPhase.start_date` (ISO). `targetTier`/`targetInterval` are cast to the proper Zod unions via `userSubscriptionInfoSchema.shape.scheduledChange.unwrap().parse(...)` — no `as any`. Schedule-read failure → `scheduledChange: null`, still returns shaped info.

### Shaping

The module shapes via `userSubscriptionInfoSchema` (the canonical schema). The DB plan is the source for tier/features/currency/priceCents/billingInterval; `isTrial` derives from the reconciled status; `cancelAtPeriodEnd` includes the `cancel_at` signal. Private helpers: `detectDrift` behavior is inlined in the closure, `extractScheduledChange`, `shapeInfo`, and a module-local `parseFeatures` (replaces the three existing copies). Null plan coalesces to free-tier (null limits, empty features).

### Exports (exactly four)

`reconcileSubscriptionWith`, `reconcileSubscription`, `ReconcileDeps`, `ReconcileStatus`. No default export, no private-helper exports.

## Consequences

- `apps/api/src/billing/subscription.ts` and `apps/api/src/auth-session.ts` become thin callers; `resolveUserSubscription` is a one-line wrapper (`reconcileSubscription(userId) ?? getDefaultSubscription()`).
- The dead `getUserSubscription` + `parseFeaturesJson` are deleted from `packages/stripe/src/billing.ts`; `userSubscriptionSchema` + `UserSubscription` type are deleted from `@recetario/types`; the `subscriptionResponseSchema` alias is removed everywhere in favor of `userSubscriptionInfoSchema` (handlers, `settings.astro`, `auth.ts`, API README).
- The module is tested through the factory seam with injected fakes, covering every branch: no-row, no-Stripe-id, status-drift, no-drift, cancel-drift, `cancel_at` signal, schedule happy path, unresolved-next-plan, single-phase, schedule-read failure, Stripe-read failure, expired-canceled, grace-period, null-period-end, trialing, plan-less row, missing live period-end, and DB error propagation.

## Follow-ups (not in scope)

- Plan-drift reconciliation (live price → planId on drift).
- Reading live `trial_end` / `current_period_start` into the shape.
- Subscription-row replacement / id cross-check (live sub id ≠ DB row id).
- The Stripe webhook's `writeSubscription` stays in `apps/api/src/billing/webhook.ts`, unchanged.
