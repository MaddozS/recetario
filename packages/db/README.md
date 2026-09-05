# `@recetario/db` — Database layer

Prisma ORM wrapper for PostgreSQL (via Accelerate). Provides the Prisma client singleton, database query helpers, and Accelerate edge-cache invalidation used across KitchCalc.

## What's inside

- `prisma` — singleton PrismaClient with `@prisma/extension-accelerate` (`accelerateUrl`)
- `invalidateAccelerateCache(tags)` — best-effort Accelerate edge-cache invalidation by tag
- `logAuditEvent` — audit-log insert for sign-in events and sensitive actions
- Query helpers for ingredients, recipes, presentations, user preferences, and billing (legacy — most billing moved to `@recetario/stripe`)

## Usage

```ts
import { prisma, invalidateAccelerateCache } from "@recetario/db";

const recipes = await prisma.recipe.findMany({
  where: { ownerId: user.id },
});
```

## Caching

`getUserPreferences` and `getCredentialAccount` (session-path reads) set `cacheStrategy: { ttl: 60, swr: 120, tags: ["user:<id>"] }` so Accelerate serves the edge cache. Write helpers that mutate those rows call `invalidateAccelerateCache(["user:<id>"])` so the next read is fresh (best-effort; failures are logged).

`getSubscriptionByUserId` is **not cached**: it backs the subscription shown on every authenticated page, and a stale entitlement after a plan change is worse than a cheap indexed query.

## Generated client

The Prisma client is generated to `packages/db/generated/prisma/`. It is **not** committed — run `pnpm --filter @recetario/db exec prisma generate` to regenerate.

## Peer dependencies

- `@prisma/client`, `@prisma/adapter-pg`, `pg`

## Cloudflare Workers

Workers must enable `nodejs_compat` and use a compatibility date on or after `2024-09-23` so Cloudflare enables the Node.js APIs used by Prisma and `pg`. Keep `DATABASE_URL` as a Worker secret, not a committed `vars` value.
