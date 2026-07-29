# Extract shared env-binding + request utilities

## Problem Statement

Every time a new environment variable is added to the project, developers must add it to two separate `ENV_KEYS` arrays (`apps/web/src/middleware.ts` and `apps/api/src/index.ts`) and update two separate `syncBindingsToProcessEnv` functions. The `clientIp` helper is also copy-pasted across both files. Additionally, `setSecurityHeaders` exists only in `middleware.ts` but should apply to every response, including the API worker. Adding a variable in one place but not the other causes silent runtime failures (the missing env var is `undefined` in the un-updated file). This has already bitten the project (memory #47: scattered env-var management caused repeated round-trips during bootstrap).

## Solution

Create two shared modules in `packages/config/src/`:

- `env.ts` — single canonical source for `REQUIRED_ENV_KEYS` and `syncEnvBindings`
- `request.ts` — single canonical source for `clientIp` and `setSecurityHeaders`

Both `middleware.ts` and `apps/api/src/index.ts` import from these modules instead of maintaining their own copies.

## User Stories

1. As a developer adding a new environment variable, I want to add it to a single canonical list, so that it's automatically available in every part of the application that reads env vars.
2. As a developer bootstrapping a new deployment environment, I want a single source of truth for required env vars, so that I can audit the complete list without scanning multiple files.
3. As a developer reviewing env-var usage, I want the canonical list to be the single place where env var names are defined, so that I can trace every consumer through a single import.
4. As a developer working on the Cloudflare Worker API, I want its env-binding logic to stay in sync with the main web app's middleware, so that both runtimes see the same env vars.
5. As a developer debugging an env-var issue, I want `clientIp` to behave identically in both runtime contexts, so that I don't chase phantom differences.
6. As a developer maintaining the API worker, I want security headers applied to every API response, so that the API has the same security posture as the web app's middleware.
7. As a developer adding a new runtime context, I want security headers to be a single import away, so that new contexts don't silently skip security hardening.

## Implementation Decisions

### Module `env.ts`

- `REQUIRED_ENV_KEYS`: a `readonly` tuple of 12 string literals (`as const`) listing every env var the project reads.
- `syncEnvBindings(bindings: Record<string, unknown>): void` — iterates `REQUIRED_ENV_KEYS`, copies each from `bindings` into `process.env` if not already set.
- Self-check assert at module level: `console.assert(REQUIRED_ENV_KEYS.length === 12, 'REQUIRED_ENV_KEYS length mismatch')`.
- The guard `!process.env[key]` is preserved — local `.env` values take precedence over platform bindings. A separate GitHub issue tracks whether this override behavior should be inverted.

### Module `request.ts`

- `clientIp(request: Request): string` — reads `x-forwarded-for` / `x-real-ip` headers, falls back to `"unknown"`.
- `setSecurityHeaders(response: Response): void` — sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, and `Content-Security-Policy` headers on a standard Web `Response` object.

### Packaging

- Both live in `packages/config/src/`, compiled to `dist/src/env.js` and `dist/src/request.js`.
- `package.json` exports entries `"./env"` and `"./request"`, each pointing to its `dist/src/*.js` + `dist/src/*.d.ts`.
- `@recetario/config` already has a build step — no new build infrastructure needed.

### Consumer changes

- `apps/web/src/middleware.ts`: remove local `ENV_KEYS`, `syncBindingsToProcessEnv`, `clientIp`, and `setSecurityHeaders`. Import from `@recetario/config/env` and `@recetario/config/request`.
- `apps/api/src/index.ts`: remove local `ENV_KEYS`, `syncBindingsToProcessEnv`, and `clientIp`. Import from `@recetario/config/env` and `@recetario/config/request`. Expand existing `app.use("*")` middleware to call `setSecurityHeaders(c.res)` after `await next()`.
- `apps/web/package.json`: add `"@recetario/config": "workspace:^"` dependency (currently missing; `apps/api` already has it).

### Environment variable list (unchanged, 12 keys)

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `PUBLIC_APP_URL`, `RECIPES_STATIC_OWNER_EMAIL`, `RECIPES_STATIC_OWNER_ID`, `RESEND_API_KEY`, `SENDER_EMAIL`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

## Testing Decisions

No test infrastructure exists. Verification is operational:

- `pnpm astro check` confirms no type errors.
- Root `pnpm build` confirms the full monorepo compiles (turbo resolves `@recetario/config` before its dependents).
- Self-check assert in `env.ts` catches accidental drift in `REQUIRED_ENV_KEYS` length at runtime.
- Run the dev server and confirm middleware resolves `Astro.locals.user` and `Astro.locals.subscription` correctly.
- Run the Worker API locally and confirm auth and Stripe endpoints function with the shared modules.
- Confirm API responses include security headers (previously absent).
- Audit: `grep -r "ENV_KEYS" packages/ apps/` returns only the canonical definition in `packages/config/src/env.ts` and its imports.

## Out of Scope

- Adding, removing, or renaming any environment variables.
- Environment variable validation (e.g., checking that required vars are non-empty strings).
- A typed env config object — this is just extracting the existing pattern without changing its shape.
- Any other cross-package utilities beyond `REQUIRED_ENV_KEYS`, `syncEnvBindings`, `clientIp`, and `setSecurityHeaders`.
- Changing the `!process.env[key]` guard behavior (separate issue to track).

## Further Notes

This is Candidate #2 from the July 24, 2026 architecture review. It depends on `packages/config` having a build step — which is already scoped in the lazy-init factory. The change is a pure refactor with zero behavioral impact except for the API worker gaining security headers (which it previously lacked). Turbo's `dependsOn: ["^build"]` ensures correct build ordering.
