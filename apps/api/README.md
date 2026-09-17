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
- **CSRF** — `src/middleware/csrf.ts` guards every `POST|PUT|PATCH|DELETE`:
  trusted `Origin`/`Referer` when present, plus a double-submit token
  (`x-csrf-token` header or `_csrf` form field against the `csrf_token`
  cookie) for browser requests that carry cookies. Exempt: `/api/auth/**`
  (Better Auth checks its own origin) and the signature-authenticated
  `POST /api/stripe/webhook`.
- **Entitlements** — `src/entitlements.ts` (`requireRecipeCapacity`,
  `requireIngredientCapacity`, `requireFeature`) is the authoritative gate
  for plan limits and feature flags; it throws `PLAN_LIMIT` /
  `FEATURE_REQUIRED` (403) and fails closed to the free plan when the user
  has no subscription row.
- **Envelope** — `src/envelope.ts` wraps every error response in the
  canonical `{ error: { code, message, … } }` shape so the web's
  `apiFetch` can parse it via `parseApiError` from `@recetario/types`.

## 2. How to add a new endpoint

Worked example: `GET /api/billing/subscription`.

1. **Schema first.** Add the response shape to
   `packages/types/src/api/billing.ts`:

   ```ts
   export const userSubscriptionInfoSchema = z.object({
     tier: z.enum(["free", "basic", "pro"]),
     status: z.enum(["active", "trialing", "canceled", "past_due", "unpaid", "incomplete"]).nullable(),
     // …
   });
   export type UserSubscriptionInfo = z.infer<typeof userSubscriptionInfoSchema>;
   ```

   Re-export from `packages/types/src/index.ts` if the file is new.

2. **Handler.** Create `src/billing/subscription.ts`:

   ```ts
   import type { Handler } from "hono";
   import { auth } from "@recetario/auth/server";
   import { getSubscriptionByUserId } from "@recetario/db";
   import { userSubscriptionInfoSchema } from "@recetario/types";
   import { ApiError } from "../errors";
   import * as cache from "../cache";

   const CACHE_TTL_MS = 60_000;

   export function subscriptionHandler(): Handler {
     return async (c) => {
       const session = await auth.api.getSession({ headers: c.req.raw.headers });
       if (!session?.user) throw new ApiError("UNAUTHENTICATED", "Authentication required");

       const cacheKey = `sub:${session.user.id}`;
       const cached = cache.get<unknown>(cacheKey);
       if (cached !== undefined) return c.json(cached);

       const dbSub = await getSubscriptionByUserId(session.user.id, ["active", "trialing"]);
       if (!dbSub) throw new ApiError("NOT_FOUND", "No active subscription");

       const response = userSubscriptionInfoSchema.parse({
         tier: dbSub.plan?.tier ?? "free",
         status: dbSub.status,
         recipesLimit: dbSub.plan?.recipesLimit ?? null,
         ingredientsLimit: dbSub.plan?.ingredientsLimit ?? null,
         features: JSON.parse(dbSub.plan?.featuresJson ?? "{}"),
         priceCents: dbSub.plan?.priceCents ?? null,
         currency: dbSub.plan?.currency ?? null,
         billingInterval: dbSub.plan?.billingInterval ?? null,
         currentPeriodEnd: dbSub.currentPeriodEnd?.toISOString() ?? null,
         cancelAtPeriodEnd: dbSub.cancelAtPeriodEnd,
         isTrial: dbSub.status === "trialing",
         trialEnd: dbSub.trialEnd?.toISOString() ?? null,
       });
       cache.set(cacheKey, response, CACHE_TTL_MS);
       return c.json(response);
     };
   }
   ```

3. **Wire the route** in `src/index.ts` next to its siblings:

   ```ts
   import { subscriptionHandler } from "./billing/subscription";
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
      { schema: userSubscriptionInfoSchema },
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
import { ApiError } from "../errors";

throw new ApiError("NOT_FOUND", "Recipe not found");
throw new ApiError("VALIDATION_ERROR", "Invalid recipe input");
```

The global `errorHandler()` (mounted in `src/index.ts`) catches the throw,
maps the `ApiErrorCode` to an HTTP status via `codeToStatus()`, and emits
the canonical envelope. Returning `c.json({ error: ... }, 400)` by hand
will work but is wrong — it bypasses the canonical error handling and any
future logging/observability the handler adds.

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

## 6. Abuse protection

API rate limiting is currently disabled. A replacement will be designed and
added later with appropriate shared storage and endpoint-specific controls.

## 7. Test setup

`vitest run` in this package. Helpers in `src/test-utils/`:

