# `@recetario/db` — Database layer

Prisma ORM wrapper for Prisma Postgres. Provides the Prisma client singleton and the database query helpers used across KitchCalc.

## What's inside

- `prisma` — singleton PrismaClient over the Prisma Postgres serverless driver (`@prisma/adapter-ppg`)
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

There is **no query caching**. The client is created once per isolate and every read reaches the database.

`getSubscriptionByUserId` backs the subscription shown on every authenticated page and is deliberately **uncached** — a stale entitlement after a plan change is worse than a cheap indexed query. `getUserPreferences` and `getCredentialAccount` used to be cached at the edge through Accelerate; that cache disappeared with Accelerate's retirement and is not replaced (see `docs/adr/0010-sin-accelerate-prisma-postgres-directo.md`).

## Generated clients

Two builds, both **not** committed:

- `prisma/generated/` — worker build (`runtime = "cloudflare"`), what the singleton imports
- `prisma/generated-node/` — Node build for seeds and one-off scripts

Regenerate with `pnpm --filter @recetario/db exec prisma generate`.

## Peer dependencies

- `@prisma/client`, `@prisma/adapter-ppg` — runtime (worker)
- `@prisma/adapter-pg`, `pg` — Node scripts and seeds

## Cloudflare Workers

`DATABASE_URL` must be the **direct** Prisma Postgres connection string (`postgres://…@db.prisma.io:5432/postgres?sslmode=require`), never an Accelerate `prisma+postgres://` URL: the serverless driver uses it as a credential and speaks HTTP/WebSocket, so no TCP connection is opened and no compatibility flag is needed for the database. Keep it as a Worker secret, not a committed `vars` value.
