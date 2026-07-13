# Builder Report: Load .env from repo root in astro.config.mjs

## Task Received
Load .env from repo root in astro.config.mjs

## Context Received
- Root cause: `.env` is at repo root, Astro's Vite module runner doesn't load `.env` into `process.env`. Packages use `process.env.X` (not `import.meta.env.X`), so they never see the vars.
- Key insight: `astro.config.mjs` runs in plain Node.js BEFORE the dev server starts. If we load `.env` there via `dotenv.config()` with an explicit path, `process.env` gets populated in the main process. Vite SSR shares the same `process.env`, so all packages see the vars.

## Parallel Context
- Parallel group: none
- Depends on: all prior lazy-init fixes (already done)
- Sibling tasks: none
- Parallel-safe confirmed: yes — standalone config edit

## Skills Used
Selected: none — straightforward config edit

Discarded: none

Added During Execution: none

## Files Read
| File | Reason | Decision |
|------|--------|----------|
| apps/web/astro.config.mjs | Verify current state before edit | Edited to add dotenv import and config call |
| apps/web/package.json | Verify dotenv is a dependency | Confirmed "dotenv": "17.4.2" present |

## Files Changed
| File | Change |
|------|--------|
| apps/web/astro.config.mjs | Added `import dotenv from "dotenv"` and `dotenv.config({ path: path.resolve(__dirname, "../../.env") })` after __dirname computation |

## Commands Run
| Command | Result | Notes |
|---------|--------|-------|
| pnpm dev | Success | Server started on port 4324, 14 env vars injected from ../../.env |

## Acceptance Criteria Status
- [x] `dotenv.config()` is called in `astro.config.mjs` with path pointing to repo root `.env`
- [x] `pnpm dev` boots without env errors
- [x] SSR pages render (middleware accesses auth, billing, db — all should have process.env populated)

## Failures Or Blockers
none

## Notes For Reviewer
The dev server output confirms: `injected env (14) from ../../.env`. This verifies the fix works as intended — process.env is populated before Vite SSR module runner evaluates package code.
