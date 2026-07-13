# Task T8: Auth package
Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: docs/analysis/analysis-20260620-1718-monorepo-refactor.md
Spec: docs/specs/2026-06-20-monorepo-refactor-design.md
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Depends on: T7 PASS (verified ✓), parallel with T9

## Goal

Move Better Auth server/client + CSRF + rate limiter + password utilities + sign-in/out helpers from `apps/web/src/lib/` to `packages/auth/src/`. Update `apps/web/src/middleware.ts` and all auth-related API routes to import from `@recetario/auth`. Standardize env vars (process.env for server, not import.meta.env).

## Context

After T7, `@recetario/db` is available. The auth package depends on it (Better Auth uses Prisma adapter, rate limiter uses Prisma directly, password-reset uses Prisma).

**Auth files to move** (from `apps/web/src/lib/`):
- `auth.ts` — Better Auth server singleton
- `auth-client.ts` — Better Auth client (uses `import.meta.env.PUBLIC_BETTER_AUTH_URL`)
- `csrf.ts` — CSRF token generation/validation
- `csrf-client.ts` — client-side CSRF helpers
- `rate-limiter.ts` — DB-backed rate limiter
- `password-validation.ts` — password strength rules
- `password-reset.ts` — password reset token logic
- `sign-in.ts` — Google sign-in helpers
- `sign-out.ts` — sign-out helpers

**Env var standardization**:
- Current: `auth-client.ts` uses `import.meta.env.PUBLIC_BETTER_AUTH_URL` (Vite/Astro-specific)
- New: should use `process.env.BETTER_AUTH_URL` (Node-standard)
- Vercel sets both `import.meta.env` and `process.env` for server-side; for client-side code, only `import.meta.env.PUBLIC_*` works
- Since `auth-client.ts` is for the browser, we need to be careful. Either:
  - Use `import.meta.env.PUBLIC_BETTER_AUTH_URL` (Vite-only, works in browser)
  - OR pass the URL as a parameter from the page (cleaner)
  - OR use `window.location.origin` (assumes same-origin)

