# Extract shared lazy-init factory

## Problem Statement

Developers modifying the codebase must copy-paste the same Proxy-based lazy-initialization boilerplate (~16 lines) every time a new module needs deferred client creation. The pattern is already duplicated across 4 files: `packages/db/src/prisma.ts`, `packages/auth/src/auth.ts`, `packages/stripe/src/stripe.ts`, and `apps/api/src/lib/prisma.ts`. If the pattern needs a fix (error handling, logging, debugging), it must be replicated in 4 separate places with no guarantee of consistency.

## Solution

Extract a single `lazyInit<T>(key, initFn)` factory into `@recetario/config` that encapsulates the singleton-guarded, HMR-safe, Proxy-based lazy initialization. Each consumer replaces ~16 lines of boilerplate with a one-liner. The factory lives in the shared `@recetario/config` package, which already exists as a cross-cutting configuration workspace. Behavior is unchanged — this is a pure refactor.

## User Stories

1. As a developer adding a new service client, I want to defer its initialization until first use with a one-line call, so that I don't need to understand or copy the Proxy pattern.
2. As a developer maintaining the lazy-init pattern, I want to fix or improve it in one place, so that all consumers benefit from the improvement automatically.
3. As a developer debugging a startup issue, I want a single trace point for all lazy clients, so that I can add debug logging once and see it across the entire project.
4. As a developer working with Vite SSR HMR, I want lazy-initialized clients to survive HMR reloads without accumulating duplicate connections, so that hot reloading doesn't exhaust database pools.
5. As a developer reading the Prisma, Auth, or Stripe modules, I want to see only the domain-specific init logic, so that the lazy-init machinery doesn't obscure what each module actually does.
6. As a developer in the Cloudflare Worker API, I want the same lazy-init pattern as the main web app, so that I don't need a separate mental model for worker initialization.

## Implementation Decisions

### lazyInit factory

- **Signature**: `lazyInit<T>(key: string, initFn: () => T): T`
- **Singleton**: `lazyInit` owns the singleton — calls `initFn` once, caches the result, and returns it on all subsequent property accesses. Init functions become pure factories with no internal guards.
- **HMR survival**: Uses a `globalThis.__lazySingletons` `Map<string, unknown>`, keyed by the required `key` parameter. This ensures that when Vite SSR HMR reloads the calling module, the cached singleton is recovered from `globalThis` rather than re-created, avoiding connection pool accumulation.
- **Error propagation**: Exceptions thrown by `initFn` propagate to the caller without wrapping. No retry logic — a failed initialization fails every time until the root cause is fixed.
- **Type safety**: Fully generic — TypeScript infers the return type from `initFn`. The Proxy is typed as `T`, not `any`.
- **Access pattern**: The Proxy traps `get` and delegates to the underlying client. Functions are `.bind(client)`-ed so they retain the correct `this` context.

### Packaging

- `@recetario/config` adds a `build` script (`tsc --build tsconfig.build.json`) that compiles `src/lazy.ts` → `dist/src/lazy.js`.
- `package.json` exports entry `"./lazy"` pointing to `dist/src/lazy.js` + `dist/src/lazy.d.ts`.
- `@recetario/config` moves from `devDependencies` to `dependencies` in `@recetario/auth`, `@recetario/stripe`, and `@recetario/db`.
- `@recetario/config` is added to `dependencies` in `@recetario/api`.
- The `apps/api` Prisma client uses `lazyInit("api:prisma", ...)` with a distinct key to avoid collision with `packages/db`'s `"prisma"` key.

### Consumer changes

Each of the 4 files replaces the existing Proxy pattern with a `lazyInit` call. The exported constants (`prisma`, `auth`, `stripe`) retain their existing names and types. The init functions are simplified by removing the internal singleton guard (`if (_client) return _client`).

## Testing Decisions

No test infrastructure exists in this project (per AGENTS.md). Verification is operational:

- Run the dev server and confirm auth, recipes, ingredients, and billing all load correctly — verifying Prisma, Auth, and Stripe lazy-init proxies all function identically.
- Run a full HMR cycle (edit a file during `pnpm dev`) and confirm no pool exhaustion or duplicate connections.
- Run the Cloudflare Worker API locally with `wrangler dev` and confirm the `"api:prisma"` key produces a valid PrismaClient.

## Out of Scope

- Retry logic for failed initialization.
- Generic lazy-init patterns beyond single-call factory functions (no parameterized keys or multi-tenant factories).
- Replacing the `any` cast in `initAuth`'s return type — that's a pre-existing typing issue in Better Auth integration, not related to lazy-init.
- Extracting other duplicated utilities (Candidate #2, syncBindingsToProcessEnv) — that's a separate effort.

## Further Notes

This is Candidate #1 from the July 24, 2026 architecture review. The change is a pure refactor with zero behavioral impact. All 4 lazy-init sites behave identically before and after. The biggest risk is build/packaging for `@recetario/config`, which previously had no build step or source directory.
