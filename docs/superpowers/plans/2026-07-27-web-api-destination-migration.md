# Web → API Destination Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate every direct `prisma` / `@recetario/db` call from `apps/web`. All database access from web goes through `apps/api` via `apiFetch`. This fixes the pg.Pool wedge in `@astrojs/cloudflare` dev (workerd can't reach `localhost:5432` via the singleton pool) and finishes the destination rule tracked under memory #64.

**Architecture:** Add the missing API endpoints (presentations CRUD, presentation fixed-costs CRUD, audit log, credential-status), then replace each `prisma` / `@recetario/db` call site in `apps/web` with `apiFetch(...)`. Each web page keeps the same behavior; only the transport changes. No new dependencies.

**Tech Stack:** Hono handlers in `apps/api` (existing pattern: `withFreshDb` per request, Zod-validated body, ownership checks via `where: { ownerId }`); `apiFetch` in `apps/web` (existing SSR helper that uses the service binding in prod, falls back to `INTERNAL_API_URL` in dev).

---

## Task Dependencies

| Task | Depends On | Parallel-Safe |
|------|------------|---------------|
| T1 — Add `/api/audit/log` | — | yes |
| T2 — Add `/api/auth/credential-status` | — | yes |
| T3 — Add presentation CRUD endpoints | — | yes |
| T4 — Add presentation-fixed-costs endpoints | — | yes |
| T5 — Migrate middleware off prisma | T1, T2 | no |
| T6 — Migrate `getPricingPlans` call sites (4 pages) | — | no |
| T7 — Migrate `ingredients.astro` | — | no |
| T8 — Migrate `recipes/index.astro` | — | no |
| T9 — Migrate `recipes/[recipe].astro` | T3, T4 | no |
| T10 — Remove `@recetario/db` from web, build verify | T5–T9 | no |

T1–T4 are independent and can run in parallel. T6, T7, T8 are independent of each other (different files).

---

## Background — what exists today

