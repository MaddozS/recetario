# KitchCalc Context

Project-specific terminology for the KitchCalc monorepo (Recetario).

## Data layer

**CRUD method**:
A function in `packages/db` that performs a single persistence operation (get/create/update/delete/upsert/duplicate) against Prisma and returns raw rows or a result object. CRUD methods are the only way `apps/api` and `packages/billing` touch tenant data; they centralize `ownerId` scoping.

_Avoid_: "db helper", "repository" (implies patterns this codebase does not use).

**Data layer boundary**:
The rule that `packages/db` is pure persistence (no validation, no shaping) and `apps/api` owns validation (Zod) plus response shaping. `apps/api` never imports `prisma`; `packages/auth` keeps the raw client for the Better Auth adapter. See [ADR-0005](./docs/adr/0005-data-layer-boundary.md).

_Avoid_: "ORM layer", "data access layer" (overloaded).

**Raw row**:
A Prisma result returned unmodified by a CRUD method (Dates as `Date`, camelCase fields). The API maps raw rows into `@recetario/types` DTOs before responding.

_Avoid_: "model", "record" (ambiguous with schema).

## Billing & Stripe

**Stripe domain logic**:
Code in `packages/stripe` that talks to the Stripe API or owns subscription/plan domain rules: the `stripe` singleton, `listPrices()`, checkout/portal helpers, webhook signature verification, `TIER_CONFIG`, `buildPricingPlans`, feature-gating helpers (`hasFeature`, `isPro`, `isPaid`, `canCreateRecipe`, `canCreateIngredient`, `getRemaining*`), `getDefaultSubscription`, and `UserSubscription`/`PricingPlan` shaping.

**Stripe price sync**:
The process of reconciling `SubscriptionPlan` rows with Stripe's active prices. `packages/stripe` fetches (`listPrices`) and maps to a minimal `SyncPlanInput`; `packages/db` persists (`syncPlans`) with pure upsert+deactivate. The db package never imports `stripe`; the tier whitelist and `featuresJson` are produced by stripe, not db.

**Plans seed script**:
`packages/db/prisma/seed-plans.ts` — the one place the db package imports `@recetario/stripe`. It calls `listPrices()` then `syncPlans()` and is run as a command (dev) and in the API deploy workflow (prod), not at runtime. Contrast with `packages/db/prisma/seed.ts` (ingredients/recipes dev seed).

_Avoid_: "plan bootstrap", "runtime plan sync" (runtime auto-seed is removed).

**Plan persistence method**:
A CRUD method in `packages/db` that reads/writes `Subscription`/`SubscriptionPlan` rows (`getSubscriptionPlans`, `getSubscriptionByUserId`, `upsertSubscriptionPlan`, `upsertSubscription`, `updateSubscription`, `deactivatePlansNotIn`, `getStripeCustomerId`). Pure persistence, no Stripe API.

_Avoid_: "billing method" (the Stripe logic lives in `packages/stripe`).

## Auth

**Auth callback**:
A function KitchCalc provides to fill a slot in Better Auth's config (e.g., `sendResetPassword`, `sendVerificationEmail`). Better Auth calls the callback at the appropriate moment in the auth flow.

_Avoid_: "auth handler" (overloaded), "auth function" (too generic).

**Auth callback factory**:
A function that returns an auth callback. The factory takes the callback's external dependencies (`prisma`, `sendEmail`, env config) as parameters; the returned callback is the unit of work. The factory is the testability seam for I/O modules — tests inject mocks via the parameters.

**Auth config**:
The object returned by `initAuth()` in `packages/auth/src/auth.ts` — the Better Auth instance with all adapters, callbacks, and session settings wired in. After decomposition, this is a thin composition layer that imports pre-built callbacks from focused modules.

**Composition layer**:
A module whose only job is to wire together pre-built pieces. In `packages/auth/src/auth.ts`, the composition layer imports `prisma`, `sendEmail`, callback factories, and middleware, and assembles them into the Better Auth config.

**Token authority**:
The system that owns the password-reset token table and validation flow. In KitchCalc, the authority is the project's own `passwordResetToken` Prisma model and `validatePasswordResetToken` in `password-reset.ts` — Better Auth's `token` parameter is discarded. See [ADR-0001](./docs/adr/0001-password-reset-token-authority.md).

