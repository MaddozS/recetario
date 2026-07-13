# Builder Report: T8 — Auth Package

Date: 2026-06-20 18:20
Agent: kitchcalc-builder
Task File: docs/tasks/task-20260620-1718-builder-t8-auth-package.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md

## Skills Used

- `better-auth-best-practices` — consulted for Better Auth config, client setup, env var patterns

## Metadata
- Files read: 10/15 (all 9 auth files + email + middleware + key consumers + package.json files)
- Graphify queries: 0/3 (skip — direct grep/glob faster for import tracing)
- Read discipline: obeyed (found all consumers via grep in 2 rounds)

## Scope

Move Better Auth server/client + CSRF + rate limiter + password utilities + sign-in/out + email from `apps/web/src/lib/` to `packages/auth/src/`. Update all consumers in `apps/web/src/` to import from `@recetario/auth`. Delete old source files.

## Steps Executed

1. **Loaded skill** — `better-auth-best-practices`
2. **Read all 9 auth files** — examined imports, exports, env vars
3. **Found consumers via grep** — 20+ consumer files across API routes, pages, middleware, components, stripe routes, settings, ingredients, recipes
4. **Created `packages/auth/src/`** — directory + 10 source files with updated internal imports
5. **Created barrel export** — `packages/auth/src/index.ts` with all public exports
6. **Created package README** — `packages/auth/README.md` documenting env vars
7. **Updated `packages/auth/package.json`** — better-auth + dotenv deps, @recetario/db peerDep
8. **Deleted 10 old files** from `apps/web/src/lib/` (9 auth + email.ts)
9. **Updated `apps/web/package.json`** — added `@recetario/auth: workspace:^`, removed `better-auth`
10. **Updated all consumer imports** — sed bulk replace `@/lib/auth` → `@recetario/auth` across 20+ files
11. **Fixed dynamic imports** — `import("@/lib/auth")` → `import("@recetario/auth")` (update-name.ts, sign-in.astro, sign-up.astro, verify-email.astro)
12. **Fixed single-quote import** — `[recipe].astro` used single quotes for csrf import
13. **Ran `pnpm install`** — success
14. **Verified `astro check`** — 0 errors, 0 warnings
15. **Verified dev server** — boots successfully on localhost:4328

## Files Moved to packages/auth/src/

| File | Import Updates Needed | Status |
|---|---|---|
| `auth.ts` | `@/lib/email`→`./email`, `@/lib/password-validation`→`./password-validation`, `@/lib/password-reset`→`./password-reset` | ✓ updated |
| `auth-client.ts` | none | ✓ byte-identical |
| `csrf.ts` | none | ✓ byte-identical |
| `csrf-client.ts` | none | ✓ byte-identical |
| `rate-limiter.ts` | none (already `@recetario/db`) | ✓ byte-identical |
| `password-validation.ts` | none | ✓ byte-identical |
| `password-reset.ts` | none (already `@recetario/db`) | ✓ byte-identical |
| `sign-in.ts` | `@/lib/auth-client`→`./auth-client` | ✓ updated |
| `sign-out.ts` | `@/lib/auth-client`→`./auth-client` | ✓ updated |
| `email.ts` | none (moved from lib/ to auth package) | ✓ byte-identical |

## New Files Created

- `packages/auth/src/index.ts` — barrel export
- `packages/auth/README.md` — package documentation with env var table

## Files Deleted

- `apps/web/src/lib/auth.ts`
- `apps/web/src/lib/auth-client.ts`
- `apps/web/src/lib/csrf.ts`
- `apps/web/src/lib/csrf-client.ts`
- `apps/web/src/lib/rate-limiter.ts`
- `apps/web/src/lib/password-validation.ts`
- `apps/web/src/lib/password-reset.ts`
- `apps/web/src/lib/sign-in.ts`
- `apps/web/src/lib/sign-out.ts`
- `apps/web/src/lib/email.ts`

## Files Modified

