# Split monolithic API worker into route modules

## Problem Statement

The Cloudflare Worker API (`apps/api/src/index.ts`) is a 574-line single file containing three unrelated domains: auth routes (password reset, catch-all), account routes (update-name, change-email, change-password), and Stripe routes (checkout, portal, webhook). Utility functions and type definitions are interleaved at the top. Adding a new endpoint requires scrolling through hundreds of lines to find the right section, and the file has no internal seams — everything is global scope within the module.

## Solution

Split the Hono app into route modules — `routes/auth.ts`, `routes/account.ts`, `routes/stripe.ts` — each exporting a Hono router. The main `index.ts` becomes a thin composition layer that mounts the three routers. Shared middleware (auth, CSRF) and utilities live in shared modules, not duplicated per route.

## User Stories

1. As a developer adding a new auth endpoint, I want to open a focused ~150-line route module instead of a 574-line monolithic file, so that I find the right place to add code immediately.
2. As a developer debugging a Stripe webhook issue, I want to read only the Stripe routes without auth and account logic mixed in, so that I can focus on the relevant code.
3. As a developer reviewing a PR that changes account management, I want the diff to show only account-related routes, so that I can verify the change doesn't accidentally touch auth or billing.
4. As a developer running the Worker API locally, I want the same behavior as before with no regressions, so that the refactor is zero-risk.
5. As a developer understanding the API architecture, I want a clear top-level `index.ts` that shows all mounted routes at a glance, so that I can navigate the codebase effectively.

## Implementation Decisions

### Route module structure

- `apps/api/src/routes/auth.ts`: forgot-password (POST), reset-password validate (GET), reset-password change (POST), catch-all auth handler (`/api/auth/*`).
- `apps/api/src/routes/account.ts`: update-name (POST), change-email (POST), change-password (POST).
- `apps/api/src/routes/stripe.ts`: checkout (POST), portal (POST), webhook (POST).

### Main app change

`index.ts` becomes:

```ts
import authRoutes from "./routes/auth";
import accountRoutes from "./routes/account";
import stripeRoutes from "./routes/stripe";

const app = new Hono<{ Bindings: Bindings }>();
app.use("*", syncEnvMiddleware);
app.get("/health", healthCheck);
app.route("/", authRoutes);
app.route("/", accountRoutes);
app.route("/", stripeRoutes);
```

### Shared utilities

- `clientIp`, `safeRedirectUrl`, `getPeriod`, `syncBindingsToProcessEnv`, `ENV_KEYS` are moved to `packages/config/env.ts` (same module as Candidate #2).
- The `Bindings` type stays in `index.ts` at the top level since it defines the Hono type parameter.

### Abuse protection

API rate limiting is currently disabled. A replacement will be designed separately before being added to the auth routes.

## Testing Decisions

No test infrastructure exists. Verification is operational:
- Start the Worker API with `wrangler dev` and test all endpoints: health check, forgot-password, reset-password (validate + change), update-name, change-email, change-password, Stripe checkout, Stripe portal, Stripe webhook.
- Confirm behavior is identical to the pre-refactor version — same status codes, same response bodies, same error handling.

## Out of Scope

- Adding, removing, or changing any API endpoints or their behavior.
- Restructuring the Stripe webhook handler logic (it's complex but domain-coherent).
- Adding centralized error handling or response formatting middleware.
- Extracting shared auth-check middleware (the current pattern of inline `auth.api.getSession` per endpoint is preserved).
- Adding input validation beyond what currently exists.

## Further Notes

This is Candidate #4 from the July 24, 2026 architecture review. It pairs naturally with Candidate #2 (shared env utilities) — both extract shared code into `packages/config`. The two candidates can be implemented independently. The refactor is a pure structural change with zero behavioral impact. The main `index.ts` shrinks from 574 lines to approximately 40 lines.
