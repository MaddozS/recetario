# Explore Report: analysis-20260702-billing-dotenv-fix

## Task Question

Fix the `pnpm build` failure: `"fileURLToPath" is not exported by "__vite-browser-external"` caused by `dotenv` usage in `packages/billing/src/stripe.ts` when Vite bundles the pre-compiled billing package during Astro SSR build.

## Context Received

- State: dirty working tree on `main` (or feature branch — current HEAD `2f114e6`)
- Spec/plan: none
- User request summary: Pre-compiled billing package (`packages/billing/dist/stripe.js`) uses `dotenv.config()`, which pulls in Node builtins (`node:path`, `node:os`, `node:crypto`) that Vite's SSR bundler can't resolve.

## Skills Used

Selected:
- `graphify` — architecture exploration across packages
- `ponytail` — minimal fix guidance
- `monorepo-practices` — understand workspace package wiring and SSR build patterns

Discarded:
- `diagnose` — not a regression that needs the debug protocol; root cause is evident
- `stripe-best-practices` — no Stripe API issue, only env loading

Added During Execution:
- None

## Memory Context Used

None — first time exploring this issue.

## Graphify Status

not-useful — the graphify-out/ graph does not exist in this repo (no prior graph build). Used direct file reads.

## Graphify Queries

N/A — graph.json does not exist.

## Fallback Searches

| Search | Purpose | Result Summary |
|--------|---------|----------------|
| `grep dotenv.config *.ts` | Find all dotenv usage across repo | 2 matches: `packages/billing/src/stripe.ts:14`, `packages/db/src/prisma.ts:16` |
| `grep @recetario/billing apps/web/*.{ts,json,mjs}` | How billing is consumed | 8 matches — middleware, 3 Stripe API routes, package.json dep |
| `grep dotenv apps/web/` | Does web app have dotenv? | Yes — `apps/web/package.json` has `"dotenv": "17.4.2"` |
| `grep "import.*dotenv\|process.env\.(STRIPE\|DATABASE\|AUTH\|RESEND)" packages/` | Env var usage across packages | 18 matches across billing, auth, db |
| `grep "external\|ssrExternal\|ssr.external" apps/web/*.{ts,mjs}` | Vite externalization config | No existing Vite SSR external config |

## Files Read

| File | Reason | Fact Learned |
|------|--------|--------------|
| `packages/billing/src/stripe.ts` | Find dotenv usage | Has `import dotenv from "dotenv"` + `dotenv.config()` loop over 4 paths at module scope. Stripe initialized from `process.env.STRIPE_SECRET_KEY`. |
| `packages/billing/package.json` | Check build config + deps | Build: `tsc --build tsconfig.build.json`. Deps include `"dotenv": "17.4.2"`. Exports point to `dist/`. |
| `packages/billing/tsconfig.json` | Compilation settings | `module: "ESNext"`, `moduleResolution: "bundler"`, `outDir: "./dist"` |
| `packages/billing/tsconfig.build.json` | Build-specific config | Same as tsconfig.json, adds `ignoreDeprecations: "6.0"` |
| `packages/billing/dist/stripe.js` | Compiled output | Compiled JS has the same `dotenv.config()` loop — this is what Vite processes |
| `packages/billing/src/index.ts` | Package exports | Re-exports `stripe` from `stripe.js` |
| `packages/db/src/prisma.ts` | Compare pattern | Same `dotenv.config()` loop pattern — has same build risk |
| `packages/db/package.json` | Compare deps | Also has `"dotenv": "17.4.2"` dep |
| `apps/web/astro.config.mjs` | Vite/Astro config | No `ssr.external` config. No explicit dotenv loading. |
| `apps/web/package.json` | Web deps | Has `"dotenv": "17.4.2"` as dependency |
| `apps/web/src/middleware.ts` | How billing is consumed | Imports `getUserSubscription`, `resolveSubscription`, `seedSubscriptionPlans` from billing — triggers loading of `stripe.ts` |
| `apps/web/src/pages/api/stripe/webhook.ts` | How env vars are used | Uses `import.meta.env.STRIPE_WEBHOOK_SECRET` (Astro built-in env) |

## Key Findings

### 1. Root cause

`packages/billing/src/stripe.ts` imports `dotenv` and runs `dotenv.config()` at **module scope**:

```ts
import dotenv from "dotenv";
// ... loop over 4 paths, dotenv.config({ path, quiet: true })
const STRIPE_SECRET = process.env.STRIPE_SECRET_KEY || "";
export const stripe = new Stripe(STRIPE_SECRET, { apiVersion: "2026-04-22.dahlia" });
```

When `tsc` compiles this to `dist/stripe.js`, the `import dotenv from "dotenv"` becomes a static ESM import. When Astro/Vite builds the SSR bundle, it encounters this import and tries to bundle `dotenv` **inline**. Since `dotenv` internally uses Node builtins (`node:path`, `node:os`, `node:crypto`), Vite falls through to its `__vite-browser-external` stub, which doesn't export `fileURLToPath` — hence the crash.

### 2. The `dotenv.config()` is redundant

