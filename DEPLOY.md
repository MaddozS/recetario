# Deploy — Cloudflare

KitchCalc runs on two Cloudflare Workers (web on Pages, api on Workers) backed by Prisma Postgres.

| Worker | Type | URL |
|---|---|---|
| `recetario-web` | Astro SSR via `@astrojs/cloudflare` | `https://recetario-web.axel-ana25.workers.dev` |
| `recetario-api` | Hono on Workers | `https://recetario-api.axel-ana25.workers.dev` |
| Database | Prisma Postgres (free tier) | via `DATABASE_URL` |

## Prerequisites

- Node `>= 22.23.1`, pnpm `11.1.2` (locked via `packageManager` field)
- `pnpm install` — auto-runs `prisma generate` via `apps/web` postinstall
- `pnpm dlx wrangler@4 login` — OAuth token stored at `~/.wrangler/config/default.toml`
- Account ID: `5f065700ca8d436da492ff3b73d0cc05`
- Stripe account (for billing), Google OAuth credentials, Resend API key (for password reset emails)

## First-time setup

### 1. Create the Prisma Postgres database

Use Prisma Console or the `prisma-postgres-setup` skill to provision a free-tier DB. Save the connection string — it will become `DATABASE_URL` for both workers.

### 2. Set up environment variables

Edit `.env` at the repo root with the production values:

```bash
DATABASE_URL="postgres://..."            # Prisma Postgres connection string
BETTER_AUTH_SECRET="..."                 # openssl rand -base64 32
GOOGLE_CLIENT_ID="..."                   # Google OAuth client
GOOGLE_CLIENT_SECRET="..."               # Google OAuth secret
RECIPES_STATIC_OWNER_ID="..."            # seed user id (any UUID)
RECIPES_STATIC_OWNER_EMAIL="..."         # seed user email
STRIPE_SECRET_KEY="sk_..."               # Stripe secret
STRIPE_WEBHOOK_SECRET="whsec_..."        # Stripe webhook signing
STRIPE_PRICE_ID_BASIC_MONTHLY="price_..."
STRIPE_PRICE_ID_BASIC_YEARLY="price_..."
STRIPE_PRICE_ID_PRO_MONTHLY="price_..."
STRIPE_PRICE_ID_PRO_YEARLY="price_..."
```

`pnpm dev` reads these locally. Production secrets are uploaded to Cloudflare separately (below).

### 3. Run migrations

```bash
pnpm --filter @recetario/db exec prisma migrate deploy
```

7 migrations ship under `packages/db/prisma/migrations/`. After the first deploy the api worker can also run migrations via its own Prisma client.

### 4. Provision the KV namespace (web session storage)

`@astrojs/cloudflare` requires a KV binding named `SESSION`. Create it once:

```bash
cd apps/web
pnpm exec wrangler kv namespace create SESSION
```

Wrangler prints `{ "id": "..." }`. Copy the `id` into `apps/web/wrangler.jsonc` under `kv_namespaces[].id` (the existing entry is `recetario-web-session` / `10323f891e024ef0ad89099b717c2c79`).

### 5. Push secrets to Cloudflare

The repo ships `scripts/setup-cloudflare-secrets.mjs` which reads `.env` and writes two JSON files for `wrangler secret bulk`:

```bash
# Set PRISMA_URL_OVERRIDE so the script doesn't pick up localhost DATABASE_URL
PRISMA_URL_OVERRIDE='<prod database url>' pnpm exec node scripts/setup-cloudflare-secrets.mjs
cd apps/web && pnpm exec wrangler secret bulk /tmp/web-secrets.json
cd apps/api && pnpm exec wrangler secret bulk /tmp/api-secrets.json
```

