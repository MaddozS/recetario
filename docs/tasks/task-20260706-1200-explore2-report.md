# Explore Report: task-20260706-1200-explore2

## Task Question
Find ALL eager `process.env` reads in `packages/*/src/` that run at module import time (not inside functions), identify env vars, crash risk, SSR import chains, and the apps/web files that trigger the crash.

## Context Received
- **Problem**: Vite SSR module runner doesn't load `.env` into `process.env`. Module-level `process.env.X` reads crash at SSR import time.
- **Fixed so far**: `packages/db/src/prisma.ts` → converted to lazy Proxy init.
- **Now failing**: `packages/billing/dist/stripe.js:3` → `new Stripe(process.env.STRIPE_SECRET_KEY)` at module top-level.
- **State**: current repo state
- **Spec/plan**: none

## Skills Used
Selected:
- **graphify** — attempted knowledge graph queries for import chains

Discarded:
- none

Added During Execution:
- none

## Memory Context Used
- None needed

## Parallel Explore Context
- Parallel group: none
- Sibling explore tasks: none
- Assigned domain/question boundary: Only `packages/*/src/` (not prisma scripts in `packages/db/prisma/`, not generated code, not apps/web/src/)
- Overlap or dependency found: none

## Graphify Status
available — but `graphify query` returned only 1 node (from a doc file), insufficient for the pattern search. Fallback grep/read used instead for reliable results.

## Graphify Queries
| Query | Purpose | Result Summary |
|-------|---------|----------------|
| `graphify query "Which packages in packages/ read process.env at module top level?"` | Find env reads via knowledge graph | BFS returned 1 irrelevant node from a doc file; graph didn't index the pattern |

## Fallback Searches
| Search | Purpose | Result Summary |
|--------|---------|----------------|
| `grep process.env packages/ --include *.ts` | Find ALL process.env reads | 19 matches; filtered to `src/` for module top-level analysis |
| `grep @recetario/(auth\|billing\|db) apps/web/src/ --include *.ts` | Find server-side imports | 25 TypeScript files import from these packages |
| `grep @recetario/(auth\|billing\|db) apps/web/src/ --include *.astro` | Find Astro page imports | 98 matches across pages, layouts, components |
| `grep process.env apps/web/src/` | Find apps/web env reads | 2 matches (both inside functions, safe) |

## Files Read
| File | Reason | Fact Learned |
|------|--------|--------------|
| `packages/billing/src/stripe.ts` | Verify env read context | **EAGER** — line 3 top-level const, line 5 `new Stripe(...)` |
| `packages/auth/src/auth.ts` | Verify env read context | **EAGER** — `betterAuth({...})` called at top-level (line 11), reads 3 env vars inside config |
| `packages/auth/src/email.ts` | Verify env read context | **LAZY** — all reads inside `sendEmail()` function body |
| `packages/auth/src/csrf.ts` | Verify env read context | **LAZY** — `process.env.NODE_ENV` inside `setCsrfCookieHeader()` function |
| `packages/db/src/prisma.ts` | Verify fix state | **FIXED** — already lazy Proxy pattern (ponytail comment) |
| `packages/auth/src/index.ts` | Trace barrel re-exports | Line 1: `export { auth } from "./auth.js"` → evaluates `auth.ts` on any import |
| `packages/billing/src/index.ts` | Trace barrel re-exports | Line 1: `export { stripe } from "./stripe.js"` → evaluates `stripe.ts` on any import |
| `packages/auth/src/auth-client.ts` | Check env read pattern | **SAFE** — uses `import.meta.env`, not `process.env` |
| `packages/billing/package.json` | Check exports config | `.` maps to `./dist/index.js`; barrel entry point |
| `packages/auth/package.json` | Check exports config | `.` maps to `./dist/index.js`; `./client` subpath for client-side |
| `apps/web/src/middleware.ts` | Verify SSR import chain | **Triggers BOTH eager packages** at top-level (lines 3, 9 imports) |
| `packages/billing/src/billing.ts` | Verify stripe import chain | Line 2: `import { stripe } from "./stripe.js"` — also pulls in stripe eagerly |

## Key Findings

### 1. Eager (top-level) `process.env` reads — crash risk at SSR import time

