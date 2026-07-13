# Cloudflare monorepo review

## Skills Used

- `monorepo-practices`
- `graphify`
- `ponytail`
- `prisma-client-api`
- `better-auth-best-practices`

## Current State

The repository was already partially migrated to a monorepo:

- `apps/web` contains the Astro app.
- `packages/db` contains the Prisma schema, generated client, and database singleton.
- `packages/auth`, `packages/billing`, `packages/ui`, `packages/config`, and `packages/types` already exist as workspace packages.
- `apps/api` did not exist before this pass.

The web app was still configured for Vercel through `@astrojs/vercel`. The database package already targets PostgreSQL through Prisma, `@prisma/adapter-pg`, and `pg.Pool`.

## Implemented Architecture

| Area             | Decision                                                  | Status      |
| ---------------- | --------------------------------------------------------- | ----------- |
| Web app          | Astro SSR on Cloudflare Workers via `@astrojs/cloudflare` | implemented |
| API app          | Hono Cloudflare Worker in `apps/api`                      | implemented |
| Database package | Existing `packages/db` remains the Prisma owner           | preserved   |
| Database target  | PostgreSQL / Prisma Postgres via Prisma                   | preserved   |
| D1               | Not enabled and not configured                            | out of scope |
| Deployment       | Wrangler configs for web and API                          | implemented |

## D1 Decision

The current Prisma schema uses PostgreSQL. D1 is SQLite-compatible, so it is not a drop-in target for the current schema, migrations, and generated Prisma client.

D1 is intentionally not activated or configured in this migration. The persistence target remains Prisma with PostgreSQL / Prisma Postgres.

## Cloudflare Readiness

The frontend now uses the Cloudflare adapter and has a deployable `wrangler.jsonc`.

The API worker has:

- `apps/api/src/index.ts`
- `apps/api/wrangler.jsonc`
- `apps/api/tsconfig.json`
- `apps/api/package.json`
- `GET /health`
- Auth routes under `/api/auth/*`
- Account routes under `/api/account/*`
- Stripe routes under `/api/stripe/*`

Wrangler dry-runs pass for both workers. The API worker dry-run was regenerated after the `import.meta.url` bundling fix; the web worker dry-run uses the current worker config and the latest available `dist`.

## Remaining Migration Work

The Hono API now implements the current API route surface. The duplicate Astro API files were removed from `apps/web/src/pages/api`, and local Astro dev proxies `/api/*` to the API worker.

Recommended next migration order:

1. Configure Cloudflare route precedence: `/api/*` to `recetario-api`, everything else to `recetario-web`.
2. Smoke-test Better Auth, account forms, Stripe checkout, customer portal, and Stripe webhook against the deployed API worker.
3. Add CI deploy steps once the Cloudflare account/project names are finalized.

## Operational Notes

- Production secrets must be configured in Cloudflare, not committed in `wrangler.jsonc`.
- Run Prisma migrations before deploying workers.
- Both workers use `nodejs_compat`; this is required for the current Prisma/Node-oriented runtime assumptions.
- The API worker defines `import.meta.url` during bundling so Wrangler's Node compatibility shims that call `fileURLToPath(import.meta.url)` have a stable module URL in Workers.
- Astro's Cloudflare build emits generated bindings for `SESSION`, `IMAGES`, and `ASSETS`.
- `workerd` is now allowed in `pnpm-workspace.yaml` because Wrangler depends on it.
- The API worker dry-run upload is about `7866 KiB` uncompressed / `2216 KiB` gzip. Keep an eye on worker size if more server packages are added.
- The web worker no longer bundles `/api` routes; it relies on Cloudflare routing in production and Vite proxying in local dev.

## Validation Performed

Commands that passed before the current shell started blocking `pnpm exec` behind a non-TTY dependency purge:

```bash
pnpm exec turbo run type-check --filter=@recetario/api
pnpm exec turbo run build --filter=@recetario/api
pnpm --filter @recetario/api exec wrangler deploy --dry-run --outdir /private/tmp/recetario-api-bundle-server-auth
pnpm --filter @recetario/web exec wrangler deploy --dry-run --outdir /private/tmp/recetario-web-bundle-current
```

The generated API bundle was inspected and no longer contains the failing `fileURLToPath(import.meta.url)` banner; it now uses `fileURLToPath("file:///worker/index.js")`. It also no longer bundles the browser auth client or `import.meta.env`.

The final local recheck used the already-installed `tsc` and `wrangler` binaries directly because `pnpm@11.1.2` attempted to purge `node_modules` in the current non-TTY shell before executing package scripts. The non-destructive checks passed:

```bash
node_modules/.bin/tsc --build packages/auth/tsconfig.build.json
node_modules/.bin/tsc --noEmit --project apps/api/tsconfig.json
../../node_modules/.bin/wrangler deploy --dry-run --outdir /private/tmp/recetario-api-bundle-final
../../node_modules/.bin/wrangler deploy --dry-run --outdir /private/tmp/recetario-web-bundle-final
```

Commands blocked by the local sandbox:

```bash
pnpm exec turbo run build --filter=@recetario/web
pnpm --filter @recetario/api exec wrangler dev
```

Both failed because Cloudflare tooling attempted to bind local inspector ports inside the sandbox. A prior elevated web build completed after `/api` routes were removed from Astro; the current web dry-run confirms the deployable artifact no longer includes Astro API route chunks.

## Known Follow-Ups

- Verify deployed API routing against the final Cloudflare domain.
- Add CI commands for `type-check`, build, Prisma migration deploy, and Wrangler deploy once the Cloudflare account/project names are finalized.
