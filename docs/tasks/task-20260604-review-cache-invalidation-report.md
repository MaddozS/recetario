# Validation: Async cache invalidation fix across all 4 DB modules

Date: 2026-06-04
Reviewer: reviewer
Plan: N/A (direct fix from analysis report)
Analysis: docs/analysis/analysis-20260604-table-not-updating.md
Tasks: N/A
Implementer Report: docs/tasks/task-20260604-fix-cache-invalidation-report.md

## Context Understood
The analysis identified a systemic bug: all cache invalidation functions across 4 DB modules (`ingredients.ts`, `recipes.ts`, `presentations.ts`, `billing.ts`) were fire-and-forget (`cacheSet(key, undefined, 0)` without `await`). In Vercel's serverless environment, this meant DB writes completed but the redirect GET could arrive before cache invalidation, serving stale data. The fix: make all invalidation functions `async`, replace `cacheSet(key, undefined, 0)` with `await cacheDelete(key)`, and `await` at every call site.

## Scope
- Modified files: `src/lib/db/ingredients.ts`, `src/lib/db/recipes.ts`, `src/lib/db/presentations.ts`, `src/lib/db/billing.ts`
- Full code review of each file for async correctness
- Grep for any lingering fire-and-forget `cacheDelete`/`cacheSet` calls
- `pnpm astro check` — 0 errors
- `pnpm eslint .` — no new errors

## Expected vs Actual

| Expectation (from analysis/implementer report) | Actual (from code) | Match? |
|---|---|---|
| `ingredients.ts`: `invalidateIngredientCache` is async, uses `await cacheDelete()`, all 3 callers use `await` | Line 12: `async function`. Lines 13-14: `await cacheDelete(...)`. Callers at 103, 162, 230 all have `await`. | ✅ |
| `recipes.ts`: `invalidateRecipeCache` is async, uses `await cacheDelete()`, all 3 callers use `await` | Line 21: `async function`. Lines 22-23: `await cacheDelete(...)`. Callers at 185, 201, 249 all have `await`. | ✅ |
| `presentations.ts`: `invalidateParentRecipeCache` is async, uses `await cacheDelete()`, all 3 callers use `await` | Line 15: `async function`. Lines 16-17: `await cacheDelete(...)`. Callers at 57, 114, 169 all have `await`. | ✅ |
| `billing.ts`: `invalidateSubCache` is async, uses `await cacheDelete()`, all 3 callers use `await` | Line 8: `async function`. Line 9: `await cacheDelete(...)`. Callers at 345, 360, 375 all have `await`. | ✅ |
| `cacheSet` retained and awaited in cache-warming contexts | `ingredients.ts`: lines 37, 65 — both `await cacheSet(...)`. `recipes.ts`: lines 53, 81, 86, 111 — all `await cacheSet(...)`. | ✅ |
| Import path uses `@/lib/cache` with `cacheDelete` when needed | All 4 files import from `@/lib/cache`. `presentations.ts` and `billing.ts` import only `cacheDelete` (no unused imports). `ingredients.ts` and `recipes.ts` import `cacheGet, cacheSet, cacheDelete` (cacheSet still needed for warming). | ✅ |

## Checks Executed

### Pattern Compliance
- **`cacheDelete` used instead of `cacheSet(key, undefined, 0)`**: ✅ — All 4 files use `cacheDelete` in invalidation functions
- **Async/await correctness**: ✅ — Every invalidation function is `async`, every call site uses `await`
- **No fire-and-forget in invalidation context**: ✅ — Verified via grep
- **`cacheSet` retained only for cache-warming**: ✅ — `ingredients.ts` lines 37, 65; `recipes.ts` lines 53, 81, 86, 111
- **Imports match usage**: ✅ — No unused imports; all imports are necessary

### Lint
- `pnpm eslint .`: 5 errors total — ALL pre-existing (4 in `.opencode/plugins/graphify.js`, 1 in `src/lib/auth.ts:25`). **0 new errors in modified files.**

### Astro Check
- `pnpm astro check`: **0 errors**, 0 warnings, 60 hints (pre-existing). ✅

