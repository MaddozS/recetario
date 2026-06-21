# `@recetario/db` — Database layer

Prisma ORM wrapper for PostgreSQL. Provides the Prisma client singleton, database query helpers, and cache primitives used across KitchCalc.

## What's inside

- `prisma` — singleton PrismaClient with `@prisma/adapter-pg` (pg.Pool max 3, 30s idle)
- `cacheGet / cacheSet` — simple subscription-cache using `globalThis.__RECETARIO_CACHE`
- `logAuditEvent` — audit-log insert for sign-in events and sensitive actions
- Query helpers for ingredients, recipes, presentations, user preferences, and billing (legacy — most billing moved to `@recetario/billing`)

## Usage

```ts
import { prisma, cacheGet, cacheSet } from "@recetario/db";

const recipes = await prisma.recipe.findMany({
  where: { ownerId: user.id },
});
```

## Generated client

The Prisma client is generated to `packages/db/generated/prisma/`. It is **not** committed — run `pnpm --filter @recetario/db exec prisma generate` to regenerate.

## Peer dependencies

- `@prisma/client`, `@prisma/adapter-pg`, `pg`
- `dotenv` (loaded at import time via `import "dotenv/config"`)