Web needs 14 secrets, api needs 4 (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`). The script validates all values present before writing.

To rotate a single secret:

```bash
cd apps/web && pnpm exec wrangler secret put STRIPE_SECRET_KEY
```

## Daily deploy

Both workers build from source via Wrangler. From the repo root:

```bash
# Build the @recetario/db package first (tsc emits dist/* from generated/prisma/*)
pnpm --filter @recetario/db build

# Deploy the api (no build step — wrangler bundles src/index.ts directly)
pnpm --filter @recetario/api exec wrangler deploy

# Deploy the web (builds via astro, then uploads server worker and client assets via wrangler)
pnpm --filter @recetario/web exec wrangler deploy
```

Or via the root scripts:

```bash
pnpm deploy:api
pnpm --filter @recetario/db build && pnpm deploy:web
```

The first deploy of `@recetario/web` may need a one-time `wrangler pages project create recetario-web` if Wrangler prompts for it.

## Why the web bundle needs the wasm-base64 stub

Switching `@recetario/db` to `runtime = "workerd"` (required for Cloudflare) bloats the bundle from ~2.4 MB to ~3.7 MB gzipped because the workerd Prisma build ships **two** query-compiler copies:

- `dist/server/_astro/query_compiler_fast_bg.<hash>.wasm` — 1.2 MB gzipped, used at runtime in workerd
- `dist/server/chunks/query_compiler_fast_bg.postgresql.wasm-base64_<hash>.mjs` — 1.7 MB gzipped, dead weight, used in Node.js only

Vite/esbuild can't tree-shake the base64 file because it's behind the `@prisma/client` package's `"./*": "./*"` wildcard export, so it ends up reachable through some indirect dynamic import.

The fix is a Vite `resolve.alias` that stubs the base64 module with an empty export. See `apps/web/astro.config.mjs` and `apps/web/src/lib/empty-wasm-base64.mjs`. Without the stub the bundle exceeds the 3 MB Workers free-plan limit and deploy fails.

**Do not remove the alias** without verifying the bundle stays under 3 MB gzipped:

```bash
cd apps/web && pnpm exec astro build
cd dist && find . -type f \( -name "*.mjs" -o -name "*.js" -o -name "*.wasm" \) -exec gzip -c {} \; | wc -c
```

If it spikes past 3 MB again, the only clean fix is upgrading to the Workers Paid plan ($5/mo, 10 MB limit). One-click in the dashboard; no code change.

## Local development

```bash
# Start both workers
pnpm dev

# Or individually
pnpm dev:web   # http://localhost:4321
pnpm dev:api   # http://localhost:8787
```

`scripts/sync-cloudflare-dev-vars.mjs` syncs `.env` to each app's `.dev.vars` so Wrangler picks them up locally. Don't commit `.dev.vars`.

For Prisma: edit `packages/db/prisma/schema.prisma`, then:

```bash
pnpm --filter @recetario/db exec prisma migrate dev --name <descriptive>
pnpm --filter @recetario/db build
```

## Observability

Both workers have `observability.enabled: true` in their `wrangler.jsonc`. Live tail:

```bash
cd apps/web && pnpm exec wrangler tail
cd apps/api && pnpm exec wrangler tail
```

Logs are also available in the Cloudflare dashboard under Workers → Logs.

## Stripe webhooks

Point the Stripe dashboard webhook to:

```
https://recetario-api.axel-ana25.workers.dev/api/stripe/webhook
```

Events handled (see `apps/api/src/index.ts`): `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`. The webhook verifies the `Stripe-Signature` header against `STRIPE_WEBHOOK_SECRET`.

## Common operations

```bash
# List versions of a worker
cd apps/web && pnpm exec wrangler versions list

# Roll back to the previous version
cd apps/web && pnpm exec wrangler rollback

# Inspect KV
pnpm exec wrangler kv namespace list
pnpm exec wrangler kv key list --namespace-id <id>

# Run the seed
pnpm --filter @recetario/db exec tsx prisma/seed.ts
```

## Known deploy-time pitfalls

- **`SESSION bindings must have an "id" field`** — KV id is missing from `wrangler.jsonc`. Get it from `wrangler kv namespace list` and paste it under `kv_namespaces[].id`.
- **`import.meta.url` is undefined in workerd** — the pre-workerd compiled `dist/` of `@recetario/db` crashes with `TypeError: The "path" argument must be of type string`. Always run `pnpm --filter @recetario/db build` after regenerating the Prisma client. The api worker sidesteps this with `define: { "import.meta.url": '"file:///worker/index.js"' }` in its `wrangler.jsonc`.
- **Bundle > 3 MB gzipped** — see the wasm-base64 stub section above.
- **`pnpm exec` strips env vars** — when running `prisma migrate deploy` against the prod DB, invoke the binary directly: `DATABASE_URL=... packages/db/node_modules/.bin/prisma migrate deploy`.
- **Stale `dist/`** — generated Prisma client under `packages/db/generated/prisma/*.ts` is the source of truth; `dist/generated/prisma/*.js` is what `@recetario/web` actually imports. Rebuild `dist` after every `prisma generate`.