### Build
- N/A — astro check already validates TypeScript + Astro correctness, which is sufficient scope for this review.

### Fire-and-Forget Scan (grep)
Searched all `cacheDelete` and `cacheSet` calls in `src/lib/db/*.ts`:

| File | Call | Awaited? | Context |
|---|---|---|---|
| `ingredients.ts:13` | `cacheDelete(`ingredients:…`)` | ✅ `await` | Invalidation |
| `ingredients.ts:14` | `cacheDelete(`ingredient_usage:…`)` | ✅ `await` | Invalidation |
| `ingredients.ts:37` | `cacheSet(cacheKey, result, 60)` | ✅ `await` | Cache-warming (listIngredients) |
| `ingredients.ts:65` | `cacheSet(cacheKey, usageByIngredient, 60)` | ✅ `await` | Cache-warming (listIngredientUsage) |
| `recipes.ts:22` | `cacheDelete(`recipes:…`)` | ✅ `await` | Invalidation |
| `recipes.ts:23` | `cacheDelete(`recipe:…`)` | ✅ `await` | Invalidation |
| `recipes.ts:53` | `cacheSet(cacheKey, result, 60)` | ✅ `await` | Cache-warming (listRecipeSummaries) |
| `recipes.ts:81` | `cacheSet(cacheKey, null, 60)` | ✅ `await` | Cache-warming (getRecipeById, not found) |
| `recipes.ts:86` | `cacheSet(cacheKey, result, 60)` | ✅ `await` | Cache-warming (getRecipeById) |
| `recipes.ts:111` | `cacheSet(`recipe:${r.id}`, r, 60)` | ✅ `await` | Cache-warming (getRecipesByIds) |
| `presentations.ts:16` | `cacheDelete(`recipes:…`)` | ✅ `await` | Invalidation |
| `presentations.ts:17` | `cacheDelete(`recipe:…`)` | ✅ `await` | Invalidation |
| `billing.ts:9` | `cacheDelete(`sub:…`)` | ✅ `await` | Invalidation |

**No fire-and-forget calls remain.**

## Findings

### ✅ Passed
1. **All 4 invalidation functions are now async and use `await cacheDelete()`** — `invalidateIngredientCache` (ingredients.ts:12), `invalidateRecipeCache` (recipes.ts:21), `invalidateParentRecipeCache` (presentations.ts:15), `invalidateSubCache` (billing.ts:8)
2. **All call sites use `await`** — 3 callers in each module (create/update/delete for ingredients and recipes; create/update/delete for presentations; createOrUpdate/cancel/markPastDue for billing)
3. **Zero fire-and-forget cache operations remain** — grep confirms every `cacheDelete` and `cacheSet` in `src/lib/db/*.ts` has `await`
4. **`cacheSet` correctly retained for cache-warming** — `ingredients.ts` lines 37, 65; `recipes.ts` lines 53, 81, 86, 111
5. **`pnpm astro check`: 0 errors** — no TypeScript or Astro issues introduced
6. **`pnpm eslint .`: 0 new errors** — all 5 pre-existing errors are in unrelated files (graphify plugin, auth.ts)

### ❌ Issues
- None found. All expectations from the analysis report are met.

## Residual Risks
- Low: If a future contributor adds a new CRUD operation or a new DB module, they must follow the async invalidation pattern. This is a documentation/awareness concern, not a code defect.
- Low: `invalidateRecipeCache` has an optional second parameter `recipeId` for individual recipe cache invalidation. The analysis originally noted `invalidateRecipeCache` takes 2 params — this is intentional (the recipe-level `recipe:${id}` cache is only cleared when a specific recipe is mutated, not on create where no `recipeId` exists yet). This is correct behavior.

## Conclusion
**PASS** — All 4 modules are correctly fixed: cache invalidation functions are `async`, use `await cacheDelete()` instead of the broken `cacheSet(key, undefined, 0)`, and all call sites properly `await` the invalidation. No fire-and-forget promises remain. Both `pnpm astro check` (0 errors) and `pnpm eslint .` (0 new errors) pass.

## Review Summary
<verdict: approved />

## Issues
None.