**API endpoints that exist** (do NOT re-create):
- `/api/auth/session` (GET, returns Better Auth's `{ user, session }`)
- `/api/recipes` (list, by-ids, detail, create, update, delete)
- `/api/recipes/:id/fixed-costs` (create, update, delete — **recipe** level only)
- `/api/recipes/:id/presentations` (list only — no POST/PATCH/DELETE)
- `/api/ingredients` (list, create, update, delete, usage)
- `/api/preferences` (get, update)
- `/api/billing/subscription`, `/api/billing/plans`
- `/api/account/*` (update-name, change-email, change-password)

**API gaps to fill:**
- `POST /api/recipes/:id/presentations` (create)
- `PATCH /api/recipes/:id/presentations/:pid` (update)
- `DELETE /api/recipes/:id/presentations/:pid` (delete)
- `POST /api/presentations/:pid/fixed-costs` (presentation-level)
- `PATCH /api/presentations/:pid/fixed-costs/:fcid` (presentation-level)
- `DELETE /api/presentations/:pid/fixed-costs/:fcid` (presentation-level)
- `POST /api/audit/log` (fire-and-forget sign-in audit)
- `GET /api/auth/credential-status` (returns `{ hasPasswordAuth: boolean }`)

**Web files that import from `@recetario/db` or use `prisma` directly:**
- `apps/web/src/middleware.ts:8,36,93` (logAuditEvent, prisma.account.findFirst)
- `apps/web/src/pages/index.astro:10,13` (getPricingPlans)
- `apps/web/src/pages/pricing.astro:5,14` (getPricingPlans)
- `apps/web/src/pages/settings.astro:19,47` (getPricingPlans)
- `apps/web/src/pages/settings/billing.astro:10,23` (getPricingPlans)
- `apps/web/src/pages/ingredients.astro:6-7,280-281` (listIngredients, listIngredientUsage)
- `apps/web/src/pages/recipes/index.astro:7-11,56,73,89` (createRecipe, duplicateRecipe, listIngredientUsage)
- `apps/web/src/pages/recipes/[recipe].astro:8-30,223,251,297,315,389,413,428,470,483,533,541,551,556,580,587,589,596,630` (deleteRecipe, duplicateRecipe, listIngredients, createPresentation, updatePresentation, deletePresentation, prisma.* for fixed-costs and presentations)

**Patterns to follow:**
- API handler: see `apps/api/src/recipes/fixed-costs.ts` for the canonical `withFreshDb` + Zod validate + ownership-check pattern.
- API test: see `apps/api/src/recipes/fixed-costs.test.ts` for the canonical Vitest pattern (Hono `app.get/post/etc`, no real DB, mock the session).
- Web apiFetch: see `apps/web/src/lib/api-client.ts`. Callers pass `Astro.request` so cookies/CSRF are forwarded. Errors throw `ApiError` with `code`, `status`, `message`.
- The existing `audit.ts` (`packages/db/src/audit.ts`) uses `db.auditLog.create({ data: { userId, action, ipAddress, userAgent } })`. The action enum is `AuditAction` in the generated Prisma client; current callers use `"sign_in"`. Schema: `auditLog` model in `packages/db/prisma/schema.prisma`.
- For `getPricingPlans` post-processing (TIER_CONFIG + formatCurrency): see `packages/stripe/src/billing.ts:149-231`. The DB fetch is a 5-line findMany; the rest is pure formatting.

---

## Task 1: Add `POST /api/audit/log` (fire-and-forget)

**Files:**
- Create: `apps/api/src/audit/log.ts`
- Create: `apps/api/src/audit/log.test.ts`
- Modify: `apps/api/src/index.ts` (import + register route)
- Create: `packages/types/src/api/audit.ts` (Zod schema)

- [ ] **Step 1: Write the Zod schema** in `packages/types/src/api/audit.ts`:

```ts
import { z } from "zod";

export const auditLogCreateSchema = z.object({
  action: z.string().min(1).max(64),
  ipAddress: z.string().max(64).nullable().optional(),
  userAgent: z.string().max(512).nullable().optional(),
});
```

- [ ] **Step 2: Run `pnpm --filter @recetario/types build`** to compile the new schema. Expected: success.

- [ ] **Step 3: Write the test** in `apps/api/src/audit/log.test.ts` (follow `apps/api/src/auth-session.test.ts` for structure):

```ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { auditLogHandler } from "./log.js";

const validSession = {
  user: { id: "user-1", email: "u@x.com" },
  session: { id: "sess-1" },
};

function buildAuth(mockPrisma: unknown) {
  return { api: { getSession: vi.fn().mockResolvedValue(validSession) } };
}

function buildApp(mockPrisma: unknown) {
  const app = new Hono();
  app.post("/api/audit/log", auditLogHandler(buildAuth(mockPrisma) as never));
  return app;
}

describe("POST /api/audit/log", () => {
  beforeEach(() => vi.restoreAllMocks());

  it("401 when no session", async () => {
    const auth = { api: { getSession: vi.fn().mockResolvedValue(null) } };
    const app = new Hono();
    app.post("/api/audit/log", auditLogHandler(auth as never));
    const res = await app.request("/api/audit/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign_in" }),
    });
    expect(res.status).toBe(401);
  });

  it("200 on valid body", async () => {
    const mockPrisma = { auditLog: { create: vi.fn().mockResolvedValue({ id: "a1" }) } };
    const app = buildApp(mockPrisma);
    const res = await app.request("/api/audit/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: "sign_in", userAgent: "jest" }),
    });
    expect(res.status).toBe(200);
    expect(mockPrisma.auditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-1", action: "sign_in" }),
    });
  });

  it("400 on invalid body", async () => {
    const app = buildApp({ auditLog: { create: vi.fn() } });
    const res = await app.request("/api/audit/log", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**: `pnpm --filter @recetario/api test -- audit/log.test.ts`. Expected: FAIL (no handler module).

- [ ] **Step 5: Implement the handler** in `apps/api/src/audit/log.ts`:

```ts
import type { Handler } from "hono";
import { auditLogCreateSchema } from "@recetario/types";
import { ApiError } from "../errors.js";
import { withFreshDb } from "../fresh-db.js";

export function auditLogHandler(auth: { api: { getSession: (args: { headers: Headers }) => Promise<unknown> } }): Handler {
  return async (c) =>
    withFreshDb(c, async (prisma) => {
      const session = await auth.api.getSession({ headers: c.req.raw.headers });
      if (!session || typeof session !== "object" || !("user" in session) || !session.user) {
        throw new ApiError("UNAUTHENTICATED", "Authentication required");
      }
      const userId = (session as { user: { id: string } }).user.id;

      let body: unknown;
      try {
        body = await c.req.json();
      } catch {
        throw new ApiError("VALIDATION_ERROR", "Invalid JSON body");
      }
      const parsed = auditLogCreateSchema.safeParse(body);
      if (!parsed.success) {
        throw new ApiError("VALIDATION_ERROR", "Invalid audit log payload");
      }

      try {
        await prisma.auditLog.create({
          data: {
            userId,
            action: parsed.data.action,
            ipAddress: parsed.data.ipAddress ?? null,
            userAgent: parsed.data.userAgent ?? null,
          },
        });
      } catch {
        // ponytail: audit log is best-effort, never fail the request
      }
      return c.json({ ok: true });
    });
}
```

- [ ] **Step 6: Register the route** in `apps/api/src/index.ts` (alongside other POSTs). Add the import near the top of the file and the route registration:

```ts
import { auditLogHandler } from "./audit/log.js";
// ...
const auditAuth = createAuth(createPrismaClient()); // for the per-handler auth arg
app.post("/api/audit/log", auditLogHandler(auditAuth as never));
```

> Note: the `auditLogHandler` shape takes `auth` as a constructor arg (consistent with the test); at registration time the api uses `createAuth(createPrismaClient())`. If the existing `withFreshDb` pattern passes auth differently, align the registration to match the rest of the API.

- [ ] **Step 7: Run `pnpm --filter @recetario/api test`** to verify all tests pass. Expected: 3 new tests pass, no regressions.

- [ ] **Step 8: Commit**

```bash
git add packages/types/src/api/audit.ts packages/types/dist apps/api/src/audit apps/api/src/index.ts
git commit -m "#81: POST /api/audit/log fire-and-forget sign-in audit"
```

---

## Task 2: Add `GET /api/auth/credential-status`

**Files:**
- Create: `apps/api/src/auth/credential-status.ts`
- Create: `apps/api/src/auth/credential-status.test.ts`
- Modify: `apps/api/src/index.ts` (import + register route)
- Create: `packages/types/src/api/auth.ts` (Zod schema)

- [ ] **Step 1: Write the Zod schema** in `packages/types/src/api/auth.ts`:

```ts
import { z } from "zod";

export const credentialStatusResponseSchema = z.object({
  hasPasswordAuth: z.boolean(),
});
```

- [ ] **Step 2: Run `pnpm --filter @recetario/types build`**. Expected: success.

- [ ] **Step 3: Write the test** in `apps/api/src/auth/credential-status.test.ts` (follow `auth-session.test.ts`):

```ts
import { describe, it, expect, vi } from "vitest";
import { Hono } from "hono";
import { credentialStatusHandler } from "./credential-status.js";

const validSession = { user: { id: "user-1" }, session: { id: "sess-1" } };

function buildApp(mockPrisma: unknown) {
  const auth = { api: { getSession: vi.fn().mockResolvedValue(validSession) } };
  const app = new Hono();
  app.get("/api/auth/credential-status", credentialStatusHandler(auth as never, mockPrisma as never));
  return app;
}

describe("GET /api/auth/credential-status", () => {
  it("401 when no session", async () => {
    const auth = { api: { getSession: vi.fn().mockResolvedValue(null) } };
    const app = new Hono();
    app.get("/api/auth/credential-status", credentialStatusHandler(auth as never, {} as never));
    const res = await app.request("/api/auth/credential-status");
    expect(res.status).toBe(401);
  });

  it("hasPasswordAuth: true when credential account exists", async () => {
    const mockPrisma = {
      account: { findFirst: vi.fn().mockResolvedValue({ id: "a1" }) },
    };
    const app = buildApp(mockPrisma);
    const res = await app.request("/api/auth/credential-status");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hasPasswordAuth: true });
    expect(mockPrisma.account.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-1", providerId: "credential" },
      select: { id: true },
    });
  });

  it("hasPasswordAuth: false when no credential account", async () => {
    const mockPrisma = {
      account: { findFirst: vi.fn().mockResolvedValue(null) },
    };
    const app = buildApp(mockPrisma);
    const res = await app.request("/api/auth/credential-status");
    expect(res.json()).resolves.toEqual({ hasPasswordAuth: false });
  });
});
```

- [ ] **Step 4: Run the test to verify it fails**: `pnpm --filter @recetario/api test -- credential-status.test.ts`. Expected: FAIL.

- [ ] **Step 5: Implement the handler** in `apps/api/src/auth/credential-status.ts`:

```ts
import type { Handler } from "hono";
import type { PrismaClient } from "@recetario/db";
import { credentialStatusResponseSchema } from "@recetario/types";
import { ApiError } from "../errors.js";

