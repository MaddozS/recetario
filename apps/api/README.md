# `apps/api` — Recetario API worker

Hono-based Cloudflare Worker that owns all data-plane endpoints for the
Recetario web app. The web app (`apps/web`) talks to this worker for every
authenticated read/write, for Better Auth, and for Stripe webhooks.

The web app renders HTML and holds one-off presentation helpers (see
`apps/web/app/features/production/production-calculator.ts`). Anything
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
  has no subscription row. Read routes that are the only path to gated data
  (`GET /api/recipes/by-ids`) run the gate too.
- **Envelope** — `src/envelope.ts` wraps every error response in the
  canonical `{ error: { code, message, … } }` shape so the web's `useApi()`
  can parse it via `parseApiError` from `@recetario/types`.

## 2. How to add a new endpoint

Worked example: a `GET` read path with its shared schema.

1. **Schema first.** Add the response shape to
   `packages/types/src/api/billing.ts`:

   ```ts
   export const userSubscriptionInfoSchema = z.object({
     tier: z.enum(["free", "basic", "pro"]),
     status: z
       .enum([
         "active",
         "trialing",
         "canceled",
         "past_due",
         "unpaid",
         "incomplete",
       ])
       .nullable(),
     // …
   });
   export type UserSubscriptionInfo = z.infer<
     typeof userSubscriptionInfoSchema
   >;
   ```

   Re-export from `packages/types/src/index.ts` if the file is new.

