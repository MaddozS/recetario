# Task: Lazy Stripe client initialization

## Assigned Agent
kitchcalc-builder

## Context Received
- **Problem**: `packages/billing/src/stripe.ts` does `new Stripe(process.env.STRIPE_SECRET_KEY || "")` at module top-level. In Vite SSR, `process.env.STRIPE_SECRET_KEY` is undefined, creating a broken Stripe client that throws on first API call.
- **Pattern**: Same Proxy lazy-init pattern already applied to `packages/db/src/prisma.ts`.
- **Current file** (7 lines):
```typescript
import Stripe from "stripe";

const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";

export const stripe = new Stripe(STRIPE_SECRET, {
  apiVersion: "2026-04-22.dahlia",
});
```

## Dependency And Parallel Safety
- Depends on: none
- Parallel group: lazy-env-fixes
- Parallel-safe: yes — edits `packages/billing/src/stripe.ts` only, disjoint from auth task
- Sibling tasks: task-20260706-1200-builder5-auth (auth.ts fix)

## Skills
Selected:
- ponytail — mirror proven Proxy pattern from prisma.ts

## Scope
Editable files:
- `/Users/maddozs/personal-projects/recetario/packages/billing/src/stripe.ts`

Forbidden files:
- all other files

## Instructions
1. Replace the content of `packages/billing/src/stripe.ts` with a lazy Proxy pattern:

```typescript
import Stripe from "stripe";

// ponytail: lazy init — avoids reading STRIPE_SECRET_KEY at import time
// in Vite SSR where .env isn't loaded into process.env.
let _stripe: Stripe | undefined;

function initStripe(): Stripe {
  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    throw new Error("STRIPE_SECRET_KEY environment variable is not set");
  }
  _stripe = new Stripe(secret, {
    apiVersion: "2026-04-22.dahlia",
  });
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, key) {
    const client = initStripe();
    const value = (client as unknown as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
```

2. Rebuild the billing package: `pnpm --filter @recetario/billing build`
3. Verify build succeeds.

## Acceptance Criteria
- `stripe.ts` uses lazy Proxy initialization (no top-level `process.env` read)
- `pnpm --filter @recetario/billing build` succeeds
- Throws clear error if `STRIPE_SECRET_KEY` is missing at first usage

## Reporting
Write report to: `docs/tasks/task-20260706-1200-builder5-stripe-report.md`
Return only: done docs/tasks/task-20260706-1200-builder5-stripe-report.md