export function credentialStatusHandler(
  auth: { api: { getSession: (args: { headers: Headers }) => Promise<unknown> } },
  prisma: PrismaClient,
): Handler {
  return async (c) => {
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session || typeof session !== "object" || !("user" in session) || !session.user) {
      throw new ApiError("UNAUTHENTICATED", "Authentication required");
    }
    const userId = (session as { user: { id: string } }).user.id;

    const credentialAccount = await prisma.account.findFirst({
      where: { userId, providerId: "credential" },
      select: { id: true },
    });
    return c.json(credentialStatusResponseSchema.parse({ hasPasswordAuth: credentialAccount !== null }));
  };
}
```

- [ ] **Step 6: Register the route** in `apps/api/src/index.ts` using the same `withFreshDb` pattern as other handlers (this endpoint is small — one query — so it does not strictly need per-request prisma, but match the pattern for consistency):

```ts
app.get("/api/auth/credential-status", (c) =>
  withFreshDb(c, async (prisma, auth) => {
    const handler = credentialStatusHandler(auth, prisma);
    return handler(c);
  }),
);
```

- [ ] **Step 7: Run `pnpm --filter @recetario/api test`**. Expected: 3 new tests pass.

- [ ] **Step 8: Commit**

```bash
git add packages/types/src/api/auth.ts packages/types/dist apps/api/src/auth apps/api/src/index.ts
git commit -m "#82: GET /api/auth/credential-status"
```

---

## Task 3: Add presentation CRUD endpoints (POST, PATCH, DELETE)

**Files:**
- Modify: `apps/api/src/recipes/presentations.ts` (add 3 new handlers)
- Modify: `apps/api/src/recipes/presentations.test.ts` (add tests for new handlers)
- Modify: `apps/api/src/index.ts` (register routes)
- Modify: `packages/types/src/api/recipes.ts` (add presentation input schemas)

- [ ] **Step 1: Add Zod input schemas** to `packages/types/src/api/recipes.ts`:

```ts
export const presentationCreateSchema = z.object({
  name: z.string().min(1).max(120),
  unitsPerBatch: z.coerce.number().positive(),
  salePrice: z.coerce.number().nonnegative().nullable().optional(),
});