Astro (via Vite) **automatically loads `.env` files** from the project root in development mode. In production (Vercel), environment variables are set via the Vercel dashboard/CLI — no `.env` file is present. The 4-path loop trying `process.cwd()` and `dirname` variations has no effect in production and duplicates what Astro already does in development.

### 3. Same pattern exists in two other packages

| Package | File | Dotenv Usage | Risk |
|---------|------|-------------|------|
| `@recetario/billing` | `src/stripe.ts` | `import dotenv` + `dotenv.config()` loop | **FAILING NOW** |
| `@recetario/db` | `src/prisma.ts` | `import dotenv` + `dotenv.config()` loop | **Will fail** — same mechanism |
| `@recetario/auth` | `src/auth.ts` | `import "dotenv/config"` (side-effect import) | **Will fail** — same mechanism |

### 4. Billing package is consumed early in the request lifecycle

`apps/web/src/middleware.ts` imports `@recetario/billing` (for `getUserSubscription`, `resolveSubscription`, `seedSubscriptionPlans`), which chains to `src/index.ts` → `src/stripe.ts`, triggering the dotenv import on every server request.

### 5. No Vite SSR externalization config exists

`apps/web/astro.config.mjs` has no `vite.ssr.external` or `vite.ssr.noExternal` configuration. Adding `dotenv` to `vite.ssr.external` would be an alternative fix, but it only treats the symptom — `node:path` and `node:url` used by the compiled `stripe.js` itself would still be problematic if Vite tries to resolve them.

## Candidate Files

| File | Why It Matters | Suggested Owner |
|------|----------------|-----------------|
| `packages/billing/src/stripe.ts` | **Primary fix target** — remove dotenv import + config loop | Builder |
| `packages/billing/package.json` | Remove `dotenv` from dependencies | Builder |
| `packages/db/src/prisma.ts` | Same pattern — should fix proactively | Builder (same task) |
| `packages/db/package.json` | Remove `dotenv` from dependencies | Builder (same task) |
| `packages/auth/src/auth.ts` | Same pattern — `import "dotenv/config"` side-effect import | Builder (same task) |

## Risks And Unknowns

- **`@recetario/auth/src/auth.ts` has `import "dotenv/config"`** — this is the side-effect import form. When compiled by tsc to `dist/` and imported by Vite, it will cause the same `__vite-browser-external` error. **Fix it in the same pass** or it will surface as the next build failure.
- **`@recetario/db/src/prisma.ts`** has the same `dotenv.config()` loop. Fix it too.
- The fix is safe because Astro automatically loads `.env` files from the project root (`apps/web/.env`), and Vercel injects env vars directly into `process.env` at runtime. The `dotenv.config()` in these packages is **additive and redundant**, never the primary env-loading mechanism.
- Seed scripts (`prisma/seed.ts`, `prisma/seed-fixed-costs.ts`, `prisma/fix-sequences.ts`) use `import "dotenv/config"` — these run via `tsx` (not Vite), so they're safe. No need to touch them.

## Orchestrator Decisions Supported

- **Repo scope**: `packages/billing`, `packages/db`, `packages/auth` (all three packages with dotenv module-scope usage)
- **Candidate builder scope**: One small task — remove dotenv import/config from 3 files + 3 package.json's
- **Risk level**: low
- **Human approval gates**: none — the change is mechanical and verified by `pnpm build`
- **Suggested validation**: `pnpm install && pnpm turbo run build` from repo root

## Suggested Skills For Next Agents

Builder:
- `ponytail` — minimal fix, delete over add
- `monorepo-practices` — understand workspace package wiring

Reviewer:
- `monorepo-practices` — ensure SSR build works post-fix

Validator:
- None needed — run `pnpm build`, confirm green

## Budget Used

- Graphify queries: 0/3 (graph.json unavailable)
- Searches: 5/12
- Files read: 12/12

## Decision

complete

---

## Proposed Fix

The minimal fix is **removing dotenv from the three packages** (`billing`, `db`, `auth`). The env loading is redundant (Astro handles `.env` automatically) and actively breaks the SSR build.

### Changes

**1. `packages/billing/src/stripe.ts`** — Remove lines 1-15 (dotenv import + config loop). Keep lines 17-21 (Stripe init). The Stripe secret will be read from `process.env.STRIPE_SECRET_KEY` which is available at runtime from Astro's `.env` loading or Vercel env vars.

**2. `packages/billing/package.json`** — Remove `"dotenv": "17.4.2"` from `dependencies`

**3. `packages/db/src/prisma.ts`** — Same: remove lines 1-2, 3, 10-16. Prisma already handles DATABASE_URL from process.env, and `dotenv.config()` is redundant.

**4. `packages/db/package.json`** — Remove `"dotenv": "17.4.2"` from `dependencies`

**5. `packages/auth/src/auth.ts`** — Replace `import "dotenv/config"` with nothing. Better Auth config reads env vars from `process.env` directly.

diff summary:
```
 6 files changed, 6 deletions, 12 insertions removed
```

The seed scripts in `packages/db/prisma/*.ts` keep their `import "dotenv/config"` — they run via `tsx` directly, not through the Vite bundle, so they're unaffected.
