# `@recetario/db` — Database layer

Prisma ORM wrapper for Prisma Postgres. Provides the Prisma client singleton and the database query helpers used across KitchCalc.

## What's inside

- `prisma` — lazy proxy over a per-request PrismaClient (Prisma Postgres over TCP, `@prisma/adapter-pg`)
- `withPrismaContext(fn)` — creates the request's client and runs `fn` inside its `AsyncLocalStorage` store
- `logAuditEvent` — audit-log insert for sign-in events and sensitive actions
- Query helpers for ingredients, recipes, presentations, user preferences, and billing (legacy — most billing moved to `@recetario/stripe`)

## Usage

```ts
import { prisma } from "@recetario/db";

const recipes = await prisma.recipe.findMany({
  where: { ownerId: user.id },
});
```

## Caching

There is **no query caching**. A client is created per request (workerd binds TCP sockets to the request that opened them) and every read reaches the database.

`getSubscriptionByUserId` backs the subscription shown on every authenticated page and is deliberately **uncached** — a stale entitlement after a plan change is worse than a cheap indexed query. `getUserPreferences` and `getCredentialAccount` used to be cached at the edge through Accelerate; that cache disappeared with Accelerate's retirement and is not replaced (see `docs/adr/0010-sin-accelerate-prisma-postgres-directo.md`).

## Generated clients

Two builds, both **not** committed:

- `prisma/generated/` — worker build (`runtime = "cloudflare"`), what the singleton imports
- `prisma/generated-node/` — Node build for seeds and one-off scripts

Regenerate with `pnpm --filter @recetario/db exec prisma generate`.

## Peer dependencies

- `@prisma/client`, `@prisma/adapter-pg`, `pg` — runtime (worker) and Node scripts

## Cloudflare Workers

`DATABASE_URL` must be the **direct** Prisma Postgres connection string (`postgres://…@db.prisma.io:5432/postgres?sslmode=require`), never an Accelerate `prisma+postgres://` URL: a driver adapter rejects it. `nodejs_compat` is required for the TCP sockets, and the client is built per request — workerd binds socket I/O to the request that opened it, so a module-scope client hangs. Keep the value as a Worker secret, not a committed `vars` value.
