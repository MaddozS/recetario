# Builder Report: task-20260702-closer-fixes-builder-eslint

## Task Received
`docs/tasks/task-20260702-closer-fixes-builder-eslint.md` — Move ESLint config from root to `apps/web/`, adjust ignores paths, add lint script.

## Context Received
- State: `docs/tasks/task-20260702-closer-fixes-state.json`

## Skills Used
Selected:
- `ponytail` — minimal config move, dropped ignores that don't apply from `apps/web/`

Discarded:
- `security-best-practices` — no auth changes
- `monorepo-practices` — not needed for this simple move

Added During Execution:
- none

## Files Read
| File | Reason | Decision |
|------|--------|----------|
| `eslint.config.mjs` | Current config content | Move to `apps/web/` |
| `apps/web/package.json` | Needs lint script | Add `"lint": "eslint ."` |
| (via ls) `apps/web/dist/`, `.vercel/`, `.astro/`, `generated/` | Path verification | Keep in ignores |
| (via ls) `.agent/` | Path verification | Doesn't exist → drop |
| (via ls) `.agents/`, `.opencode/`, `run_migration.mjs` | Path verification | Root-level only → drop (out of scan scope) |

## Files Changed
| File | Change |
|------|--------|
| `apps/web/eslint.config.mjs` | **Created** — moved config with adjusted ignores |
| `eslint.config.mjs` (root) | **Deleted** — content cleared, file removed |
| `apps/web/package.json` | **Edited** — added `"lint": "eslint ."` script |

## Commands Run
| Command | Result | Notes |
|---------|--------|-------|
| `cd apps/web && ./node_modules/.bin/eslint .` | 9 errors (all pre-existing in `[recipe].astro`) | Config works; errors not caused by this change |
| `test -f eslint.config.mjs` | DELETED | Root config removed |
| `pnpm astro check` | FAILED (Node v20, needs >=22.12) | Pre-existing env limitation, not related to this change |

## Acceptance Criteria Status
- [x] `cd apps/web && pnpm exec eslint .` completes — verified via direct binary (9 pre-existing errors in `[recipe].astro`)
- [x] Root `eslint.config.mjs` no longer exists — deleted
- [x] `apps/web/package.json` has `"lint": "eslint ."` script — confirmed
- [ ] `pnpm astro check` still passes — blocked by Node v20 environment (pre-existing)

## Failures Or Blockers
`pnpm astro check` cannot run in this environment (Node v20.20.2, requires >= 22.12.0). This is a pre-existing limitation of the current shell environment, not caused by this task. The eslint config move does not affect Astro's check.

## Notes For Reviewer
- Dropped `".agent/"` — doesn't exist at any level.
- Dropped `".agents/"`, `"run_migration.mjs"` — root-level only; out of scope when eslint scans `apps/web/`.
- Only kept ignores that match actual files under `apps/web/`.