- `packages/auth/package.json` — deps + peerDep
- `apps/web/src/middleware.ts` — auth/csrf imports → @recetario/auth
- `apps/web/src/pages/api/auth/[...all].ts` — auth + rate-limiter imports → @recetario/auth
- `apps/web/src/pages/api/auth/forgot-password.ts` — auth import → @recetario/auth
- `apps/web/src/pages/api/auth/reset-password.ts` — password-reset + password-validation + auth imports → @recetario/auth
- `apps/web/src/pages/api/account/change-email.ts` — auth import → @recetario/auth
- `apps/web/src/pages/api/account/change-password.ts` — auth import → @recetario/auth
- `apps/web/src/pages/api/account/update-name.ts` — dynamic auth import → @recetario/auth
- `apps/web/src/pages/api/stripe/checkout.ts` — csrf import → @recetario/auth
- `apps/web/src/pages/api/stripe/portal.ts` — csrf import → @recetario/auth
- `apps/web/src/pages/sign-in.astro` — sign-in + dynamic auth-client imports → @recetario/auth
- `apps/web/src/pages/sign-up.astro` — sign-in + password-validation + dynamic auth-client imports → @recetario/auth
- `apps/web/src/pages/forgot-password.astro` — no auth imports (client-side fetch)
- `apps/web/src/pages/reset-password.astro` — password-validation import → @recetario/auth
- `apps/web/src/pages/recipes/index.astro` — csrf import → @recetario/auth
- `apps/web/src/pages/recipes/[recipe].astro` — csrf import → @recetario/auth (single quotes)
- `apps/web/src/pages/ingredients.astro` — csrf import → @recetario/auth
- `apps/web/src/pages/settings.astro` — csrf import → @recetario/auth
- `apps/web/src/components/Header.astro` — sign-out import → @recetario/auth
- `apps/web/package.json` — added @recetario/auth dep, removed better-auth
- `docs/tasks/task-20260620-1718-builder-t8-auth-package-report.md` — this file

## Consumer Count

**20 files** had import paths updated across `apps/web/src/`.

## Env Vars (Documented in README)

| Variable | Scope | Used By |
|---|---|---|
| `BETTER_AUTH_SECRET` | Server (`process.env`) | `auth.ts` |
| `BETTER_AUTH_URL` | Server (`process.env`) | `auth.ts` |
| `PUBLIC_BETTER_AUTH_URL` | Client (`import.meta.env.PUBLIC_*`) | `auth-client.ts` |
| `GOOGLE_CLIENT_ID` | Server | `auth.ts` |
| `GOOGLE_CLIENT_SECRET` | Server | `auth.ts` |
| `RESEND_API_KEY` | Server | `email.ts` |
| `SENDER_EMAIL` | Server | `email.ts` |

Client code in `auth-client.ts` also falls back to `window.location.origin` when `PUBLIC_BETTER_AUTH_URL` is unset.

## Commands Executed

- `mkdir -p packages/auth/src` — create dir
- `rm apps/web/src/lib/{auth,auth-client,csrf,csrf-client,rate-limiter,password-validation,password-reset,sign-in,sign-out,email}.ts` — delete old files
- `pnpm install` — workspace link
- `pnpm --filter @recetario/web astro check` — 0 errors, 0 warnings
- `pnpm --filter @recetario/web dev` — boots successfully

## Issues Encountered

1. **Single-quote import in `[recipe].astro`**: `import { validateCsrf } from '@/lib/csrf'` used single quotes, missed by the double-quote sed patterns. Fixed manually via `sed -i ''`.
2. **Pre-existing build break**: `apps/web/src/layouts/Layout.astro` imports `@/lib/accent-colors` which was moved in T5. This is NOT caused by our changes (Layout.astro wasn't modified by T8). It will block `pnpm turbo run build` until fixed in a separate task. `astro check` passes clean (0 errors).

## Verification

| Check | Result |
|---|---|
| `pnpm install` | ✓ Pass |
| `pnpm --filter @recetario/web astro check` | ✓ 0 errors, 0 warnings |
| `pnpm --filter @recetario/web dev` | ✓ Boots on localhost:4328 |
| Old `@/lib/auth*` imports remaining | ✓ None found in apps/web/src/ |
| `@recetario/auth` imports verified | ✓ 20+ files using correct package |
| build (`pnpm turbo run build`) | ✗ Pre-existing Layout.astro accent-colors break (not related to T8) |

## Residual Risks

- `pnpm turbo run build` will fail until Layout.astro's `@/lib/accent-colors` import (single-quote on lines 7-8) is updated to `@recetario/ui/accent-colors` or `@recetario/config`. This is a **pre-existing issue from T5**, not caused by T8.
- No logic changes were made — only file relocation and import path updates.

## Conclusion

**PASS** — All auth files successfully moved to `packages/auth/src/`, all consumers updated to `@recetario/auth`, old files deleted. `astro check` passes with 0 errors. Dev server boots. Pre-existing Layout.astro build break is unrelated.
