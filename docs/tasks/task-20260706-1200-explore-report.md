# Explore Report: task-20260706-1200-explore

## Task Question
Trace the Prisma runtime initialization path and identify why `DATABASE_URL` is not set in the Vite SSR context.

## Context Received
- **State**: Problem report — `DATABASE_URL environment variable is not set` thrown at `packages/db/dist/src/prisma.js:6:11` via Vite ModuleRunner.
- **Spec/plan**: None
- **User request summary**: Trace the import chain from `Layout.astro` to the thrown error, find where `dotenv/config` is (or isn't) loaded, determine root cause.

## Skills Used
Selected:
- `graphify` — attempted knowledge-graph queries for import chain

Discarded:
- `prisma-client-api` — not a query issue
- `prisma-database-setup` — not a connection setup issue

Added During Execution:
- none

## Memory Context Used
- `AGENTS.md` documents the @recetario/db barrel and middleware imports.

## Parallel Explore Context
- Parallel group: none
- Sibling explore tasks: none
- Assigned domain/question boundary: whole exploration scope
- Overlap or dependency found: none

## Graphify Status
available — but queries returned irrelevant results (matched `Layout` and `dotenv` in skill documentation files, not in application source code). Graph likely lacks the semantic depth needed for runtime path questions.

## Graphify Queries
| Query | Purpose | Result Summary |
|-------|---------|----------------|
| `"How does packages/db/src/prisma.ts access DATABASE_URL and what is the import chain from Layout.astro?"` | Import chain | Returned `Layout` nodes from skill files, irrelevant |
| `"Where is dotenv imported in the runtime SSR path?"` | dotenv location | Returned package.json `dotenv` devDependency and generated prisma `config` — not useful |

## Fallback Searches
| Search | Purpose | Result Summary |
|--------|---------|----------------|
| `grep dotenv apps/web/src` | Find `dotenv/config` in web src | No matches — **zero runtime imports** |
| `grep dotenv packages/db` | Find `dotenv/config` in db package | 5 matches — all in `prisma/` scripts + README, NOT in runtime |
| `grep import.*dotenv *.ts *.js *.mjs *.astro` (repo-wide) | Confirm scope | Only `prisma.config.ts`, `prisma/seed.ts`, `prisma/fix-failed-migration.ts`, `prisma/seed-fixed-costs.ts`, `prisma/fix-sequences.ts`, `scripts/verify-prisma.ts` |
| `grep @recetario/db packages/` | Find all db consumers | `packages/auth/src/auth.ts:3`, `packages/auth/src/password-reset.ts:1`, `packages/auth/src/rate-limiter.ts:1`, `packages/billing/src/billing.ts:1` |
| `grep DATABASE_URL *.ts *.mjs` | Find all DATABASE_URL usages | 19 matches — only `packages/db/src/prisma.ts:5` is runtime; all others are CLI scripts or generated comments |

## Files Read
| File | Reason | Fact Learned |
|------|--------|--------------|
| `packages/db/src/prisma.ts` | Core question — how does it read DATABASE_URL | **Line 5**: `const connectionString = process.env.DATABASE_URL` — no abstraction, reads env var directly at module top-level. Throws immediately if missing (L6-8). |
| `packages/db/src/index.ts` | Barrel export structure | L1: `export { prisma } from "./prisma.js"` — first export. **prisma.js is loaded eagerly whenever any export from @recetario/db is imported.** |
| `packages/db/package.json` | Export resolution | Exports map `".": "./dist/src/index.js"` — the compiled dist. No `dotenv/config` import in any export. |
| `packages/db/dist/src/prisma.js` | Confirmed compiled output | Identical to source — reads `process.env.DATABASE_URL` at module top-level, no `dotenv/config`. |
| `packages/db/dist/src/index.js` | Confirmed compiled barrel | Same as source — `export { prisma } from "./prisma.js"` is the first line. |
| `apps/web/src/layouts/Layout.astro` (first 30 lines) | Trigger site | L5: `import { getUserPreferences } from '@recetario/db'` — this is **one** trigger for the error. The barrel loads `prisma.js` as a side-effect. |
| `apps/web/src/middleware.ts` | SSR entry point | L9: `import { cacheGet, cacheSet, logAuditEvent, prisma } from "@recetario/db"` — also triggers prisma.js load. L3: `import { auth } from "@recetario/auth"` → `auth/src/auth.ts:3` imports prisma again. **No `dotenv/config` import anywhere.** |
| `apps/web/astro.config.mjs` | Vite env configuration | No `envDir`, no `vite.envDir`, no dotenv plugin. No environment loading config at all. |
| `apps/web/package.json` | Web package deps | `dotenv` is listed as a `dependency` (L27) — installed but never imported at runtime. |
| `package.json` | Root deps | `dotenv` in root `devDependencies` (L28) — installed but only for CLI scripts. |
| `packages/db/tsconfig.build.json` | Build config | Compiled output goes to `dist/` from rootDir `.`. |
| `packages/auth/src/auth.ts` | Auth import path | L3: `import { prisma } from "@recetario/db"` — another trigger path through middleware. |

## Key Findings

### 1. `DATABASE_URL` is read at module top-level — no lazy loading
`packages/db/src/prisma.ts:5` reads `process.env.DATABASE_URL` as an **immediate module-level expression**, not inside a function or lazy getter. The error throw on L6-8 fires as soon as the module is evaluated.

### 2. The barrel import triggers prisma.js eagerly
`packages/db/src/index.ts:1` exports `{ prisma }` from `./prisma.js` as the **first line**. Any import of `@recetario/db` — even `getUserPreferences` — loads the entire barrel, which loads prisma.js immediately as a side effect. `getUserPreferences` doesn't need prisma, but the barrel doesn't do tree-shaking in SSR.

### 3. `dotenv/config` is NEVER imported in the runtime path
Zero runtime files import `dotenv/config`:
- **Not in** `packages/db/src/prisma.ts` or `index.ts`
- **Not in** `apps/web/src/middleware.ts`
- **Not in** any `*.astro` file
- **Not in** any SSR entry point
- **Not in** `astro.config.mjs` or any Vite config

All `import "dotenv/config"` calls are in CLI-only files (seeds, migration fixes, verification scripts).

### 4. Import chain from Layout.astro to the crash
```
Layout.astro:5  import { getUserPreferences } from '@recetario/db'
    → packages/db/package.json: "exports": ".": "./dist/src/index.js"
    → dist/src/index.js:1   export { prisma } from "./prisma.js"     ← side effect
    → dist/src/prisma.js:5  const connectionString = process.env.DATABASE_URL
    → dist/src/prisma.js:6  if (!connectionString) throw Error(...)  ← CRASH
```

### 5. Multiple import paths all hit the same crash
- `middleware.ts:9` — imports `prisma` from `@recetario/db` directly
- `middleware.ts:3` → `auth.ts:3` — imports `prisma` from `@recetario/db` indirectly
- `Layout.astro:5` → barrel → prisma.js
- `packages/billing/billing.ts:1` — imports `prisma` from `@recetario/db`

All paths converge on the same unguarded module-level `process.env.DATABASE_URL` read.

### 6. The README documents intent but code doesn't match
`packages/db/README.md` (L30) says `dotenv` is "loaded at import time via `import "dotenv/config"`" — this is aspirational. The actual source `prisma.ts` has never had this import. It was intended but never implemented.

### 7. Astro/Vite SSR doesn't auto-load .env into process.env
Vite's SSR module runner (`ModuleRunner`) does NOT automatically load `.env` files into `process.env`. Vite loads `.env` variables into `import.meta.env` (its own managed env), not into `process.env`. The astro config has no `envDir` setting either.

## Candidate Files
| File | Why It Matters | Suggested Owner |
|------|----------------|-----------------|
| `packages/db/src/prisma.ts` | Where the fix goes (add `import "dotenv/config"` or use lazy access) | kitchcalc-builder |
| `packages/db/dist/src/prisma.js` | Must be rebuilt after the fix | kitchcalc-builder |
| `apps/web/astro.config.mjs` | Alternative: add `vite: { envDir: "../.." }` config | kitchcalc-builder |

## Risks And Unknowns
- **Risk: Dual env loading** — If `dotenv/config` is added to `prisma.ts`, it runs on EVERY import of `@recetario/db`. `dotenv/config` only loads once (it guards itself), so this is safe but worth noting.
- **Risk: Build tooling gap** — `packages/db` uses `tsc --build` to compile to `dist/`. The `dist/src/prisma.js` must be regenerated after the source change or the fix won't take effect. The Vercel build script (`apps/web/package.json:15`) does NOT include `pnpm --filter @recetario/db build` — it only does `prisma generate` and migrations. This means `dist/` is likely stale or built separately.
- **Unknown**: Whether `dotenv/config` resolves correctly when imported from within `packages/db/` — the `.env` file is at the repo root. `dotenv` searches from `process.cwd()`, which in Vercel SSR could be anywhere.
- **Unknown**: Whether the `dist/` is committed or built on deploy. If committed, both source and dist need patching.

## Orchestrator Decisions Supported
- **Repo scope**: `packages/db/src/prisma.ts` (single-file fix)
- **Merge guidance for parallel reports**: Not applicable
- **Candidate builder scope**: Very small — either one-line addition to `prisma.ts` or a Vite envDir config change
- **Risk level**: low (the fix is straightforward)
- **Human approval gates**: none
- **Suggested validation**: Start dev server, navigate to any protected page or the index page — should no longer crash with DATABASE_URL error

## Suggested Skills For Next Agents
Builder:
- `monorepo-practices` — to understand workspace export resolution and whether `dotenv/config` works when imported from a workspace package

Reviewer:
- none needed (trivial fix)

Validator:
- none needed

## Budget Used
- Graphify queries: 2/3
- Searches: 7/12
- Files read: 12/12

## Decision
complete