#### File 1: `packages/billing/src/stripe.ts:3` — **CRASH**
```ts
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
export const stripe = new Stripe(STRIPE_SECRET, { ... });
```
- **Env var**: `STRIPE_SECRET_KEY` (Stripe production key)
- **Crash mechanism**: If `process.env.STRIPE_SECRET_KEY` is `undefined` (as it is during SSR), `STRIPE_SECRET` becomes `""`. `new Stripe("")` may create an initialized client but will **throw on the first API call** (no valid key). The module evaluation itself may not throw, but the client is effectively dead.
- **Trigger chain**: Any import from `@recetario/billing` → `index.ts` line 1 `export { stripe } from "./stripe.js"` → evaluates `stripe.ts` at top-level

#### File 2: `packages/auth/src/auth.ts:81,82,112` — **DATA CORRUPTION RISK**
```ts
export const auth = betterAuth({
  // ...
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,    // line 81
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,  // line 82
    },
  },
  trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:4321"],  // line 112
});
```
- **Env vars**: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `BETTER_AUTH_URL`
- **Crash mechanism**: `betterAuth({...})` is called at module top-level (line 11). Without `process.env`, `GOOGLE_CLIENT_ID` is `undefined` (the `!` is pure TypeScript, no runtime effect). This creates a configured Better Auth instance with `undefined` OAuth credentials. This likely doesn't crash immediately but produces a silently broken auth configuration.
  - `BETTER_AUTH_URL` has a `"http://localhost:4321"` fallback via `??` — safe.
- **Trigger chain**: Any import from `@recetario/auth` → `index.ts` line 1 `export { auth } from "./auth.js"` → evaluates `auth.ts` at top-level

### 2. Lazy (safe) `process.env` reads — inside function bodies

| File | Function | Env Var | Mechanism |
|------|----------|---------|-----------|
| `packages/auth/src/email.ts:8,16,20` | `sendEmail()` | `RESEND_API_KEY`, `SENDER_EMAIL` | Inside async function, protected by falsy guard on line 8 |
| `packages/auth/src/csrf.ts:27` | `setCsrfCookieHeader()` | `NODE_ENV` | Inside function, string comparison only |
| `packages/db/src/prisma.ts:13,28` | `initPrisma()` | `DATABASE_URL`, `NODE_ENV` | Already fixed with lazy Proxy pattern |

### 3. SSR import chain — who triggers the crash

**`apps/web/src/middleware.ts`** (runs on EVERY request):
```ts
import { auth, generateToken, getCsrfCookie } from "@recetario/auth";   // triggers auth.ts
import { getUserSubscription, resolveSubscription, seedSubscriptionPlans } from "@recetario/billing"; // triggers stripe.ts
import { cacheGet, cacheSet, logAuditEvent, prisma } from "@recetario/db"; // already fixed
```

**`apps/web/src/layouts/Layout.astro`** (every page using the app shell):
```ts
import { getUserPreferences } from '@recetario/db'
import { hasFeature } from '@recetario/billing'  // triggers stripe.ts
```

**`apps/web/src/layouts/LandingLayout.astro`**: Does NOT import billing or auth — safe.

### 4. All `apps/web/src/` files that import from these packages and trigger the crash

#### Files triggering `@recetario/auth` → `auth.ts` (eager betterAuth):
- `apps/web/src/middleware.ts` — **EVERY request**
- `apps/web/src/pages/api/auth/[...all].ts`
- `apps/web/src/pages/api/auth/forgot-password.ts`
- `apps/web/src/pages/api/auth/reset-password.ts`
- `apps/web/src/pages/api/account/change-email.ts`
- `apps/web/src/pages/api/account/change-password.ts`
- `apps/web/src/pages/api/account/update-name.ts` (dynamic import, but still triggers)
- `apps/web/src/pages/api/stripe/checkout.ts` (imports `validateCsrf`)
- `apps/web/src/pages/api/stripe/portal.ts` (imports `validateCsrf`)
- Pages: `recipes/index.astro`, `settings.astro`, `recipes/[recipe].astro`, `ingredients.astro`
  (these import `validateCsrf` from `@recetario/auth`)

#### Files triggering `@recetario/billing` → `stripe.ts` (eager Stripe init):
- `apps/web/src/middleware.ts` — **EVERY request**
- `apps/web/src/layouts/Layout.astro` — **every app page**
- `apps/web/src/pages/api/stripe/webhook.ts`
- `apps/web/src/pages/api/stripe/checkout.ts`
- `apps/web/src/pages/api/stripe/portal.ts`
- Pages: `settings.astro`, `settings/billing.astro`, `pricing.astro`, `index.astro`, `recipes/index.astro`, `produccion.astro`, `recipes/[recipe].astro`, `ingredients.astro`
- Components: `BillingSection.astro`, `PricingModal.astro`, `ProductionIngredientsTable.astro`, `ProductionRecipeBreakdown.astro`, `ProductionFinancialSummary.astro`, `RecipesSidebar.astro`,
  `landing/PricingSection.astro`

