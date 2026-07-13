# Cloudflare deployment

This monorepo is configured for:

- `apps/web`: Astro SSR on Cloudflare Workers.
- `apps/api`: Hono on Cloudflare Workers.
- `packages/db`: Prisma schema and generated client.

D1 is not configured in this migration. Prisma continues to use PostgreSQL / Prisma Postgres through `DATABASE_URL`.

## Required environment

Use Cloudflare secrets for sensitive values:

```bash
pnpm --filter @recetario/web exec wrangler secret put DATABASE_URL
pnpm --filter @recetario/web exec wrangler secret put BETTER_AUTH_SECRET
pnpm --filter @recetario/web exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm --filter @recetario/web exec wrangler secret put STRIPE_SECRET_KEY
pnpm --filter @recetario/web exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

Use Cloudflare plain variables for non-sensitive values:

- `PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `RECIPES_STATIC_OWNER_EMAIL`
- `RECIPES_STATIC_OWNER_ID` when static seed ownership is required.

Configure the API worker with the same secrets for the routes it owns:

```bash
pnpm --filter @recetario/api exec wrangler secret put DATABASE_URL
pnpm --filter @recetario/api exec wrangler secret put BETTER_AUTH_SECRET
pnpm --filter @recetario/api exec wrangler secret put GOOGLE_CLIENT_SECRET
pnpm --filter @recetario/api exec wrangler secret put STRIPE_SECRET_KEY
pnpm --filter @recetario/api exec wrangler secret put STRIPE_WEBHOOK_SECRET
```

Configure these same non-sensitive auth/app variables for the API worker:

- `PUBLIC_APP_URL`
- `BETTER_AUTH_URL`
- `GOOGLE_CLIENT_ID`
- `RECIPES_STATIC_OWNER_EMAIL`
- `RECIPES_STATIC_OWNER_ID` when static seed ownership is required.

## Validate locally

`pnpm dev` first syncs the root `.env` file into ignored Cloudflare local files at `apps/web/.dev.vars` and `apps/api/.dev.vars`, then starts both workers through Turbo. Astro proxies `/api/*` to the API worker at `http://127.0.0.1:8787`; override that with `API_DEV_ORIGIN` in `.env` if needed.

```bash
pnpm exec turbo run type-check --filter=@recetario/api
pnpm exec turbo run build --filter=@recetario/api
pnpm exec turbo run build --filter=@recetario/web
```

## Deploy

Run database migrations before deploying workers:

```bash
pnpm --filter @recetario/db exec prisma migrate deploy
pnpm --filter @recetario/web exec wrangler deploy
pnpm --filter @recetario/api exec wrangler deploy
```

Route production traffic so the API worker receives `/api/*` and the web worker receives the rest of the site. The exact route depends on the final domain, but the intended split is:

| Route    | Worker          |
| -------- | --------------- |
| `/api/*` | `recetario-api` |
| `/*`     | `recetario-web` |

## Notes

- Both workers enable `nodejs_compat` so Prisma and existing Node-oriented packages can run in the Workers runtime.
- `apps/web/wrangler.jsonc` intentionally keeps only non-secret defaults. Configure production URLs and OAuth IDs in the Cloudflare dashboard or with Wrangler.
- `apps/api` exposes `GET /health` plus auth, account, and Stripe routes under `/api/*`.
- Astro no longer owns API routes. Production Cloudflare routing must send `/api/*` to `recetario-api`.