## Email

**Email transport**:
The boundary that sends email — `sendEmail` in `packages/auth/src/email.ts`. Callers provide `to`, `subject`, `html`; the transport handles the actual dispatch (Resend API in production, console-log stub otherwise).

**Email template**:
A pure function that renders the HTML body of an email (e.g., `getResetPasswordEmailHtml` in `password-reset.ts`). Takes data, returns a string. No I/O.

_Avoid_: "email body" (overloaded), "email renderer" (less precise).

## CI/CD

**CI workflow**:
`ci.yml` — runs on every PR. Executes lint, type-check, test, and build in parallel (`fail-fast: false`) filtered through Turborepo to only affected workspaces. Does not deploy.

_Avoid_: "PR checks" (less precise), "pipeline" (overloaded).

**CD workflow**:
Per-app deploy workflows: `deploy-web.yml` (Cloudflare Pages, `wrangler pages deploy`) and `deploy-api.yml` (Cloudflare Worker, `wrangler deploy`). Triggered on push to `dev` (staging) or `master` (production). Each workflow runs Prisma migrations and a Turborepo-scoped build before deploying.

_Avoid_: "release pipeline" (overloaded), "deploy pipeline" (ambiguous).

**GitHub Environment**:
`staging` and `production` — GitHub-native environments that gate which branch can deploy where. `dev` → `staging`, `master` → `production`. Production can require manual approval. See [ADR-0003](./docs/adr/0003-github-actions-workflow-structure.md).

_Avoid_: "target", "stage" (ambiguous).

**Runtime secret**:
A secret consumed by the application at runtime (DATABASE_URL, STRIPE_SECRET_KEY, GOOGLE_CLIENT_ID, etc.). The canonical source of truth is Cloudflare — secrets are set via `wrangler secret put` / `wrangler pages secret put` and never stored in GitHub. Rotated by running the secrets sync script.

_Contrast with_: CI secret (next).

**CI secret**:
A secret needed by GitHub Actions to authenticate with Cloudflare during deploy: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The only secrets that live in GitHub Environments. The CI never sees runtime secrets.

_Contrast with_: Runtime secret (previous).

**Secrets sync script**:
`scripts/sync-cloudflare-secrets.mjs` — a manual script that reads `.env.cloudflare` (not commited) and `scripts/secrets-map.json` (committed) and executes `wrangler secret put` / `wrangler pages secret put` for every runtime secret across both environments. Supports `--env staging|production` and `--only=X,Y` for targeted rotation. Not run by CI.

**Secrets map**:
`scripts/secrets-map.json` — committed declarative mapping of which runtime secrets go to which Cloudflare product (`workers`, `pages`, `both`) and how our canonical environment names (`staging`, `production`) translate to Cloudflare-native names (Workers: `--env development`/`production`, Pages: `--branch dev`/`master`).

_See also_: [ADR-0004](./docs/adr/0004-secrets-propagation-strategy.md).

## Navigation

**Soft navigation**:
An in-app page change that keeps the app shell mounted and swaps main content after the next page is ready. Distinct from a full browser load.

_Avoid_: "SPA navigation" (implies a client-owned shell we do not have), "page transition" (ambiguous with animation only).

**Navigation pending feedback**:
The immediate proof that a soft-navigation click registered: a top progress bar plus a generic main-content skeleton, shown with no delay gate. Last click wins if the user picks another target mid-load.

_Avoid_: "loading state" (too generic), "page loader" / "full-page overlay" (reserved for heavier flows).

**Mutation pending feedback**:
The immediate proof that a save/delete/duplicate (or similar submit) registered. Inline saves keep the form visible with a busy control; redirect-heavy actions may use a blocking overlay.

_Avoid_: "navigation pending feedback" (GET page changes only), "disabled form" (too narrow).

**Navigation soft fail**:
When a soft navigation fails for a non-auth reason, pending UI clears, the user stays on the current page, and an error is shown.

_Contrast with_: Session-expired redirect (next).

**Session-expired redirect**:
When a soft navigation (or equivalent request) fails because the session is invalid or expired, the user is sent to sign-in with a visible banner explaining why.

_Avoid_: "soft fail" (stays on page), "silent re-auth".