2. **Handler.** Create `src/billing/subscription.ts`:

   ```ts
   import type { Handler } from "hono";
   import { auth } from "@recetario/auth/server";
   import { getSubscriptionByUserId } from "@recetario/db";
   import { userSubscriptionInfoSchema } from "@recetario/types";
   import { ApiError } from "../errors";

   export function subscriptionHandler(): Handler {
     return async (c) => {
       const session = await auth.api.getSession({
         headers: c.req.raw.headers,
       });
       if (!session?.user)
         throw new ApiError("UNAUTHENTICATED", "Authentication required");

       const dbSub = await getSubscriptionByUserId(session.user.id, [
         "active",
         "trialing",
       ]);
       if (!dbSub) throw new ApiError("NOT_FOUND", "No active subscription");

       const response = userSubscriptionInfoSchema.parse({
         tier: dbSub.plan?.tier ?? "free",
         // …
       });
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
   `auth.api.getSession` and the data-layer functions.

5. **Consumer.** In `apps/web`, call it through the same-origin relay with
   `useApi()` (SSR-safe, Zod-validated):

   ```ts
   const { data } = await useApi("/api/billing/subscription", {
     schema: userSubscriptionInfoSchema,
   });
   ```

## 3. Zod schemas live in `@recetario/types`

Never inline a `z.object({...})` in a handler. Both the handler and the
web consumer parse the same response, so the schema must be a single shared
export. If the TS type and the Zod schema diverge, the consumer will reject
a valid server response (or vice-versa).

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

## 5. Caching

There is **no in-memory cache in this worker**, and no query caching at all:
the Prisma client reaches Prisma Postgres over TCP (`@prisma/adapter-pg`), one
client per request, so every read goes to the database. The hot
entitlement path (`getSubscriptionByUserId`, behind `/api/auth/session` and
every authenticated page) is deliberately **uncached** — stale entitlements
after a plan change are worse than a cheap indexed query.
`getUserPreferences` and `getCredentialAccount` lost their Accelerate edge
cache when Accelerate retired (ADR 0010); they are plain indexed reads now.

If a future read path genuinely needs shared caching, design it explicitly
(Cloudflare KV/cache API or Upstash) and document the key convention — never
cache tenant data without a per-user key.

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

Run the suite with the shell env cleaned (`WEB_ORIGIN`, `BETTER_AUTH_URL`
and `PUBLIC_APP_URL` unset) to match CI:

```bash
env -u WEB_ORIGIN -u BETTER_AUTH_URL -u PUBLIC_APP_URL pnpm --filter @recetario/api test
```

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

The `/api/**` relay is a Nitro route
(`apps/web/server/routes/api/[...path].ts`) that forwards the raw request
through the binding, preserving cookies, origin and every `Set-Cookie`.

A service binding forwards the **original `Host` header** of the caller, not
the target worker's host: the upstream `INTERNAL_API_HOST` allowlist must
match the calling worker's public host per environment (or be unset).

## 9. Endpoint inventory

| Method | Path                                | Auth     | Notes                                                                                          |
| ------ | ----------------------------------- | -------- | ---------------------------------------------------------------------------------------------- |
| GET    | `/health`                           | none     | Liveness probe.                                                                                |
| POST   | `/api/auth/forgot-password`         | none     | Always returns success regardless of email existence.                                          |
| GET    | `/api/auth/reset-password`          | token    | Validates a password-reset token.                                                              |
| POST   | `/api/auth/reset-password`          | token    | Marks token used; logs audit event.                                                            |
| GET    | `/api/auth/session`                 | optional | Pass-through to `auth.api.getSession`, plus preferences. Used by every SSR request.            |
| ALL    | `/api/auth/*`                       | varies   | Catch-all for Better Auth.                                                                     |
| POST   | `/api/account/update-name`          | user     | JSON `{firstName,lastName}`; returns the shaped name.                                          |
| POST   | `/api/account/change-email`         | user     | JSON; triggers verification email. No UI yet.                                                  |
| POST   | `/api/account/change-password`      | user     | JSON; same policy as sign-up (`validatePassword`: 8+, mayúscula, minúscula, número, especial). |
| GET    | `/api/preferences`                  | user     | Creates default if missing.                                                                    |
| PUT    | `/api/preferences`                  | user     | Partial update; response is the new state.                                                     |
| GET    | `/api/billing/subscription`         | user     | Resolves tier from active subscription. 404 if no subscription.                                |
| GET    | `/api/billing/plans`                | none     | Active plans, ordered by price.                                                                |
| POST   | `/api/stripe/checkout`              | user     | Requires CSRF.                                                                                 |
| POST   | `/api/stripe/portal`                | user     | Requires CSRF.                                                                                 |
| POST   | `/api/stripe/sync-session`          | user     | Requires CSRF. `{ok:true}` o envelope (404/409/500).                                           |
| POST   | `/api/stripe/webhook`               | sig      | Signature-verified.                                                                            |
| GET    | `/api/recipes`                      | user     | Summaries only.                                                                                |
| GET    | `/api/recipes/by-ids`               | user     | Max 100 ids; requires `production_planner` and the Basic tier cap.                             |
| GET    | `/api/recipes/:id`                  | user     | Detail with ingredients, presentations, fixed costs.                                           |
| POST   | `/api/recipes`                      | user     | Minimal create; full details come from PATCH.                                                  |
| PATCH  | `/api/recipes/:id`                  | user     | Destructive: deletes & re-creates `RecipeIngredient` rows in a transaction.                    |
| DELETE | `/api/recipes/:id`                  | user     | Cascades to ingredients and presentations.                                                     |
| POST   | `/api/recipes/:id/fixed-costs`      | user     | —                                                                                              |
| PATCH  | `/api/recipes/:id/fixed-costs/:fid` | user     | Partial.                                                                                       |
| DELETE | `/api/recipes/:id/fixed-costs/:fid` | user     | —                                                                                              |
| GET    | `/api/recipes/:id/presentations`    | user     | Includes per-presentation fixed costs.                                                         |
| GET    | `/api/ingredients`                  | user     | Trimmed to `{ id, name, unit }`.                                                               |
| POST   | `/api/ingredients`                  | user     | —                                                                                              |
| PATCH  | `/api/ingredients/:id`              | user     | —                                                                                              |
| DELETE | `/api/ingredients/:id`              | user     | Returns 409 `ingredient_in_use` if referenced.                                                 |
| GET    | `/api/ingredients/:id/usage`        | user     | Recipes that reference this ingredient.                                                        |

`Auth = user` means the endpoint requires a Better Auth session. `Auth = none` means the endpoint is publicly callable; `Auth = optional` means it works either way.

## 10. Adding a handler for an existing web flow

Checklist for a feature that needs data access from `apps/web`:

- [ ] **Schema first.** Define the request body and response shape in
      `packages/types/src/api/<feature>.ts`; re-export from the package
      barrel.
- [ ] **Handler module.** Create `src/<feature>/<name>.ts` exporting
      `<name>Handler(): Handler`. Pattern is the same for read/write/delete
      — see `recipes/list.ts` and `recipes/delete.ts` for the two ends of
      the spectrum.
- [ ] **Auth + ownerId.** Resolve the session, throw `UNAUTHENTICATED` on
      miss. Scope every data-layer call by `ownerId` (the db package
      enforces it, but never bypass it). Cross-tenant rows return 404, not 403.
- [ ] **Gate.** Mutations and gated reads go through
      `requireRecipeCapacity` / `requireIngredientCapacity` /
      `requireFeature` before touching data.
- [ ] **Error path.** Throw `ApiError` codes, not hand-rolled JSON. Use
      `NOT_FOUND` for cross-tenant and missing rows, `VALIDATION_ERROR`
      for bad bodies, `DOMAIN_ERROR` for known business-rule failures
      (with a `reason` from `@recetario/types/api/reasons`).
- [ ] **Test.** Co-located `<name>.test.ts`; mock `@recetario/auth/server`
      and the data-layer functions you import from `@recetario/db`.
- [ ] **Wire it** in `src/index.ts` next to its feature siblings.
- [ ] **Web consumer.** Call it through the relay with `useApi()` and the
      same Zod schema you exported. Don't add `useAsyncData` wrappers that
      bypass the relay.
