# Prisma Postgres is reached directly with the serverless driver, not through Accelerate

`packages/db` builds its Prisma client with `@prisma/adapter-ppg` over a direct Prisma Postgres connection string. Accelerate — the extension, the edge query cache and the cache-invalidation API — is gone from the codebase.

## Context

Every database access went through Accelerate: `DATABASE_URL` was a `prisma+postgres://` URL, the client was extended with `withAccelerate()`, two session-path reads used `cacheStrategy` (`ttl: 60`, `swr: 120`), and eight write paths invalidated those tags through `$accelerate.invalidate`.

Two things forced the move:

- **Retirement.** Accelerate stops serving requests on **December 1, 2026**: "Database requests sent through an Accelerate connection URL will fail." The replacement connection paths do not include query caching, and Prisma's migration guidance is explicit about removing `cacheStrategy` and the other Accelerate caching APIs.
- **A P6003 hold.** The invalidation endpoint began returning `400 {"code":"P6003","message":"There is a hold on your account. Reason: planLimitReached."}` while the dashboard showed ~3% of the included operations consumed. The hold was scoped to the cache API — plain queries and cached reads kept working — but it left the log noisy and the two cached reads serving stale data for up to ~5 minutes at a time.

## Decision

The worker builds its client with the Prisma Postgres serverless driver:

```ts
new PrismaClient({ adapter: new PrismaPostgresAdapter({ connectionString }) })
```

`DATABASE_URL` keeps its name and becomes the **direct** connection string (`postgres://…@db.prisma.io:5432/postgres?sslmode=require`). The driver uses that value as a credential and communicates over HTTP and WebSockets, so no TCP connection is opened. Node scripts and seeds use `@prisma/adapter-pg` (or raw `pg`) with the same value.

The client lifecycle does not change: one lazily-created singleton per isolate, shared by `packages/db` and Better Auth's `prismaAdapter`.

Caching is not replaced. `getUserPreferences` and `getCredentialAccount` become plain indexed reads; `getSubscriptionByUserId` was already uncached on purpose.

## Considered Options

- **`@prisma/adapter-pg` + `pg` inside the worker** (what Prisma's Cloudflare Workers guide documents, over `nodejs_compat`): rejected. In edge runtimes that path requires a **new `PrismaClient` per request**, because the client owns a pool of TCP sockets and workerd ties that I/O to the request that opened it. Adopting it would mean threading a client through every CRUD helper in `@recetario/db` and rebuilding Better Auth's adapter per request — a large refactor that buys nothing over the HTTP driver. Prisma's own recommendation for TCP-constrained runtimes is the serverless driver.
- **Stay on Accelerate until retirement**: rejected. It is a hard deadline, the caching APIs have to be removed either way, and this removes the failing dependency now instead of in December.
- **Replace the cache with another layer** (Cloudflare KV, Upstash): out of scope. The two reads that used the edge cache are indexed lookups, and a new cache would need its own key convention and invalidation story (see `apps/api/README.md` §Caching).

## Consequences

- `DATABASE_URL` must be the direct connection string in every environment: root `.env`, `.env.cloudflare` (pushed with `scripts/sync-cloudflare-secrets.mjs`) and the GitHub environment secrets used by `deploy.yml`. Handing a `prisma+postgres://` URL to a driver adapter fails.
- No query caching: every read reaches the database. The measured cost is +2 operations per authenticated request, on a 200k/month quota that sat at ~3%.
- Rollback before December 1, 2026 is a value change plus reverting the commit that introduced the adapter; after that date Accelerate no longer answers.
- The Node scripts no longer derive a direct URL from the Accelerate credential: the `getDirectUrl` hack in `prisma/seed.ts` is gone.
