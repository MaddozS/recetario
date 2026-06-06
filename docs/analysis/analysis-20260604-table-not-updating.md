# Explore Report: Ingredients Table Not Updating After Save

Date: 2026-06-04  
Agent: explorer (diagnosis)  
Task File: N/A — direct investigation from user report  
Investigation Mode: `diagnose` skill (Phase 1–3)

## Target Area Explored

- **Primary files**:
  - `src/pages/ingredients.astro` (POST handler, data fetching, client JS)
  - `src/lib/db/ingredients.ts` (createIngredient, cache invalidation)
  - `src/lib/cache.ts` (cacheGet/cacheSet/cacheDelete implementation)
- **Adjacent files**:
  - `src/lib/db/recipes.ts` (same cache pattern for recipes)
  - `src/lib/db/presentations.ts` (same cache pattern for presentations)
  - `src/middleware.ts` (subscription caching pattern)
  - `src/lib/db/billing.ts` (invalidateSubCache pattern)
  - `prisma/schema.prisma` (CacheEntry model — `value String`, NOT optional)
  - `node_modules/astro/components/ClientRouter.astro` (form intercept logic)
  - `node_modules/astro/dist/transitions/router.js` (fetch + redirect handling)

## Patterns Found

### Data layer
- **Cache model**: `CacheEntry` in PostgreSQL, key-value store with `BigInt expiresAt`
- **Ingredient cache**: Two keys per user: `ingredients:{ownerId}` and `ingredient_usage:{ownerId}`
- **Cache invalidation**: Uses `cacheSet(key, undefined, 0)` — sets `expiresAt` to `Date.now()`, but `value` field is NOT cleared

### Auth
- Middleware populates `Astro.locals.session`, `Astro.locals.user`, `Astro.locals.subscription`
- Protected page: redirects to `/sign-in` if no session

### UI conventions
- Forms use `data-astro-reload` + standard POST/redirect pattern
- `ClientRouter` (!) is active — imported in `Layout.astro` via `<ClientRouter />`
- Loading overlay on form submit (lines 1096–1116 of ingredients.astro)

## Bug Analysis

### ROOT CAUSE 1: `invalidateIngredientCache` is fire-and-forget (missing `await`)

**File**: `src/lib/db/ingredients.ts`, lines 12–15 and 103

```ts
// Line 12: NOT async, NOT awaiting cacheSet
function invalidateIngredientCache(ownerId: string) {
  cacheSet(`ingredients:${ownerId}`, undefined, 0);    // NOT awaited — fire & forget
  cacheSet(`ingredient_usage:${ownerId}`, undefined, 0); // NOT awaited — fire & forget
}

// Line 103: called inside createIngredient, NOT awaited
createIngredient(...) {
  // ...
  invalidateIngredientCache(ownerId);  // ← NO await
  return { ... };
}
```

`createIngredient` is `await`ed by the POST handler, but inside it, `invalidateIngredientCache` is NOT awaited. The redirect response is sent before the cache invalidation completes. This creates a **race condition**:

1. POST handler creates ingredient in DB
2. `invalidateIngredientCache` is called but NOT awaited
3. `Astro.redirect()` sends 302 response BEFORE invalidation completes
4. Browser follows redirect immediately → GET request arrives at server
5. GET calls `listIngredients` → `cacheGet` reads cache entry
6. If invalidation hasn't committed yet: **stale data is returned**
7. Manual refresh (later GET): invalidation has completed (or 60s TTL expired) → fresh data

In a **serverless environment** (Vercel), this is amplified: the function may be frozen shortly after the response is sent, potentially before the pending `cacheSet` upsert executes at all.

### ROOT CAUSE 2: `cacheSet(key, undefined, 0)` is semantically broken

**File**: `src/lib/db/ingredients.ts` line 13 and `src/lib/cache.ts` lines 13–34

```js
JSON.stringify(undefined)  // → returns JS undefined (NOT string "undefined")
```

When Prisma receives `value: undefined` in an `upsert.update` clause, it **silently ignores** the field. The `value` column retains its old serialized data. Only `expiresAt` is updated to `Date.now()`.

