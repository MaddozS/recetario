# Reviewer Report: task-20260702-closer-fixes

## Review Scope
- Analysis: `docs/analysis/analysis-20260702-eslint-config-fix.md`, `docs/analysis/analysis-20260702-billing-dotenv-fix.md`
- Builder report (eslint): `docs/tasks/task-20260702-closer-fixes-builder-eslint-report.md`
- Builder report (dotenv): `docs/tasks/task-20260702-closer-fixes-builder-dotenv-report.md`
- Files reviewed:
  - `apps/web/eslint.config.mjs`
  - `eslint.config.mjs` (root)
  - `apps/web/package.json`
  - `packages/billing/src/stripe.ts`
  - `packages/billing/package.json`
  - `packages/db/src/prisma.ts`
  - `packages/db/package.json`
  - `packages/auth/src/auth.ts`
  - `packages/auth/package.json`

## Skills Used
Selected:
- `ponytail-review` — complexity check on diff
- `monorepo-practices` — verify workspace package correctness

Discarded:
- (none — both loaded as required)

Added During Execution:
- none

## Findings

| Severity | File | Issue | Evidence | Required Action |
|----------|------|-------|----------|-----------------|
| **BLOCKER** | `eslint.config.mjs` (root) | Builder claimed "content cleared, file removed" but file still exists with **full original content** — completely unchanged. | §28: root config has original imports, original ignores with `.agent/`, `.agents/`, `run_migration.mjs`. File at `/Users/maddozs/personal-projects/recetario/eslint.config.mjs` confirmed by glob. | Delete the root `eslint.config.mjs` (or rename it to `.bak`). The new `apps/web/eslint.config.mjs` is its replacement. |
| **BLOCKER** | `apps/web/package.json` | Builder claimed `"lint": "eslint ."` script was added but no `lint` script exists in the file. | §29: scripts array contains `dev`, `build`, `preview`, `astro`, `format`, `type-check`, `postinstall`, `vercel-build`. No `lint` entry. | Add `"lint": "eslint ."` to `scripts` in `apps/web/package.json`. |
| should-fix | `packages/auth/package.json` | Orphaned `"dotenv": "17.4.2"` dependency — the only dotenv import (`import "dotenv/config"` in `src/auth.ts`) was removed, but the dep remains declared. | §22: `"dotenv": "17.4.2"` at line 20. Source file §15: no dotenv import remains. | Remove `"dotenv": "17.4.2"` from `packages/auth/package.json` dependencies (follow-up from dotenv fix). |
| note | `apps/web/eslint.config.mjs` | New config is correct — proper imports, adjusted ignores. Dropped root-only ignores (`.agent/`, `.agents/`, `run_migration.mjs`). | §11: config content verified. | None — this file is correct. |
| note | `packages/billing/src/stripe.ts` | Already clean — no dotenv import. | §23: file content verified. | None. |
| note | `packages/billing/package.json` | No dotenv dependency. | §24: file content verified. | None. |
| note | `packages/db/src/prisma.ts` | Dotenv import removed correctly. | §13: no dotenv import. | None. |
| note | `packages/db/package.json` | Dotenv dependency removed correctly. | §14: no dotenv dep. | None. |
| note | `packages/auth/src/auth.ts` | Dotenv import removed correctly. | §15: no `import "dotenv/config"`. | None. |

## Protocol Issues

**Builder protocol violation**: The eslint builder report (`task-20260702-closer-fixes-builder-eslint-report.md`) claims two files were modified that were **not actually modified** on the working filesystem:

1. Claimed "root `eslint.config.mjs` deleted — content cleared, file removed" → File still exists unchanged.
2. Claimed `apps/web/package.json` edited with `"lint": "eslint ."` → No such script exists.

This suggests the builder operated in a sandboxed or disconnected environment where its changes did not persist to the checked-out working tree. The dotenv builder (`task-20260702-closer-fixes-builder-dotenv-report.md`) has no such discrepancy — its changes are faithfully reflected on disk.

**Possible cause**: The eslint fix builder may have run in a `git worktree` or ephemeral environment and the changes weren't written back. All three changes it claimed (create `apps/web/eslint.config.mjs`, delete root config, add lint script) need to be re-applied. Only `apps/web/eslint.config.mjs` was actually created.

## Acceptance Criteria Review
- [ ] `cd apps/web && pnpm exec eslint .` passes — **blocked** because root `eslint.config.mjs` still exists (could confuse ESLint 10 flat config resolution) AND `apps/web/package.json` lacks a `lint` script (not directly blocking eslint . run, but the protocol issue means the full fix wasn't applied)
- [ ] `pnpm build` passes — pre-existing `webcrypto` failure confirmed separate from this work
- [x] All 3 packages (billing, db, auth) no longer bundle dotenv — confirmed. Source files clean. auth/package.json has orphaned dep (not a bundling issue, just a cleanup)
- [ ] `pnpm astro check` passes — confirmed by dotenv builder (0 errors)
- [x] Seed scripts unaffected — confirmed: `prisma/*.ts` scripts retain their `import "dotenv/config"`

## Verdict
**needs-rework**

Two blocker items: root `eslint.config.mjs` was not deleted, and `apps/web/package.json` was not updated with the `lint` script. The dotenv fix is correct.

## Rework Task Hints
1. **Delete** `eslint.config.mjs` at repo root (or rename to `.bak`)
2. **Add** `"lint": "eslint ."` to `apps/web/package.json` `scripts`
3. **Optional**: Remove orphaned `"dotenv": "17.4.2"` from `packages/auth/package.json`
4. There are no other issues — `apps/web/eslint.config.mjs` content is correct, and all 3 packages' source files are clean of dotenv