### 5. Accounts/web `process.env` reads (not in packages, for completeness)

| File | Location | Safe? |
|------|----------|-------|
| `apps/web/src/middleware.ts:122` | Inside `onRequest` handler, `process.env.NODE_ENV === "production"` | ✅ Lazy (inside handler function) |
| `apps/web/src/pages/api/stripe/webhook.ts:13` | Inside handler, `process.env.STRIPE_WEBHOOK_SECRET` | ✅ Lazy (inside handler function) |

## Candidate Files
| File | Why It Matters | Suggested Owner |
|------|---------------|-----------------|
| `packages/billing/src/stripe.ts` | Eager top-level `process.env.STRIPE_SECRET_KEY` + `new Stripe()` — **must be made lazy** | kitchcalc-builder |
| `packages/auth/src/auth.ts` | Eager top-level `betterAuth({...})` with `process.env.GOOGLE_CLIENT_ID!` etc. — **must be made lazy** | kitchcalc-builder |
| `packages/auth/src/index.ts` | Barrel re-export `export { auth }` forces eval of `auth.ts` on any import — may need lazy re-export pattern | kitchcalc-builder |
| `packages/billing/src/index.ts` | Barrel re-export `export { stripe }` forces eval of `stripe.ts` on any import — may need lazy re-export pattern | kitchcalc-builder |

## Risks And Unknowns
- **Risk: Stripe misconfiguration silent failure**: `new Stripe("")` may not throw until first API call. This means errors may surface later as "missing/invalid API key" from Stripe.js rather than a clear import-time error. The lazy fix should throw a clear error early (like the prisma fix does for `DATABASE_URL`).
- **Risk: betterAuth top-level side effects**: `betterAuth({...})` may interact with globals or set up middleware at construction time. Making it lazy requires ensuring no side effects happen until the first auth API call.
- **Risk: Middleware uses `auth.api.getSession()`**: The middleware accesses `auth.api.getSession()` inside `onRequest`. If `auth` is made lazy, the getter must resolve before this call.
- **Risk: `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with `!` assertion**: The `!` is TypeScript-only. If the env var is missing, `undefined` is passed. Better Auth may silently accept `undefined` credentials, making Google OAuth silently broken. Should add a runtime guard.
- **Unknown**: Whether Astro's `import.meta.env` (which IS populated by `dotenv`) is available in SSR for workspace packages. The `auth-client.ts` file uses `import.meta.env.PUBLIC_BETTER_AUTH_URL` and works fine, but public-prefixed vars are treated differently.

## Orchestrator Decisions Supported
- **Repo scope**: `packages/billing/src/stripe.ts`, `packages/auth/src/auth.ts`, `packages/billing/src/index.ts`, `packages/auth/src/index.ts`, `apps/web/src/middleware.ts`
- **Merge guidance for parallel reports**: No parallel reports. Two independent fixes (billing stripe + auth) that could be done sequentially or in parallel.
- **Candidate builder scope**: Two small independent tasks:
  1. **Make `packages/billing/src/stripe.ts` lazy** — wrap `stripe` export in Proxy/factory (same pattern as `packages/db/src/prisma.ts`)
  2. **Make `packages/auth/src/auth.ts` lazy** — wrap `auth` export with Proxy that initializes `betterAuth()` on first access
- **Risk level**: **high** — missing env vars at import time silently corrupts auth and billing states. Both middleware and core pages affected.
- **Human approval gates**: None for the explore report. Builder will need to decide:
  - Whether to throw early with a clear error message (recommended) vs tolerate missing values
  - Whether to refactor barrel exports in `index.ts` to avoid importing the eager module at all
- **Suggested validation**: `pnpm dev` and verify app doesn't crash on page load (check server console for errors). Then verify auth still works (sign-in, sign-up flows) and billing features still load.

## Suggested Skills For Next Agents
Builder:
- **ponytail** — @recetario/billing fix should mirror the proven Proxy pattern from `packages/db/src/prisma.ts`. Minimal diff, same approach.
- **ponytail** — @recetario/auth fix: same Proxy pattern, but account for `betterAuth` being a singleton with configuration side effects.

Reviewer:
- **design-system-verify** — not applicable (no UI changes)
- **security-best-practices** — verify that lazy init throws a clear error when required env vars are missing at first access

Validator:
- **none specific** — manual `pnpm dev` + browser session

## Budget Used
- Graphify queries: 1/3
- Searches: 10/12
- Files read: 12/12