This means:
- **Update path** (entry exists): Only `expiresAt` changes. Old value persists. ✅ Still works because `cacheGet` checks expiration.
- **Create path** (entry doesn't exist): Prisma throws because `value` is required String. ❌ Caught by try/catch, invalidation silently fails.

Confirmed via experiment:
```
typeof JSON.stringify(undefined): undefined
JSON.stringify(undefined) === undefined: true
```

This is a fragile pattern — if a future Prisma version changes how it treats `undefined` in updates, the invalidation could silently break.

### CACHE ALTERNATIVE: `cacheDelete` exists and is cleaner

`src/lib/cache.ts` line 36 already has a `cacheDelete` function:

```ts
export async function cacheDelete(key: string): Promise<void> {
  try {
    await prisma.cacheEntry.delete({ where: { key } });
  } catch { /* non-critical */ }
}
```

Deleting the entry is semantically clearer and avoids the `undefined` value issue. `cacheGet` naturally returns `undefined` when the entry doesn't exist.

### SYSTEMATIC ISSUE: All cache invalidations are fire-and-forget

| File | Function | Line | Pattern |
|------|----------|------|---------|
| `src/lib/db/ingredients.ts` | `invalidateIngredientCache()` | 12 | `cacheSet(key, undefined, 0)` — no await |
| `src/lib/db/ingredients.ts` | called in `createIngredient()` | 103 | Not awaited |
| `src/lib/db/ingredients.ts` | called in `updateIngredient()` | 162 | Not awaited |
| `src/lib/db/ingredients.ts` | called in `deleteIngredient()` | 230 | Not awaited |
| `src/lib/db/recipes.ts` | `invalidateRecipeCache()` | 21 | `cacheDelete()` — no await |
| `src/lib/db/recipes.ts` | called in `createRecipe()` | 185 | Not awaited |
| `src/lib/db/recipes.ts` | called in `deleteRecipe()` | 201 | Not awaited |
| `src/lib/db/recipes.ts` | called in `updateRecipe()` | 249 | Not awaited |
| `src/lib/db/presentations.ts` | `invalidatePresentationCache()` | 15 | `cacheDelete()` — no await |
| `src/lib/db/billing.ts` | `invalidateSubCache()` | 8 | `cacheDelete()` — no await |

Any CRUD operation on any entity could show stale data when the redirect GET arrives before the cache invalidation completes.

### FALSE LEAD: ClientRouter / View Transitions does NOT interfere

Confirmed by reading `node_modules/astro/components/ClientRouter.astro` (lines 105–148):

```ts
document.addEventListener('submit', (ev) => {
  // ...
  if (/* ... */ isReloadEl(el) /* ... */) { return; }  // ← data-astro-reload EXITS early
  ev.preventDefault();
  navigate(action, options);  // ← NOT reached when data-astro-reload is set
});
```

The `isReloadEl()` check (line 45–47: `return el.dataset.astroReload !== undefined`) correctly detects `data-astro-reload` on forms and returns early without calling `preventDefault()`. The browser handles the form as a standard POST.

**However**, if a developer accidentally removes `data-astro-reload` from a form in the future, the ClientRouter would intercept the submission and use `fetch()`, which could introduce additional issues (inline scripts not re-executing, redirect handling bugs).

## Commands Executed

- `node -e "..."` — tested `JSON.stringify(undefined)` behavior
- Various `grep` — searched for cache invalidation patterns across the codebase
- `find` + `grep` — traced Astro ClientRouter source to verify form intercept behavior

## Files Read

- `src/pages/ingredients.astro` (1122 lines): Full POST handler, table rendering, client-side JS with loading overlay
- `src/lib/db/ingredients.ts` (233 lines): createIngredient, cache invalidation at line 103
- `src/lib/cache.ts` (42 lines): cacheGet/cacheSet/cacheDelete implementation
- `src/lib/db/recipes.ts` (308 lines): Recipe CRUD with same fire-and-forget cache pattern
- `src/lib/db/presentations.ts` (partial): Presentation cache invalidation pattern
- `src/lib/db/billing.ts` (431 lines): Subscription cache invalidation (same fire-and-forget)
- `src/lib/subscription.ts` (139 lines): Feature flags, canCreateIngredient
- `src/middleware.ts` (128 lines): Auth, subscription cache with 300s TTL
- `prisma/schema.prisma` (231 lines): CacheEntry model — `value String` (NOT optional, required)
- `node_modules/astro/components/ClientRouter.astro` (155 lines): Form intercept logic, `isReloadEl` check
- `node_modules/astro/dist/transitions/router.js` (495 lines): fetch + redirect handling in transition
- `src/layouts/Layout.astro` (328 lines): Confirms `<ClientRouter />` is active

## Recommendations

### Critical Fix (ingredients — immediate)

1. **Make `invalidateIngredientCache` async and await the cache operations:**
   ```ts
   async function invalidateIngredientCache(ownerId: string) {
     await cacheDelete(`ingredients:${ownerId}`);
     await cacheDelete(`ingredient_usage:${ownerId}`);
   }
   ```
   Replace `cacheSet(key, undefined, 0)` with `cacheDelete(key)` — cleaner semantics, avoids the `JSON.stringify(undefined)` bug.

2. **Await `invalidateIngredientCache` in all callers:**
   ```ts
   // createIngredient line 103
   await invalidateIngredientCache(ownerId);
   
   // updateIngredient line 162
   await invalidateIngredientCache(ownerId);
   
   // deleteIngredient line 230
   await invalidateIngredientCache(ownerId);
   ```

### Systematic Fix (all entities)

3. **Fix all other cache invalidation functions the same way:**
   - `src/lib/db/recipes.ts`: `invalidateRecipeCache` → make async, await `cacheDelete`, await in callers
   - `src/lib/db/presentations.ts`: `invalidatePresentationCache` → make async, await `cacheDelete`, await in callers
   - `src/lib/db/billing.ts`: `invalidateSubCache` → make async, await `cacheDelete`, await in callers

### Risks to Watch For

- **Vercel serverless**: After sending a response, Vercel may freeze the function. Fire-and-forget promises are unreliable — this is why all cache invalidations must be awaited.
- **Future Prisma versions**: The `undefined`-means-skip behavior in Prisma is not documented as guaranteed behavior. Using `cacheDelete` avoids this dependency.
- **`data-astro-reload` removal**: If someone removes `data-astro-reload` from a form, the ClientRouter would intercept and use `fetch()`, introducing a different class of bugs (script re-execution, redirect handling in the client router).