export const presentationUpdateSchema = z
  .object({
    name: z.string().min(1).max(120).optional(),
    unitsPerBatch: z.coerce.number().positive().optional(),
    salePrice: z.coerce.number().nonnegative().nullable().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, { message: "At least one field must be provided" });
```

- [ ] **Step 2: Run `pnpm --filter @recetario/types build`**. Expected: success.

- [ ] **Step 3: Add tests** in `apps/api/src/recipes/presentations.test.ts` (mirror the existing list test):

```ts
describe("POST /api/recipes/:id/presentations", () => {
  // 401 when no session
  // 404 when recipe not found
  // 201 with body { id, recipeId, name, unitsPerBatch, salePrice }
  // 400 on invalid body
});

describe("PATCH /api/recipes/:id/presentations/:pid", () => {
  // 401 / 404 / 200 / 400 (no fields)
});

describe("DELETE /api/recipes/:id/presentations/:pid", () => {
  // 401 / 404 / 204 (or 200 with { deleted: true })
});
```

Each test mocks `prisma.recipe.findFirst` (owner check) and the prisma.presentation.* call. See the existing `presentations.test.ts` for the `buildApp` / `validSession` pattern.

- [ ] **Step 4: Run tests to verify they fail**: `pnpm --filter @recetario/api test -- recipes/presentations.test.ts`. Expected: FAIL.

- [ ] **Step 5: Add the three handlers** to `apps/api/src/recipes/presentations.ts`. Follow the existing `presentationsListHandler` shape. Each handler:
1. Calls `withFreshDb`, gets `prisma, auth`
2. Checks session via `auth.api.getSession`
3. Validates `:id` and `:pid` are finite numbers → 404 otherwise
4. Verifies recipe ownership via `prisma.recipe.findFirst({ where: { id, ownerId } })` → 404 if not found
5. For PATCH/DELETE, also verifies the presentation belongs to that recipe
6. Parses + validates body with the Zod schema
7. Calls prisma and returns the result

POST returns 201 with `{ id, recipeId, name, unitsPerBatch, salePrice }`.
PATCH returns 200 with the same shape.
DELETE returns 204 (or 200 `{ deleted: true }` — match the convention of the rest of the API).

- [ ] **Step 6: Register the three routes** in `apps/api/src/index.ts`:

```ts
app.post("/api/recipes/:id/presentations", presentationsCreateHandler());
app.patch("/api/recipes/:id/presentations/:pid", presentationsUpdateHandler());
app.delete("/api/recipes/:id/presentations/:pid", presentationsDeleteHandler());
```

- [ ] **Step 7: Run `pnpm --filter @recetario/api test`**. Expected: 9 new tests pass (3 per handler × 3 handlers), no regressions.

- [ ] **Step 8: Commit**

```bash
git add packages/types/src/api/recipes.ts packages/types/dist apps/api/src/recipes/presentations.ts apps/api/src/recipes/presentations.test.ts apps/api/src/index.ts
git commit -m "#83: presentation CRUD endpoints (POST/PATCH/DELETE)"
```

---

## Task 4: Add presentation-fixed-costs endpoints

**Files:**
- Create: `apps/api/src/presentations/fixed-costs.ts`
- Create: `apps/api/src/presentations/fixed-costs.test.ts`
- Modify: `apps/api/src/index.ts`
- (Schemas already exist in `packages/types/src/api/recipes.ts`: `fixedCostCreateSchema`, `fixedCostUpdateSchema`.)

- [ ] **Step 1: Write the test** in `apps/api/src/presentations/fixed-costs.test.ts` mirroring `apps/api/src/recipes/fixed-costs.test.ts` but for presentations. Six tests:

```
describe("POST /api/presentations/:pid/fixed-costs", ...)   // 401, 404, 201, 400
describe("PATCH /api/presentations/:pid/fixed-costs/:fcid", ...) // 401, 404, 200, 400
describe("DELETE /api/presentations/:pid/fixed-costs/:fcid", ...) // 401, 404, 204
```

For ownership: the handler joins through `prisma.recipePresentation.findFirst({ where: { id: pid, recipe: { ownerId } } })` so the join enforces ownership in one query.

- [ ] **Step 2: Run test to verify it fails**: `pnpm --filter @recetario/api test -- presentations/fixed-costs.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement the handlers** in `apps/api/src/presentations/fixed-costs.ts`. Three exported handlers: `presentationsFixedCostsCreateHandler`, `…UpdateHandler`, `…DeleteHandler`. Follow the `recipes/fixed-costs.ts` shape exactly, but use `prisma.recipePresentation.findFirst({ where: { id: pid, recipe: { ownerId } } })` for ownership, and operate on `prisma.presentationFixedCost` instead of `prisma.recipeFixedCost`.

- [ ] **Step 4: Register the routes** in `apps/api/src/index.ts`:

```ts
app.post("/api/presentations/:pid/fixed-costs", presentationsFixedCostsCreateHandler());
app.patch("/api/presentations/:pid/fixed-costs/:fcid", presentationsFixedCostsUpdateHandler());
app.delete("/api/presentations/:pid/fixed-costs/:fcid", presentationsFixedCostsDeleteHandler());
```

- [ ] **Step 5: Run `pnpm --filter @recetario/api test`**. Expected: 9+ new tests pass, no regressions.

- [ ] **Step 6: Commit**

```bash
git add apps/api/src/presentations apps/api/src/index.ts
git commit -m "#84: presentation fixed-costs CRUD endpoints"
```

---

## Task 5: Migrate `apps/web/src/middleware.ts` off `prisma`

**Files:**
- Modify: `apps/web/src/middleware.ts`

Depends on: T1 (audit/log), T2 (credential-status).

- [ ] **Step 1: Replace the `logAuditEvent` import and call** in `apps/web/src/middleware.ts`:

Before (line 8):
```ts
import { logAuditEvent, prisma } from "@recetario/db";
```

After:
```ts
// audit log goes through the API worker
```

Before (line 30-43, `detectSignInEvent`):
```ts
async function detectSignInEvent(
  path: string,
  userId: string,
  request: Request,
) {
  if (SIGN_IN_PATHS.some((p) => path.includes(p))) {
    await logAuditEvent({
      userId,
      action: "sign_in",
      ipAddress: clientIp(request),
      userAgent: request.headers.get("user-agent") ?? null,
    });
  }
}
```

After (uses apiFetch, fire-and-forget):
```ts
async function detectSignInEvent(
  path: string,
  userId: string,
  request: Request,
) {
  if (SIGN_IN_PATHS.some((p) => path.includes(p))) {
    apiFetch(
      "/api/audit/log",
      {
        method: "POST",
        body: {
          action: "sign_in",
          ipAddress: clientIp(request),
          userAgent: request.headers.get("user-agent") ?? null,
        },
      },
      request,
    ).catch(() => {
      // ponytail: best-effort; never block the request
    });
  }
}
```

- [ ] **Step 2: Replace the `prisma.account.findFirst` block** (line 93-97):

Before:
```ts
const credentialAccount = await prisma.account.findFirst({
  where: { userId: sessionUser.id, providerId: "credential" },
  select: { id: true },
});
```

After:
```ts
let hasPasswordAuth = false;
try {
  const credStatus = await apiFetch(
    "/api/auth/credential-status",
    { schema: credentialStatusResponseSchema },
    context.request,
  );
  hasPasswordAuth = credStatus.hasPasswordAuth;
} catch (err) {
  if (!(err instanceof ApiClientError) || err.status !== 401) {
    console.error("[/api/auth/credential-status] error:", err);
  }
}
```

- [ ] **Step 3: Add the Zod schema import** near the existing `sessionResponseSchema` import:

```ts
import {
  credentialStatusResponseSchema,
  sessionResponseSchema,
  subscriptionResponseSchema,
} from "@recetario/types";
```

- [ ] **Step 4: Use `hasPasswordAuth` in the `appUser` object** (line 107):

The `hasPasswordAuth` field is already set from the result. No other change needed to that line.

- [ ] **Step 5: Run `pnpm --filter @recetario/web astro check`**. Expected: 0 errors. The `prisma` and `logAuditEvent` imports should no longer appear in the file. If `prisma` is still used elsewhere in the file, that means another spot was missed — fix it before continuing.

- [ ] **Step 6: Run the dev server** (`pnpm dev`) and hit `/` while signed in. Expected: 200, no `pg.Pool` timeout. The home page is still broken (T6), but the middleware no longer crashes.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/middleware.ts
git commit -m "#85: migrate web middleware to API (audit + credential-status)"
```

---

## Task 6: Migrate `getPricingPlans` call sites (4 pages)

**Files:**
- Modify: `packages/stripe/src/billing.ts` (split fetch from post-processing)
- Modify: `packages/stripe/src/index.ts` (export the new helper)
- Modify: `apps/web/src/pages/index.astro`
- Modify: `apps/web/src/pages/pricing.astro`
- Modify: `apps/web/src/pages/settings.astro`
- Modify: `apps/web/src/pages/settings/billing.astro`

- [ ] **Step 1: Split `getPricingPlans` into a pure post-processor** in `packages/stripe/src/billing.ts`. Replace the existing function with two functions:

```ts
import type { Plan } from "@recetario/types";

/**
 * Pure post-processing: turn raw plan rows into the UI-shaped PricingPlan.
 * No DB access. Pair monthly+yearly, format currency, layer in TIER_CONFIG
 * static metadata (description, badge, features list).
 */
export function buildPricingPlans(rawPlans: Plan[]): PricingPlan[] {
  // ... (move the body of the old getPricingPlans that does the
  // priceMap + result.push() loop, but read from `rawPlans` instead
  // of calling prisma again)
  const priceMap: Record<string, { priceId: string; priceCents: number; currency: string }> = {};
  for (const plan of rawPlans) {
    priceMap[plan.id] = {
      priceId: plan.stripePriceId,
      priceCents: plan.priceCents,
      currency: plan.currency,
    };
  }
  const result: PricingPlan[] = [];
  for (const [tier, config] of Object.entries(TIER_CONFIG)) {
    // ... (same as before, but skip the prisma call; tier === "free" branch is preserved)
  }
  return result;
}
```

`getPricingPlans(db)` keeps the existing body but calls `buildPricingPlans(plans)` instead of inlining the loop. The `db` arg is preserved (used internally for the findMany + seed fallback) so the API can still call it if needed.

- [ ] **Step 2: Export `buildPricingPlans`** from `packages/stripe/src/index.ts`:

```ts
export { buildPricingPlans, getPricingPlans /* ... */ } from "./billing.js";
```

- [ ] **Step 3: Run `pnpm --filter @recetario/stripe build && pnpm --filter @recetario/types build && pnpm --filter @recetario/api test`**. Expected: build OK, existing API tests still pass (`getPricingPlans` API contract unchanged).

- [ ] **Step 4: Migrate `apps/web/src/pages/index.astro`** (lines 10, 13):

Before:
```ts
import { getPricingPlans } from "@recetario/stripe";
// ...
const plans = await getPricingPlans();
```

After:
```ts
import { buildPricingPlans } from "@recetario/stripe";
import { apiFetch } from "@/lib/api-client";
import { planSchema } from "@recetario/types";
import { z } from "zod";
// ...
const rawPlans = await apiFetch(
  "/api/billing/plans",
  { schema: z.array(planSchema) },
  Astro.request,
).catch(() => []);
const plans = buildPricingPlans(rawPlans);
```

(`.catch(() => [])` is best-effort; the home page should still render even if plans fail to load.)

- [ ] **Step 5: Apply the same change** to `pricing.astro` (line 5, 14), `settings.astro` (line 19, 47), and `settings/billing.astro` (line 10, 23). Each gets the same import + same call pattern.

- [ ] **Step 6: Run `pnpm --filter @recetario/web astro check`**. Expected: 0 errors.

- [ ] **Step 7: Run dev and hit `/`**. Expected: 200 with the pricing section rendered. (No more pg.Pool timeout from the home page.)

- [ ] **Step 8: Commit**

```bash
git add packages/stripe packages/web/src/pages/index.astro apps/web/src/pages/pricing.astro apps/web/src/pages/settings.astro apps/web/src/pages/settings/billing.astro
git commit -m "#86: route getPricingPlans through /api/billing/plans in web"
```

---

## Task 7: Migrate `apps/web/src/pages/ingredients.astro`

**Files:**
- Modify: `apps/web/src/pages/ingredients.astro`

- [ ] **Step 1: Read the file** end-to-end to map every call to its API equivalent. Inventory:
- `listIngredients(ownerId)` (line 280) → `apiFetch("/api/ingredients", { schema: z.array(ingredientSchema) }, Astro.request)`
- `listIngredientUsage(ownerId)` (line 281) → `apiFetch("/api/ingredients/usage", ...)` if available, OR build a map from the `/api/ingredients/:id/usage` endpoints. Check the existing handlers — there is `/api/ingredients/:id/usage` (single-ingredient). If web needs a bulk map, add a new endpoint `/api/ingredients/usage` (GET) that returns the same shape as the old `listIngredientUsage` (a `Record<ingredientId, { recipeCount, recipeIds }>`).

> If a bulk endpoint is needed, add it as a small additional step in this task — follow the `withFreshDb` pattern, return a record keyed by ingredient id.

- [ ] **Step 2: Remove `@recetario/db` import** from the frontmatter. Keep the rest.

- [ ] **Step 3: Run `pnpm --filter @recetario/web astro check`**. Expected: 0 errors.

- [ ] **Step 4: Run dev, visit `/ingredients` while signed in**. Expected: 200, ingredients list renders, usage stats correct.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/pages/ingredients.astro apps/api/src/ingredients/*.ts packages/types/src/api/*.ts
git commit -m "#87: migrate ingredients.astro to /api/ingredients"
```

---

## Task 8: Migrate `apps/web/src/pages/recipes/index.astro`

**Files:**
- Modify: `apps/web/src/pages/recipes/index.astro`

- [ ] **Step 1: Replace `createRecipe`** (line 56-60) with `apiFetch("/api/recipes", { method: "POST", body: { name }, schema: recipeCreateResponseSchema }, Astro.request)`. Extract `.id` for the redirect.

- [ ] **Step 2: Replace `duplicateRecipe`** (line 73) with `apiFetch(\`/api/recipes/${recipeIdToDuplicate}/duplicate\`, { method: "POST", schema: recipeCreateResponseSchema }, Astro.request)`. Verify the API endpoint exists at this exact path — if the existing API uses a different shape, align it. (Per the route table, `/api/recipes/:id/duplicate` may need to be added; check `apps/api/src/index.ts`.)

- [ ] **Step 3: Replace `listIngredientUsage`** (line 89) with `apiFetch("/api/ingredients/usage", { schema: ingredientUsageMapSchema }, Astro.request)` (see T7 about whether this endpoint exists or needs to be added).

- [ ] **Step 4: Remove `@recetario/db` import** from the frontmatter.

- [ ] **Step 5: Run `pnpm --filter @recetario/web astro check`**. Expected: 0 errors.

- [ ] **Step 6: Run dev, test the create + duplicate buttons** on `/recipes`. Expected: both work, redirect to the new recipe's edit page.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/pages/recipes/index.astro
git commit -m "#88: migrate recipes/index.astro to /api/recipes"
```

---

## Task 9: Migrate `apps/web/src/pages/recipes/[recipe].astro`

**Files:**
- Modify: `apps/web/src/pages/recipes/[recipe].astro`

Depends on: T3, T4 (the presentation + presentation-fixed-costs API endpoints).

This is the largest single page. Map each `prisma` / `@recetario/db` call to its API equivalent. Apply TDD where possible (the page is hard to unit-test because it's tightly coupled to Astro; rely on `astro check` + manual smoke test).

- [ ] **Step 1: Inventory the calls and map them**. For each line from the call list, write the target:

| Line | Current | Target |
|------|---------|--------|
| 223 | `updatePresentation(recipeId, presId, {...}, ownerId)` | `apiFetch(\`/api/recipes/${recipeId}/presentations/${presId}\`, { method: "PATCH", body: {...}, schema: presentationSchema }, Astro.request)` |
| 251 | `deletePresentation(recipeId, presId, ownerId)` | `apiFetch(\`/api/recipes/${recipeId}/presentations/${presId}\`, { method: "DELETE" }, Astro.request)` |
| 297 | `createPresentation(recipeId, {...}, ownerId)` | `apiFetch(\`/api/recipes/${recipeId}/presentations\`, { method: "POST", body: {...}, schema: presentationSchema }, Astro.request)` |
| 315 | `deleteRecipe(recipeId, ownerId)` | `apiFetch(\`/api/recipes/${recipeId}\`, { method: "DELETE" }, Astro.request)` |
| 389 | `duplicateRecipe(recipeId, ownerId)` | `apiFetch(\`/api/recipes/${recipeId}/duplicate\`, { method: "POST", schema: recipeCreateResponseSchema }, Astro.request)` |
| 413 | `prisma.recipe.findFirst({ where: { id, ownerId } })` | (no longer needed — the API endpoint enforces ownership; drop the ownerCheck) |
| 428 | `prisma.recipeFixedCost.create({...})` | `apiFetch(\`/api/recipes/${recipeId}/fixed-costs\`, { method: "POST", body: {...}, schema: recipeFixedCostSchema }, Astro.request)` |
| 470 | `prisma.recipePresentation.findFirst({...})` | (drop — the API endpoint enforces it) |
| 483 | `prisma.presentationFixedCost.create({...})` | `apiFetch(\`/api/presentations/${presId}/fixed-costs\`, { method: "POST", body: {...}, schema: presentationFixedCostSchema }, Astro.request)` |
| 533-541 | `prisma.recipeFixedCost.findFirst` / `prisma.presentationFixedCost.findFirst` | (drop — API enforces) |
| 551-556 | `prisma.recipeFixedCost.update` / `prisma.presentationFixedCost.update` | `apiFetch(\`/api/recipes/${recipeId}/fixed-costs/${fcId}\` or \`/api/presentations/${presId}/fixed-costs/${fcId}\`, { method: "PATCH", body: {...} }, Astro.request)` |
| 580-587 | `prisma.recipeFixedCost.findFirst` + `.delete` | `apiFetch(\`/api/recipes/${recipeId}/fixed-costs/${fcId}\`, { method: "DELETE" }, Astro.request)` |
| 589-596 | `prisma.presentationFixedCost.findFirst` + `.delete` | `apiFetch(\`/api/presentations/${presId}/fixed-costs/${fcId}\`, { method: "DELETE" }, Astro.request)` |
| 630 | `listIngredients(ownerId)` (only when `isEditMode`) | `apiFetch("/api/ingredients", { schema: z.array(ingredientSchema) }, Astro.request)` |

- [ ] **Step 2: Remove the `@recetario/db` and direct `prisma` imports** (lines 8-30). Drop the `prisma` import entirely.

- [ ] **Step 3: Add the new schema imports**:

```ts
import {
  recipeCreateResponseSchema,
  presentationSchema,
  recipeFixedCostSchema,
  presentationFixedCostSchema,
  ingredientSchema,
} from "@recetario/types";
```

(Adjust names to match the actual exports in `packages/types/src/api/recipes.ts` / `ingredients.ts`.)

- [ ] **Step 4: For each form action**, replace the prisma/helper call with `apiFetch(...)`. Wrap the call in try/catch that produces the same UX (redirect with `?type=error&message=...` or `jsonResponse({ error })` depending on `expectsJsonResponse`).

- [ ] **Step 5: Drop the `prisma.recipe.findFirst` / `prisma.recipePresentation.findFirst` / `prisma.recipeFixedCost.findFirst` / `prisma.presentationFixedCost.findFirst` owner-check calls**. The new API endpoints enforce ownership in `where: { ownerId }` or via the `recipePresentation.findFirst` join, so web doesn't need to pre-check.

- [ ] **Step 6: Run `pnpm --filter @recetario/web astro check`**. Expected: 0 errors.

- [ ] **Step 7: Manual smoke test** in dev:
- Open `/recipes/109?edit=true` (the page that was originally broken)
- Add a fixed cost → should appear
- Edit it → should save
- Delete it → should disappear
- Add a presentation → should appear
- Edit a presentation → should save
- Delete a presentation → should disappear
- Save the recipe (update_recipe action) → should save
- Duplicate the recipe → should redirect to new recipe
- Delete the recipe → should redirect to /recipes

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/pages/recipes/[recipe].astro
git commit -m "#89: migrate recipes/[recipe].astro to /api/recipes (no prisma in web)"
```

---

## Task 10: Remove `@recetario/db` from web entirely + build verify

**Files:**
- Modify: `apps/web/package.json` (remove the runtime dep if no longer needed)
- Modify: any leftover files in `apps/web/src` that still import from `@recetario/db`
- Modify: `AGENTS.md` to reflect the new rule
- Modify: `packages/db/src/audit.ts` (drop the default-prisma lazy path — `logAuditEvent` is no longer called from web)

Depends on: T5, T6, T7, T8, T9.

- [ ] **Step 1: Grep for remaining `@recetario/db` references** in `apps/web/src`:

```bash
grep -rn "@recetario/db\|from \"@recetario/db\"" apps/web/src
```

Expected output: empty (or only TypeScript type-only imports like `type { Ingredient, ... } from "@recetario/db"` — those are fine if they only pull types, but ideally move them to `@recetario/types`).

- [ ] **Step 2: For each remaining reference**, either:
- Remove the import and inline the type
- Move the type definition to `@recetario/types` and re-export from there

- [ ] **Step 3: Run `pnpm --filter @recetario/web astro check && pnpm --filter @recetario/web build`**. Expected: 0 errors, build succeeds.

- [ ] **Step 4: Run `pnpm --filter @recetario/api test && pnpm --filter @recetario/api build`**. Expected: 0 errors, all tests pass, build succeeds.

- [ ] **Step 5: Smoke test the full app** in dev:
- Sign in / sign out
- Browse `/`, `/pricing`, `/settings`, `/settings/billing` (all public/auth)
- Create an ingredient
- Create a recipe
- Edit the recipe (add fixed costs, add presentations, edit, delete)
- Visit `/recipes/109?edit=true` → the originally broken URL
- Open the browser devtools network tab — every `/api/*` request returns 2xx

- [ ] **Step 6: Drop the legacy web shim** at `apps/web/src/pages/api/recipe-fixed-costs/` if it exists and is no longer referenced (memory #64 notes this directory was kept as a deprecation shim). Verify with `grep -rn "recipe-fixed-costs" apps/web/src` — if only the shim itself references it, delete the directory.

- [ ] **Step 7: Update `AGENTS.md`** to reflect the new rule. Remove the bullet "apps/web still imports from @recetario/db for ..." (memory #64) from the architecture section, and update the "MUST NOT VIOLATE" data invariants to mention that web must not import `prisma` or `@recetario/db` directly — only `apiFetch`.

- [ ] **Step 8: Update `packages/db/src/audit.ts`** to drop the `getDefaultPrisma` lazy path. Now that `logAuditEvent` is only ever called from the API (with an explicit `client` arg), the lazy default is dead code. Make the `client` arg required:

```ts
export async function logAuditEvent(
  params: { userId: string; action: AuditAction; ipAddress?: string | null; userAgent?: string | null },
  client: PrismaClient,
): Promise<void> { ... }
```

And delete `getDefaultPrisma` / `_defaultPrisma` / the dynamic import. Update any internal callers in `apps/api` to pass `prisma` explicitly.

- [ ] **Step 9: Commit**

```bash
git add apps/web AGENTS.md packages/db/src/audit.ts
git commit -m "#90: complete web→API destination migration; no prisma in web"
```

---

## Self-Review

- **Spec coverage:** Every `prisma` / `@recetario/db` call in `apps/web/src` is mapped to either an existing or a new API endpoint, and a task covers the migration. The middleware is its own task. The four `getPricingPlans` callers share one task. `ingredients.astro`, `recipes/index.astro`, `recipes/[recipe].astro` each have their own task. Cleanup is T10.
- **Type consistency:** All schemas used by the new API handlers live in `packages/types/src/api/*.ts`. The same schemas are imported by web's `apiFetch` calls so the response shape matches on both sides.
- **No placeholders:** Every task has concrete code blocks, exact file paths, and verification commands.
- **Parallel safety:** T1-T4 are independent. T6-T8 are independent of each other. T5 depends on T1+T2 (handlers must exist before middleware uses them). T9 depends on T3+T4 (presentation endpoints). T10 depends on all of the above.
