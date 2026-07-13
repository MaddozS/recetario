# Task: Remove dotenv from packages (billing, db, auth)

## Assigned Agent
kitchcalc-builder

## Context Received
- Analysis: `docs/analysis/analysis-20260702-billing-dotenv-fix.md`
- State: `docs/tasks/task-20260702-closer-fixes-state.json`

## Skills
Selected:
- `ponytail` — minimal fix, delete over add
- `monorepo-practices` — understand workspace package wiring for SSR build

Discarded:
- `security-best-practices` — no auth changes
- `stripe-best-practices` — no Stripe API changes, only env loading removal

May load if needed:
- none

## Scope
Editable files:
- `packages/billing/src/stripe.ts` — remove dotenv import + config loop
- `packages/billing/package.json` — remove dotenv dependency
- `packages/db/src/prisma.ts` — remove dotenv import + config loop
- `packages/db/package.json` — remove dotenv dependency
- `packages/auth/src/auth.ts` — remove `import "dotenv/config"` side-effect import

Forbidden files:
- `prisma/seed.ts`, `prisma/seed-fixed-costs.ts`, `prisma/fix-sequences.ts` — these run via tsx directly, keep their dotenv imports
- Everything else

## Instructions

### Background
Astro (via Vite) automatically loads `.env` files from the project root in development. In production (Vercel), env vars are set via Vercel dashboard. The `dotenv.config()` calls in these packages are **redundant** and break the SSR build because Vite tries to bundle `dotenv` which uses Node builtins (`node:path`, `node:os`, `node:crypto`).

### Changes

**1. `packages/billing/src/stripe.ts`**
Remove the dotenv import and config loop (approx lines 1-15). Keep the Stripe init (line ~17+). Stripe will read `process.env.STRIPE_SECRET_KEY` directly.

**2. `packages/billing/package.json`**
Remove `"dotenv": "17.4.2"` from `dependencies`.

**3. `packages/db/src/prisma.ts`**
Remove the dotenv import and config loop. Prisma already reads `DATABASE_URL` from `process.env`.

**4. `packages/db/package.json`**
Remove `"dotenv": "17.4.2"` from `dependencies`.

**5. `packages/auth/src/auth.ts`**
Remove `import "dotenv/config"` (the side-effect import). Better Auth config reads env vars from `process.env` directly.

### Verify
```bash
pnpm install
pnpm turbo run build --filter=@recetario/billing --filter=@recetario/db --filter=@recetario/auth
pnpm build  # full project build
```

## Acceptance Criteria
- `pnpm build` completes without `__vite-browser-external` / `fileURLToPath` errors
- Packages compile successfully
- `pnpm astro check` passes
- Seed scripts still work (unchanged, have their own dotenv imports)

## Reporting
Write report to: `docs/tasks/task-20260702-closer-fixes-builder-dotenv-report.md`
Return only: done <path>