```ts
import { createTestRequest, createTestEnv } from "../test-utils/index";

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

The web app's transport (see `apps/web/server/utils/api-transport.ts`)
prefers the `API` service binding declared in `apps/web/wrangler.jsonc`:

```jsonc
"services": [{ "binding": "API", "service": "recetario-api" }]
```

In dev there's no service binding; the transport falls back to
`INTERNAL_API_URL` (platform `.dev.vars` → `process.env` →
`runtimeConfig`, default `http://localhost:8787`).
`sync-cloudflare-dev-vars.mjs` keeps the root `.env` and
`apps/{web,api}/.dev.vars` in sync, so the dev server starts on the
right port automatically.

In production the `/api/**` relay is a Nitro route
(`apps/web/server/routes/api/[...path].ts`) that forwards the raw
request through the binding, preserving cookies, origin and every
`Set-Cookie`. In dev it goes over HTTP. The Astro tree keeps its own
relay in `apps/web/src/middleware.ts` as reference until Task 13.

## 9. Endpoint inventory

| Method | Path | Auth | Cache TTL | Notes |
|--------|------|------|-----------|-------|
| GET    | `/health` | none | — | Liveness probe. |
| POST   | `/api/auth/forgot-password` | none | — | Always returns success regardless of email existence. |
| GET    | `/api/auth/reset-password` | token | — | Validates a password-reset token. |
| POST   | `/api/auth/reset-password` | token | — | Marks token used; logs audit event. |
| GET    | `/api/auth/session` | optional | — | Pass-through to `auth.api.getSession`. Used by `apps/web` middleware. |
| ALL    | `/api/auth/*` | varies | — | Catch-all for Better Auth. |
| POST   | `/api/account/update-name` | user | — | JSON `{firstName,lastName}`; returns the shaped name. |
| POST   | `/api/account/change-email` | user | — | JSON; triggers verification email. No UI yet. |
| POST   | `/api/account/change-password` | user | — | JSON; same policy as sign-up (`validatePassword`: 8+, mayúscula, minúscula, número, especial). |
| GET    | `/api/preferences` | user | 60 s | Creates default if missing. |
| PUT    | `/api/preferences` | user | invalidates `prefs:{userId}` | — |
| GET    | `/api/billing/subscription` | user | 60 s | Resolves tier from active subscription. 404 if no subscription. |
| GET    | `/api/billing/plans` | none | 60 s | Active plans, ordered by price. |
| POST   | `/api/stripe/checkout` | user | — | Requires CSRF. |
| POST   | `/api/stripe/portal` | user | — | Requires CSRF. |
| POST   | `/api/stripe/sync-session` | user | — | Requires CSRF. `{ok:true}` o envelope (404/409/500). |
| POST   | `/api/stripe/webhook` | sig | — | Signature-verified. |
| GET    | `/api/recipes` | user | — | Summaries only. |
| GET    | `/api/recipes/by-ids` | user | 60 s | Max 100 ids; order-insensitive key. |
| GET    | `/api/recipes/:id` | user | — | Detail with ingredients, presentations, fixed costs. |
| POST   | `/api/recipes` | user | — | Minimal create; full details come from PATCH. |
| PATCH  | `/api/recipes/:id` | user | — | Destructive: deletes & re-creates `RecipeIngredient` rows in a transaction. |
| DELETE | `/api/recipes/:id` | user | — | Cascades to ingredients and presentations. |
| POST   | `/api/recipes/:id/fixed-costs` | user | — | — |
| PATCH  | `/api/recipes/:id/fixed-costs/:fid` | user | — | Partial. |
| DELETE | `/api/recipes/:id/fixed-costs/:fid` | user | — | — |
| GET    | `/api/recipes/:id/presentations` | user | — | Includes per-presentation fixed costs. |
| GET    | `/api/ingredients` | user | — | Trimmed to `{ id, name, unit }`. |
| POST   | `/api/ingredients` | user | — | — |
| PATCH  | `/api/ingredients/:id` | user | — | — |
| DELETE | `/api/ingredients/:id` | user | — | Returns 409 `ingredient_in_use` if referenced. |
| GET    | `/api/ingredients/:id/usage` | user | — | Recipes that reference this ingredient. |

`Auth = user` means the endpoint requires a Better Auth session. `Auth = none` means the endpoint is publicly callable; `Auth = optional` means it works either way.

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
`get / set` surface over a single `Map`. The block
comment at the top of the file spells out the upgrade:

1. Add a `CacheBackend` interface with the same two methods
   (`get(key)`, `set(key, value, ttlMs)`).
2. Implement `InMemoryBackend` (move the current body) and `RedisBackend`
   (new). Talk to Upstash or Cloudflare Workers KV; both work via the
   `fetch` API in a workerd isolate.
3. Pick the backend at module init based on `env.CACHE_BACKEND`. Don't
   expose backend selection per-request.

Callers don't change. The cache key conventions in §5 are stable
across backends, so handlers stay put.

The `pg.Pool` wedge documented in `@recetario/db`'s constraints
(constraint #63) does **not** apply here — the cache is in-process
memory, not a connection-pooled resource. The 60 s TTLs are short
enough that the eventual-consistency story is fine for read paths
even after a swap to a shared backend.
