# Task: Review closer fixes (eslint + dotenv)

## Assigned Agent
kitchcalc-reviewer

## Context Received
- Spec: Fix pre-existing eslint config and dotenv bundling issues
- State: `docs/tasks/task-20260702-closer-fixes-state.json`
- Analysis:
  - `docs/analysis/analysis-20260702-eslint-config-fix.md`
  - `docs/analysis/analysis-20260702-billing-dotenv-fix.md`
- Builder reports:
  - `docs/tasks/task-20260702-closer-fixes-builder-eslint-report.md`
  - `docs/tasks/task-20260702-closer-fixes-builder-dotenv-report.md`

## Skills
Selected:
- `ponytail-review` — check for over-engineering
- `monorepo-practices` — verify workspace package correctness

Discarded:
- `security-best-practices` — no auth/CSRF changes
- `design-system-verify` — no UI changes
- `stripe-best-practices` — no Stripe API changes

May load if needed:
- none

## Instructions

Review both fixes:

### ESLint fix
- Verify config was correctly moved to `apps/web/eslint.config.mjs`
- Verify root `eslint.config.mjs` was deleted
- Verify `ignores` paths are correct for the new location
- Verify `lint` script was added to `apps/web/package.json`
- Verify no regression in what gets linted

### Dotenv fix
- Verify `packages/billing/src/stripe.ts` no longer imports dotenv
- Verify `packages/db/src/prisma.ts` no longer imports dotenv
- Verify `packages/auth/src/auth.ts` no longer imports `dotenv/config`
- Verify dotenv removed from `packages/db/package.json` dependencies
- Note: billing was already clean, auth/package.json has orphaned dep (follow-up needed)
- Verify all 3 packages compile (`turbo run build`)
- Note: full `pnpm build` has a separate pre-existing Prisma Client + webcrypto issue

## Reporting
Write report to: `docs/tasks/task-20260702-closer-fixes-reviewer-report.md`
Return only: done <path>
