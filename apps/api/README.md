# `apps/api` — Recetario API worker

Hono-based Cloudflare Worker that owns all data-plane endpoints for the
Recetario web app. The web app (`apps/web`) talks to this worker for every
authenticated read/write, for Better Auth, and for Stripe webhooks.

The web app is the source of truth for HTML, layouts, and one-off server-side
transformations (see `apps/web/src/lib/production-calculator.ts`). Anything
that mutates user data or hits Stripe goes here.

## 1. Stack

- **Hono** — routing and middleware composition. Each handler is a
  `Handler` factory in `src/<feature>/<name>.ts`; the routes are wired up
  in `src/index.ts`.
- **Prisma** + `@prisma/adapter-pg` — PostgreSQL access via a `pg.Pool`
  singleton declared in `packages/db`. Every Prisma query in this worker
  is scoped by `ownerId` (the session user's id); never call a tenant query
  without `where: { ownerId: ... }` or `where: { recipe: { ownerId } }`.
- **Better Auth** — `auth.api.getSession({ headers: c.req.raw.headers })`
  for session lookups, `auth.handler(c.req.raw)` for the catch-all
  `/api/auth/*`. Imported from `@recetario/auth/server`.
- **Zod** — every request body and every response body has a schema in
  `packages/types/src/api/`. Handlers parse with `.safeParse()` and throw
  `new ApiError("VALIDATION_ERROR", ...)` on failure.
- **Cache module** — `src/cache.ts` is an in-memory LRU + stale-while-error
  helper. Replaceable by Redis (see §11).
- **Host allowlist** — `src/host-allowlist.ts` rejects requests whose
  `Host` header doesn't match `INTERNAL_API_HOST` (production tier only;
  dev leaves the allowlist empty).
- **Envelope** — `src/envelope.ts` wraps every error response in the
  canonical `{ error: { code, message, … } }` shape so the web's
  `apiFetch` can parse it via `parseApiError` from `@recetario/types`.
- **Rate limit** — `src/rate-limit.ts` (global) and the in-handler
  `rateLimitCheck()` from `@recetario/auth/server` for the special
  auth-tier limits on the catch-all.

## 2. How to add a new endpoint

Worked example: `GET /api/billing/subscription`.

1. **Schema first.** Add the response shape to
   `packages/types/src/api/billing.ts`:

   ```ts
   export const subscriptionResponseSchema = z.object({
     tier: z.enum(["free", "basic", "pro"]),
     status: z.enum(["active", "trialing", "canceled", "past_due", "unpaid", "incomplete"]).nullable(),
     // …
   });
   export type SubscriptionResponse = z.infer<typeof subscriptionResponseSchema>;
   ```

   Re-export from `packages/types/src/index.ts` if the file is new.

2. **Handler.** Create `src/billing/subscription.ts`:

   ```ts
   import type { Handler } from "hono";
   import { auth } from "@recetario/auth/server";
   import { getUserSubscription, resolveSubscription } from "@recetario/billing";
   import { ApiError } from "../errors.js";
   import * as cache from "../cache.js";

   const CACHE_TTL_MS = 60_000;

   export function subscriptionHandler(): Handler {
     return async (c) => {
       const session = await auth.api.getSession({ headers: c.req.raw.headers });
       if (!session?.user) {
         throw new ApiError("UNAUTHENTICATED", "Authentication required");
       }

       const cacheKey = `sub:${session.user.id}`;
       const cached = cache.get<unknown>(cacheKey);
       if (cached !== undefined) return c.json(cached);

       const dbSub = await getUserSubscription(session.user.id);
       if (!dbSub) throw new ApiError("NOT_FOUND", "No active subscription");

       const resolved = resolveSubscription(dbSub);
       cache.set(cacheKey, resolved, CACHE_TTL_MS);
       return c.json(resolved);
     };
   }
   ```

3. **Wire the route** in `src/index.ts` next to its siblings:

   ```ts
   import { subscriptionHandler } from "./billing/subscription.js";
   …
   app.get("/api/billing/subscription", subscriptionHandler());
   ```

