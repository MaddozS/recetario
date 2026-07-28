# KitchCalc Context

Project-specific terminology for the KitchCalc monorepo (Recetario).

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