**Decision for env vars**: The simplest approach is to use `process.env.BETTER_AUTH_URL` and have the build inject it. But for client code, `import.meta.env.PUBLIC_*` is the standard. Let me use:
- `auth.ts` (server): `process.env.BETTER_AUTH_URL` and `process.env.BETTER_AUTH_SECRET`
- `auth-client.ts` (client): keep `import.meta.env.PUBLIC_BETTER_AUTH_URL` (it's client code)
- Document this in the package README

Wait, actually, since the package will be in `packages/auth/`, Vite won't process its `import.meta.env` references the same way as `apps/web/`. Let me think.

Actually, the package source is TypeScript/JS. When `apps/web` imports it, Vite processes the imports. So `import.meta.env.PUBLIC_BETTER_AUTH_URL` in `packages/auth/src/auth-client.ts` will be processed by Vite at consumer build time.

For server code (auth.ts), it runs on Vercel's Node runtime, which has `process.env`. So `process.env.BETTER_AUTH_URL` works.

For client code (auth-client.ts), it runs in the browser, where only `import.meta.env.PUBLIC_*` is available (Vite injects these at build time).

So the right approach is:
- `auth.ts` (server): `process.env.BETTER_AUTH_URL` etc.
- `auth-client.ts` (client): `import.meta.env.PUBLIC_BETTER_AUTH_URL` etc.

Both work. No standardization needed. Just keep the same env resolution per environment.

**API routes that import from auth**:
- `apps/web/src/pages/api/auth/[...all].ts` — `auth.handler`
- `apps/web/src/pages/api/auth/reset-password.ts` — `password-reset` logic
- `apps/web/src/pages/api/auth/forgot-password.ts` — `password-reset` logic
- `apps/web/src/pages/api/auth/change-email.ts` — `auth` helpers
- `apps/web/src/pages/api/auth/change-password.ts` — `auth` helpers
- `apps/web/src/pages/api/auth/update-name.ts` — `auth` helpers
- `apps/web/src/middleware.ts` — `auth`, `csrf`, `audit` (audit moved in T7), `cache` (moved in T7), `subscription` (moves in T9), `billing` (moves in T9)
- `apps/web/src/pages/sign-in.astro` — `signInWithGoogle`
- `apps/web/src/pages/sign-up.astro` — possibly signInWithGoogle
- `apps/web/src/pages/forgot-password.astro` — auth client
- `apps/web/src/pages/reset-password.astro` — auth client + password-reset logic

**Migration**: All `@/lib/auth*`, `@/lib/csrf*`, `@/lib/rate-limiter`, `@/lib/password-*`, `@/lib/sign-in`, `@/lib/sign-out` → `@recetario/auth`

## Task Scope

- **Type**: new + extends-existing
- **Pre-existing components**:
  - T7 output: `packages/auth/package.json` (placeholder) + `packages/auth/src/` (empty)
  - T7 output: `@recetario/db` available
  - T1 output: 9 auth-related files in `apps/web/src/lib/`
  - T1 output: `apps/web/src/middleware.ts` (touches 7 modules)
  - T1 output: API routes in `apps/web/src/pages/api/auth/`
  - T1 output: sign-in/sign-up/forgot/reset pages
- **New deliverables**:
  - 9 files in `packages/auth/src/`
  - `packages/auth/package.json` with deps (better-auth, @recetario/db)
  - `packages/auth/src/index.ts` barrel
  - Updated `apps/web/src/middleware.ts` importing from `@recetario/auth`
  - Updated API routes
  - Updated sign-in/sign-up/forgot/reset pages
- **Dependencies**: T7 PASS (verified ✓)

## Skills Required

- **better-auth-best-practices**: For Better Auth configuration, client setup, session handling

## Files Involved

**Files to read**:
- All 9 auth files
- `apps/web/src/middleware.ts`
- All API routes in `apps/web/src/pages/api/auth/`
- Sign-in/sign-up/forgot/reset pages

**Files to find consumers**:
- `grep -rln "from \"@/lib/auth\"" apps/web/src/`
- `grep -rln "from \"@/lib/auth-client\"" apps/web/src/`
- `grep -rln "from \"@/lib/csrf\"" apps/web/src/`
- `grep -rln "from \"@/lib/csrf-client\"" apps/web/src/`
- `grep -rln "from \"@/lib/rate-limiter\"" apps/web/src/`
- `grep -rln "from \"@/lib/password-validation\"" apps/web/src/`
- `grep -rln "from \"@/lib/password-reset\"" apps/web/src/`
- `grep -rln "from \"@/lib/sign-in\"" apps/web/src/`
- `grep -rln "from \"@/lib/sign-out\"" apps/web/src/`

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `packages/auth/package.json` — modify (deps, exports, files)
- [ ] `packages/auth/src/index.ts` — new (barrel)
- [ ] `packages/auth/src/auth.ts` — new (moved)
- [ ] `packages/auth/src/auth-client.ts` — new (moved)
- [ ] `packages/auth/src/csrf.ts` — new (moved)
- [ ] `packages/auth/src/csrf-client.ts` — new (moved)
- [ ] `packages/auth/src/rate-limiter.ts` — new (moved, imports prisma from @recetario/db)
- [ ] `packages/auth/src/password-validation.ts` — new (moved)
- [ ] `packages/auth/src/password-reset.ts` — new (moved, imports prisma from @recetario/db)
- [ ] `packages/auth/src/sign-in.ts` — new (moved)
- [ ] `packages/auth/src/sign-out.ts` — new (moved)
- [ ] `packages/auth/README.md` — new (env var documentation)
- [ ] `apps/web/src/lib/auth.ts` — delete
- [ ] `apps/web/src/lib/auth-client.ts` — delete
- [ ] `apps/web/src/lib/csrf.ts` — delete
- [ ] `apps/web/src/lib/csrf-client.ts` — delete
- [ ] `apps/web/src/lib/rate-limiter.ts` — delete
- [ ] `apps/web/src/lib/password-validation.ts` — delete
- [ ] `apps/web/src/lib/password-reset.ts` — delete
- [ ] `apps/web/src/lib/sign-in.ts` — delete
- [ ] `apps/web/src/lib/sign-out.ts` — delete
- [ ] `apps/web/src/middleware.ts` — modify (imports from @recetario/auth, @recetario/db, @recetario/billing)
- [ ] `apps/web/src/pages/api/auth/[...all].ts` — modify (imports from @recetario/auth)
- [ ] `apps/web/src/pages/api/auth/reset-password.ts` — modify
- [ ] `apps/web/src/pages/api/auth/forgot-password.ts` — modify
- [ ] `apps/web/src/pages/api/auth/change-email.ts` — modify
- [ ] `apps/web/src/pages/api/auth/change-password.ts` — modify
- [ ] `apps/web/src/pages/api/auth/update-name.ts` — modify
- [ ] `apps/web/src/pages/sign-in.astro` — modify
- [ ] `apps/web/src/pages/sign-up.astro` — modify
- [ ] `apps/web/src/pages/forgot-password.astro` — modify
- [ ] `apps/web/src/pages/reset-password.astro` — modify
- [ ] `apps/web/package.json` — modify (add @recetario/auth dep)
- [ ] `docs/tasks/task-20260620-1718-builder-t8-auth-package-report.md` — the report file (mandatory)

## Technical Steps

1. **Load skill**: `better-auth-best-practices`

2. **Read all 9 auth files**:
   - Note imports, env vars used, exports

3. **Find all consumers**:
   ```bash
   grep -rln "from \"@/lib/auth" apps/web/src/ > /tmp/auth-consumers.txt
   grep -rln "from \"@/lib/csrf" apps/web/src/ >> /tmp/auth-consumers.txt
   grep -rln "from \"@/lib/rate-limiter\"" apps/web/src/ >> /tmp/auth-consumers.txt
   grep -rln "from \"@/lib/password-" apps/web/src/ >> /tmp/auth-consumers.txt
   grep -rln "from \"@/lib/sign-in\"" apps/web/src/ >> /tmp/auth-consumers.txt
   grep -rln "from \"@/lib/sign-out\"" apps/web/src/ >> /tmp/auth-consumers.txt
   cat /tmp/auth-consumers.txt | sort -u
   ```
   - Document the list

4. **Create `packages/auth/src/` directory**:
   ```bash
   mkdir -p packages/auth/src
   ```

5. **Move 9 auth files**:
   ```bash
   mv apps/web/src/lib/auth.ts packages/auth/src/auth.ts
   mv apps/web/src/lib/auth-client.ts packages/auth/src/auth-client.ts
   mv apps/web/src/lib/csrf.ts packages/auth/src/csrf.ts
   mv apps/web/src/lib/csrf-client.ts packages/auth/src/csrf-client.ts
   mv apps/web/src/lib/rate-limiter.ts packages/auth/src/rate-limiter.ts
   mv apps/web/src/lib/password-validation.ts packages/auth/src/password-validation.ts
   mv apps/web/src/lib/password-reset.ts packages/auth/src/password-reset.ts
   mv apps/web/src/lib/sign-in.ts packages/auth/src/sign-in.ts
   mv apps/web/src/lib/sign-out.ts packages/auth/src/sign-out.ts
   ```

6. **Update internal imports** in moved files:
   - `apps/web/src/lib/auth.ts` had `import { prisma } from "@/lib/prisma"` (now removed since T7 moved it)
   - `auth.ts` in the new location needs `import { prisma } from "@recetario/db"`
   - `rate-limiter.ts` needs `import { prisma } from "@recetario/db"`
   - `password-reset.ts` needs `import { prisma } from "@recetario/db"`
   - `auth.ts` needs `import { ... } from "@/lib/email"` — email.ts should also move, but per the plan email stays in `apps/web/` or moves to `packages/auth/` (it's only used by auth)
   - **Decision**: Move `email.ts` to `packages/auth/src/email.ts` (only auth uses it per explore)

7. **Move `email.ts` to auth package** (since only auth uses it):
   ```bash
   mv apps/web/src/lib/email.ts packages/auth/src/email.ts
   ```
   - Update `auth.ts` to import from `./email` (local relative)

8. **Update env var usage** (per spec):
   - `auth.ts` (server): use `process.env.BETTER_AUTH_URL` and `process.env.BETTER_AUTH_SECRET`
   - `auth-client.ts` (client): keep `import.meta.env.PUBLIC_BETTER_AUTH_URL` (works for client code in Vite/Astro)
   - Document in package README

9. **Create `packages/auth/src/index.ts`** barrel:
   ```ts
   export { auth } from "./auth";
   export { authClient } from "./auth-client";
   export { ... } from "./csrf";
   // etc.
   ```
   - Export all the public API of the package
   - Internal helpers don't need to be exported

10. **Update `packages/auth/package.json`**:
    ```json
    {
      "name": "@recetario/auth",
      "version": "0.0.0",
      "private": true,
      "type": "module",
      "main": "./src/index.ts",
      "types": "./src/index.ts",
      "exports": {
        ".": {
          "types": "./src/index.ts",
          "default": "./src/index.ts"
        }
      },
      "files": ["src"],
      "dependencies": {
        "better-auth": "1.6.11"
      },
      "peerDependencies": {
        "@recetario/db": "workspace:^"
      }
    }
    ```
    - `better-auth` is a runtime dep
    - `@recetario/db` is a peerDep (consumer provides it)

11. **Create `packages/auth/README.md`** documenting:
    - Purpose: Better Auth + CSRF + rate limiter + password utilities
    - Usage: `import { auth, authClient, ... } from "@recetario/auth"`
    - Env vars: BETTER_AUTH_URL, BETTER_AUTH_SECRET, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
    - Client vs server env vars (process.env vs import.meta.env.PUBLIC_*)
    - Dependencies: requires `@recetario/db` peer

12. **Update `apps/web/src/middleware.ts`**:
    - Replace `import { auth } from "@/lib/auth"` → `import { auth } from "@recetario/auth"`
    - Replace `import { ... } from "@/lib/csrf"` → `import { ... } from "@recetario/auth"`
    - Replace `import { ... } from "@/lib/audit"` (already moved in T7) → `import { ... } from "@recetario/db"`
    - Replace `import { ... } from "@/lib/cache"` (already moved in T7) → `import { ... } from "@recetario/db"`
    - Replace `import { ... } from "@/lib/db/billing"` (still in apps/web, will move in T9) → keep for now
    - Replace `import { ... } from "@/lib/subscription"` (still in apps/web, will move in T9) → keep for now

13. **Update `apps/web/src/pages/api/auth/[...all].ts`**:
    - `import { auth } from "@/lib/auth"` → `import { auth } from "@recetario/auth"`
    - `import { ... } from "@/lib/rate-limiter"` → `import { ... } from "@recetario/auth"`

14. **Update `apps/web/src/pages/api/auth/reset-password.ts`** and `forgot-password.ts`:
    - `import { ... } from "@/lib/password-reset"` → `import { ... } from "@recetario/auth"`
    - `import { ... } from "@/lib/password-validation"` → `import { ... } from "@recetario/auth"`

15. **Update `apps/web/src/pages/api/auth/change-email.ts`** and `change-password.ts`:
    - `import { ... } from "@/lib/auth"` → `import { ... } from "@recetario/auth"`
    - `import { ... } from "@/lib/password-validation"` → `import { ... } from "@recetario/auth"`

16. **Update `apps/web/src/pages/api/auth/update-name.ts`**:
    - `import { prisma } from "@/lib/prisma"` (already moved in T7) → `import { prisma } from "@recetario/db"`
    - Other auth imports → `@recetario/auth`

17. **Update sign-in/sign-up/forgot/reset pages**:
    - `import { signInWithGoogle } from "@/lib/sign-in"` → `import { signInWithGoogle } from "@recetario/auth"`
    - `import { signOut } from "@/lib/sign-out"` → `import { signOut } from "@recetario/auth"`
    - `import { authClient } from "@/lib/auth-client"` → `import { authClient } from "@recetario/auth"`

18. **Use sed for bulk import updates** (where safe):
    ```bash
    # Update all auth imports across apps/web/src/
    grep -rln "from \"@/lib/auth\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/auth"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/auth-client\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/auth-client"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/csrf\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/csrf"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/csrf-client\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/csrf-client"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/rate-limiter\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/rate-limiter"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/password-validation\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/password-validation"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/password-reset\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/password-reset"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/sign-in\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/sign-in"|from "@recetario/auth"|g'
    grep -rln "from \"@/lib/sign-out\"" apps/web/src/ | xargs sed -i '' 's|from "@/lib/sign-out"|from "@recetario/auth"|g'
    # Also handle single quotes
    grep -rln "from '@/lib/auth'" apps/web/src/ | xargs sed -i '' "s|from '@/lib/auth'|from '@recetario/auth'|g"
    # ... etc.
    ```

19. **Update `apps/web/package.json`**:
    - Add `"@recetario/auth": "workspace:^"` to dependencies
    - Remove `better-auth` from apps/web deps (moved to packages/auth)
    - Remove `@types/node` for these auth files if no longer used in apps/web (keep if other apps/web code uses it)

20. **Reinstall**:
    ```bash
    pnpm install
    ```

21. **Verify build**:
    ```bash
    pnpm turbo run build
    ```
    - Should succeed
    - All 9 auth modules + email compiled correctly

22. **Verify astro check**:
    ```bash
    pnpm --filter @recetario/web astro check
    ```
    - 0 errors

23. **Verify dev server**:
    ```bash
    cd apps/web && timeout 15 pnpm dev
    ```
    - Boots

24. **Verify auth flows** (limited by DATABASE_URL):
    - Note in report that full flow verification requires DATABASE_URL set
    - The build/astro check pass indicates the imports resolve correctly

25. **Write report** to `docs/tasks/task-20260620-1718-builder-t8-auth-package-report.md` with:
    - **Skills Used**: `better-auth-best-practices` etc.
    - **Files moved**: list (9 + email.ts)
    - **Files deleted**: list
    - **Files modified**: list (consumers)
    - **Consumer count updated**: how many files had imports updated
    - **Env vars**: documented per environment (server vs client)
    - **Build / check / dev**: all pass
    - **Issues encountered**: any + how resolved

## Expected Output

- **Code changes**:
  - 10 files in `packages/auth/src/` (9 auth + email)
  - `packages/auth/package.json` with better-auth + peerDep on @recetario/db
  - `packages/auth/README.md` with env var documentation
  - All consumers updated
  - 9 files deleted from `apps/web/src/lib/`
- **Report**: `docs/tasks/task-20260620-1718-builder-t8-auth-package-report.md`

## Guardrails

- **DO NOT** modify any auth logic (just move files)
- **DO NOT** change Better Auth version
- **DO NOT** add new dependencies
- **DO NOT** commit changes
- **DO NOT** run `pnpm eslint .` or `pnpm format` (pre-existing T1 broken state)
- **DO NOT** move `email.ts` to a separate `packages/email/` package (per the spec, email stays with auth)
- **MUST** preserve byte-identical content for all moved files (no logic changes)
- **MUST** verify build, astro check, dev server all pass before declaring done
- **MUST** document env vars in package README
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If new files are needed, STOP and report.
- **Read discipline**: Max 15 file reads. Should be ~13 reads (9 auth + email + middleware + 1-2 API routes + 1-2 pages).