4. **Test.** Co-locate `src/billing/subscription.test.ts`. Use
   `createTestRequest` and `createTestEnv` from `src/test-utils/`. Mock
   `auth.api.getSession` and the data-layer functions; assert the response
   body shape and the cache behaviour.

5. **Consumer.** In `apps/web`, call via `apiFetch` from `@/lib/api-client`:

   ```ts
   const sub = await apiFetch(
     "/api/billing/subscription",
     { schema: subscriptionResponseSchema },
     Astro.request,
   );
   ```

## 3. Zod schemas live in `@recetario/types`

Never inline a `z.object({...})` in a handler. Both the handler and the
web consumer parse the same response, so the schema must be a single shared
export. If the TS type and the Zod schema diverge, the `apiFetch` consumer
will reject a valid server response (or vice-versa).

Default to `.passthrough()` on response objects so server-side field
additions don't break clients pinned to an older type. Request bodies should
use `.strict()` (Zod's default for `z.object`).

## 4. Throw `ApiError`; never return error JSON by hand

```ts
import { ApiError } from "../errors.js";

throw new ApiError("NOT_FOUND", "Recipe not found");
throw new ApiError("VALIDATION_ERROR", "Invalid recipe input");
throw new ApiError("RATE_LIMITED", "Too many requests", 60_000); // retryAfterMs
```

The global `errorHandler()` (mounted in `src/index.ts`) catches the throw,
maps the `ApiErrorCode` to an HTTP status via `codeToStatus()`, and emits
the canonical envelope. Returning `c.json({ error: ... }, 400)` by hand
will work but is wrong — it bypasses the rate-limit `Retry-After` header,
the traceId plumbing, and any future logging/observability the handler
adds.

For "the row was owned by a different user" cases, throw
`new ApiError("NOT_FOUND", "…")`, not `403`. Returning 403 leaks the
existence of the row; 404 is the safe default.

## 5. Cache key conventions

`<namespace>:<userId>:<optionalId>`. Namespaces in use:

| Namespace | Owner | Notes |
|-----------|-------|-------|
| `sub:{userId}` | `billing/subscription.ts` | Resolved subscription view. Invalidated implicitly via TTL. |
| `prefs:{userId}` | `preferences/get.ts` + `update.ts` | Update handler writes through, no separate invalidation. |
| `plans:all` | `billing/plans.ts` | Global; not user-scoped. Refresh after a plan mutation. |
| `recipes-by-ids:{userId}:{sortedIds}` | `recipes/by-ids.ts` | Reorder the ids in the request → same cache key. |

Always cache by **user**. A row that one user can't see must not be served
from another user's cache key. `recipes-by-ids` is the obvious place this
matters; ordering of ids in the key is the subtle gotcha — sort before
joining so `?ids=1,2,3` and `?ids=3,1,2` share the same entry.

## 6. Rate limit

The global middleware in `src/rate-limit.ts` covers every route
automatically:

| Scope | Key | Cap | Window |
|-------|-----|-----|--------|
| Authenticated read (`GET`/`HEAD`/`OPTIONS`) | `ratelimit:user:{userId}:read` | 60 | 60 s |
| Authenticated write (`POST`/`PUT`/`PATCH`/`DELETE`) | `ratelimit:user:{userId}:write` | 10 | 60 s |
| Unauthenticated (no `x-user-id`) | `ratelimit:ip:{ip}` | 30 | 60 s |

The auth catch-all (`/api/auth/*`) **opts out of the global middleware's
counters** and uses the stricter auth-specific limits from
`rateLimitCheck()` instead:

| Path | Key | Cap | Window |
|------|-----|-----|--------|
| `POST /api/auth/sign-in/email` | `signin:{ip}` | 5 | 60 s |
| `POST /api/auth/sign-up/email` | `signup:{ip}` | 3 | 3600 s |
| `POST /api/auth/sign-in/social` | `oauth:{ip}` | 10 | 900 s |
| `POST /api/auth/forget-password` | `forgot:{ip}` | 3 | 3600 s |

The Stripe webhook (`POST /api/stripe/webhook`) is signature-verified
inside the handler and is **not** rate-limited — Stripe's retries are the
real back-pressure.

## 7. Test setup

`vitest run` in this package. Helpers in `src/test-utils/`:

```ts
import { createTestRequest, createTestEnv } from "../test-utils/index.js";

const env = createTestEnv();
const req = createTestRequest("/api/recipes", { method: "GET" });
```

Mock `@recetario/auth/server` at the top of the test file:

```ts
const mockGetSession = vi.fn();
vi.mock("@recetario/auth/server", () => ({
  auth: { api: { getSession: (args: unknown) => mockGetSession(args) } },
}));
```

For data-layer mocks, mock the `@recetario/db` named export the handler
imports. Don't reach into Prisma — the worker doesn't own the schema, and
mocking the named export keeps the seam clean.

## 8. Service binding in prod, `INTERNAL_API_URL` in dev

The web app's `apiFetch` (see `apps/web/src/lib/api-client.ts`) prefers
the `API` service binding declared in `apps/web/wrangler.jsonc`:

```jsonc
"services": [{ "binding": "API", "service": "recetario-api" }]
```

In dev there's no service binding; `apiFetch` falls back to
`import.meta.env.INTERNAL_API_URL` (defaults to `http://localhost:8787`).
`sync-cloudflare-dev-vars.mjs` keeps the root `.env` and
`apps/{web,api}/.dev.vars` in sync, so the dev server starts on the
right port automatically.

In production the web middleware relays `/api/auth/*` through the same
binding (see `apps/web/src/middleware.ts:0`); in dev the Vite proxy in
`apps/web/astro.config.mjs` handles it before the request reaches the
middleware.

## 9. Endpoint inventory

| Method | Path | Auth | Rate-limit tier | Cache TTL | Notes |
|--------|------|------|-----------------|-----------|-------|
| GET    | `/health` | none | none | — | Liveness probe. |
| POST   | `/api/auth/forgot-password` | none | `forgot:{ip}` 3/3600s | — | Always returns success regardless of email existence. |
| GET    | `/api/auth/reset-password` | token | none | — | Validates a password-reset token. |
| POST   | `/api/auth/reset-password` | token | none | — | Marks token used; logs audit event. |
| GET    | `/api/auth/session` | optional | none | — | Pass-through to `auth.api.getSession`. Used by `apps/web` middleware. |
| ALL    | `/api/auth/*` | varies | per-path (signin/signup/oauth/forgot) | — | Catch-all for Better Auth. |
| POST   | `/api/account/update-name` | user | write | — | First/last name. |
| POST   | `/api/account/change-email` | user | write | — | Triggers verification email. |
| POST   | `/api/account/change-password` | user | write | — | Min length 6. |
| GET    | `/api/preferences` | user | read | 60 s | Creates default if missing. |
| PUT    | `/api/preferences` | user | write | invalidates `prefs:{userId}` | — |
| GET    | `/api/billing/subscription` | user | read | 60 s | Resolves tier from active subscription. 404 if no subscription. |
| GET    | `/api/billing/plans` | none | read | 60 s | Active plans, ordered by price. |
| POST   | `/api/stripe/checkout` | user | write | — | Requires CSRF. |
| POST   | `/api/stripe/portal` | user | write | — | Requires CSRF. |
| POST   | `/api/stripe/webhook` | sig | none | — | Signature-verified; no rate limit. |
| GET    | `/api/recipes` | user | read | — | Summaries only. |
| GET    | `/api/recipes/by-ids` | user | read | 60 s | Max 100 ids; order-insensitive key. |
| GET    | `/api/recipes/:id` | user | read | — | Detail with ingredients, presentations, fixed costs. |
| POST   | `/api/recipes` | user | write | — | Minimal create; full details come from PATCH. |
| PATCH  | `/api/recipes/:id` | user | write | — | Destructive: deletes & re-creates `RecipeIngredient` rows in a transaction. |
| DELETE | `/api/recipes/:id` | user | write | — | Cascades to ingredients and presentations. |
| POST   | `/api/recipes/:id/fixed-costs` | user | write | — | — |
| PATCH  | `/api/recipes/:id/fixed-costs/:fid` | user | write | — | Partial. |
| DELETE | `/api/recipes/:id/fixed-costs/:fid` | user | write | — | — |
| GET    | `/api/recipes/:id/presentations` | user | read | — | Includes per-presentation fixed costs. |
| GET    | `/api/ingredients` | user | read | — | Trimmed to `{ id, name, unit }`. |
| POST   | `/api/ingredients` | user | write | — | — |
| PATCH  | `/api/ingredients/:id` | user | write | — | — |
| DELETE | `/api/ingredients/:id` | user | write | — | Returns 409 `ingredient_in_use` if referenced. |
| GET    | `/api/ingredients/:id/usage` | user | read | — | Recipes that reference this ingredient. |

`Auth = user` means the global middleware saw a `x-user-id` header set by
the Better Auth session lookup. `Auth = none` means the endpoint is
publicly callable; `auth = optional` means it works either way.

## 10. Migrating an existing web endpoint to the API

Checklist for porting a route from `apps/web/src/pages/api/**` (or an
in-page POST handler that calls Prisma directly) to a handler here:

- [ ] **Schema first.** Define the request body and response shape in
      `packages/types/src/api/<feature>.ts`; re-export from the package
      barrel.
- [ ] **Handler module.** Create `src/<feature>/<name>.ts` exporting
      `<name>Handler(): Handler`. Pattern is the same for read/write/delete
      — see `recipes/list.ts` and `recipes/delete.ts` for the two ends of
      the spectrum.
- [ ] **Auth + ownerId.** Resolve the session, throw `UNAUTHENTICATED` on
      miss. Scope every Prisma call by `ownerId` (or `recipe: { ownerId }`).
      Cross-tenant rows return 404, not 403.
- [ ] **Cache.** Read paths that don't need real-time freshness: cache
      by `<namespace>:{userId}` (or with an id suffix) at 60 s TTL. Writes
      that should invalidate: write through, don't add a separate `invalidate`
      call. The cache is per-isolate so a fresh isolate starts cold.
- [ ] **Error path.** Throw `ApiError` codes, not hand-rolled JSON. Use
      `NOT_FOUND` for cross-tenant and missing rows, `VALIDATION_ERROR`
      for bad bodies, `DOMAIN_ERROR` for known business-rule failures
      (with a `reason` from `@recetario/types/api/reasons`).
- [ ] **Test.** Co-located `<name>.test.ts`; mock `@recetario/auth/server`
      and the data-layer functions you import from `@recetario/db`.
- [ ] **Wire it** in `src/index.ts` next to its feature siblings.
- [ ] **Web consumer.** Replace the in-page handler or the
      `apps/web/src/pages/api/<old>/` shim with an `apiFetch` call. Pass
      the response through the same Zod schema you exported.
- [ ] **Delete the old code** once the web side is fully migrated and
      `pnpm astro check` is clean. Don't leave deprecation shims around.

## 11. Redis swap path

The cache module (`src/cache.ts`) is intentionally a flat
`get / set / increment / peek` surface over a single `Map`. The block
comment at the top of the file spells out the upgrade:

1. Add a `CacheBackend` interface with the same three methods
   (`get(key)`, `set(key, value, ttlMs)`, `increment(key, ttlMs)`,
   plus `peek(key)` for the stale-while-error helper).
2. Implement `InMemoryBackend` (move the current body) and `RedisBackend`
   (new). Talk to Upstash or Cloudflare Workers KV; both work via the
   `fetch` API in a workerd isolate.
3. Pick the backend at module init based on `env.CACHE_BACKEND`. Don't
   expose backend selection per-request.

Callers don't change. The cache key conventions in §5 are stable
across backends, so handlers stay put. The only handlers that need to
adjust are the few that depend on `peek` for stale-while-error — that
needs a backend that supports per-key lastGoodAt alongside the value
(Redis `HMSET`/HGET, KV's metadata fields, or a sidecar key).

The `pg.Pool` wedge documented in `@recetario/db`'s constraints
(constraint #63) does **not** apply here — the cache is in-process
memory, not a connection-pooled resource. The 60 s TTLs are short
enough that the eventual-consistency story is fine for read paths
even after a swap to a shared backend.
