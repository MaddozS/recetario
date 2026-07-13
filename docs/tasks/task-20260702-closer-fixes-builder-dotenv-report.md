# Builder Report: task-20260702-closer-fixes-builder-dotenv

## Task Received
`docs/tasks/task-20260702-closer-fixes-builder-dotenv.md` — Remove redundant dotenv imports from packages/billing, packages/db, and packages/auth.

## Context Received
- Analysis: `docs/analysis/analysis-20260702-billing-dotenv-fix.md`
- State: `docs/tasks/task-20260702-closer-fixes-state.json`

## Skills Used
Selected:
- `ponytail` — minimal fix, delete over add
- `monorepo-practices` — understand workspace package wiring for SSR build

Discarded:
- `security-best-practices` — no auth changes
- `stripe-best-practices` — no Stripe API changes, only env loading removal

Added During Execution:
- none

## Files Read
| File | Reason | Decision |
|------|--------|----------|
| `packages/billing/src/stripe.ts` | Edit target | dotenv already clean in HEAD |
| `packages/billing/package.json` | Edit target | dotenv dep already clean in HEAD |
| `packages/db/src/prisma.ts` | Edit target | Removed `import "dotenv/config"` |
| `packages/db/package.json` | Edit target | Removed `"dotenv": "17.4.2"` dep |
| `packages/auth/src/auth.ts` | Edit target | Removed `import "dotenv/config"` |
| `packages/auth/package.json` | Check dotenv dep | Has orphaned dep, not in editable scope |
| `docs/tasks/task-20260702-closer-fixes-state.json` | Context | Understood task phase and AC |

## Files Changed
| File | Change |
|------|--------|
| `packages/db/src/prisma.ts` | Removed `import "dotenv/config"` side-effect import (was the only dotenv usage) |
| `packages/db/package.json` | Removed `"dotenv": "17.4.2"` from dependencies |
| `packages/auth/src/auth.ts` | Removed `import "dotenv/config"` side-effect import (was the only dotenv usage) |

**Note**: `packages/billing/src/stripe.ts` and `packages/billing/package.json` were already clean in HEAD — no changes needed.

## Commands Run
| Command | Result | Notes |
|---------|--------|-------|
| `pnpm install` | ✓ | Lockfile updated; Prisma regenerated |
| `pnpm turbo run build --filter=@recetario/billing --filter=@recetario/db --filter=@recetario/auth` | ✓ | All 3 packages built successfully |
| `pnpm build` (full) | ❌ | Pre-existing Prisma Client SSR failure (`"webcrypto" not exported by "__vite-browser-external"`) — same error without my changes |
| `git stash + build` on clean tree | ❌ | Same `webcrypto` error — confirms pre-existing |
| `pnpm astro check` | ✓ | 0 errors, 11 hints (all pre-existing) |
| `grep -rn dotenv` on edited packages | ✓ | No dotenv imports remain in source; auth/package.json has orphaned dep (out of scope) |

## Acceptance Criteria Status
- [x] Packages compile successfully (all 3 tsc builds pass)
- [x] `pnpm astro check` passes (0 errors)
- [x] Seed scripts unaffected (they have their own dotenv imports)
- [ ] `pnpm build` completes without `__vite-browser-external` / `fileURLToPath` errors — **pre-existing failure** from Prisma Client runtime, not from dotenv (confirmed by building clean tree)

## Failures Or Blockers
**Full build (`pnpm build`) still fails** with `"webcrypto" is not exported by "__vite-browser-external"` — this is a pre-existing Prisma Client SSR issue in `@prisma/client/runtime/client.mjs`, NOT caused by the removed dotenv imports. Verified by building the same commit without my changes — identical error.

This is tracked in the state file as the broader fix context. The dotenv fix alone resolves the `dotenv → node:path/node:os/node:crypto` bundling issues. The Prisma Client runtime issue needs a separate fix (likely Vite SSR externals config or Prisma v7 driver adapter configuration).

## Notes For Reviewer
- `packages/auth/package.json` still declares `"dotenv": "17.4.2"` as a dependency — it's an orphaned dep now that the only import was removed, but auth/package.json was not in the task's editable file list. Left for a follow-up cleanup if desired.
- The db package's source file had already been partially cleaned in a prior commit (the config-for loop was gone, replaced by a `import "dotenv/config"` side-effect import). My change removed that remaining import.
