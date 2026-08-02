# Spec: Data Layer Boundary — CRUD-only `@recetario/db`

## Problem Statement

The monorepo's data layer has drifted: `packages/db` mixes validation, normalization, and domain logic into what should be pure persistence, while `apps/api` handlers reach into raw `prisma` directly for both domain and infrastructure data. This split means validation rules live in two places (`helpers.ts` in db, Zod schemas in types), tenant-scoping (`ownerId`) is enforced by convention in the API rather than guaranteed by the data layer, and several handlers bypass the CRUD facade entirely (fixed-costs, presentations, usage). The refactor is mid-flight: the db package was partially stripped of validation and renamed methods, but the API still imports the old names (`getRecipeById`, `listIngredients`) and the build is broken.

## Solution

Restore a clean, compiler-enforced data layer boundary:

- `@recetario/db` becomes **pure persistence**: CRUD methods only, returning raw Prisma rows, with every tenant method scoping by `ownerId` as a hard invariant.
- `apps/api` owns **validation (Zod)** and **response shaping** (mapping raw rows into `@recetario/types` DTOs) — and never imports `prisma`.
- `packages/billing` moves its prisma calls into db methods; db owns the plans seed and the `stripe` singleton.
- `packages/auth` keeps the raw `prisma` client (Better Auth adapter requires it).
- The dead `helpers.ts` is deleted; Zod is the single source of validation.

## User Stories

1. As a developer, I want the `@recetario/db` package to expose only CRUD methods (get/create/update/delete/upsert/duplicate), so that the data layer has a single, predictable interface.
2. As a developer, I want every db CRUD method to return raw Prisma rows (or a status object for deletes/duplicate), so that the db package does no shaping or validation.
3. As a developer, I want `apps/api` to be the only place that validates request bodies (via `@recetario/types` Zod schemas) and shapes responses, so that validation rules live in exactly one place.
4. As a developer, I want `apps/api` to never import `prisma` from `@recetario/db`, so that the boundary is compiler-enforced and data access flows through CRUD methods.
5. As a developer, I want every tenant-scoped db method to take `ownerId` and scope its queries by it, so that cross-tenant data access is impossible by construction.
6. As a developer, I want the currently unscoped readers (`getIngredient`, `getPresentation`, `getPresentationsByRecipeId`) fixed to require `ownerId`, so that the tenant-isolation invariant holds everywhere.
7. As a developer, I want the db method names to follow a consistent `get`/`create`/`update`/`delete` prefix (with `duplicate`/`upsert` kept), so that the API surface is predictable.
8. As a developer, I want the API handlers to import the (renamed) db method names, so that the API matches the canonical db surface and the build passes.
9. As a developer, I want `packages/db/src/helpers.ts` deleted and all its validation handled by Zod, so that there is no duplicate validation source.
10. As a developer, I want `packages/billing` to call db CRUD methods instead of raw `prisma`, so that the billing package respects the boundary.
11. As a developer, I want the plans seed (`syncPlansFromStripe`/`seedSubscriptionPlans`) and the `stripe` singleton moved into `packages/db`, so that seeding and plan persistence live with the data layer.
12. As a developer, I want the non-movable Stripe domain logic (webhook lifecycle, pricing plans, `UserSubscription` shaping) to stay in `packages/billing`, so that the billing package keeps its business logic.
13. As a developer, I want `packages/auth` to keep the raw `prisma` client, so that the Better Auth adapter continues to work.
14. As a developer, I want AGENTS.md updated to reflect the new boundary (remove `withFreshDb`/per-request pool/cache references, add the "API never imports prisma" rule), so that the docs match the code.
15. As a developer, I want the db package to have unit tests asserting every tenant method scopes by `ownerId`, so that the security-critical invariant is verifiable.
16. As a developer, I want the API handler tests updated to mock the new db surface (no `prisma` export), so that the handler-level tests keep passing.

## Implementation Decisions

- **db = pure persistence.** Every function in `packages/db` performs a single persistence operation (get/create/update/delete/upsert/duplicate) and returns raw Prisma rows or a result object. No validation, no normalization, no shaping.
- **API owns validation + shaping.** `apps/api` validates request bodies with `@recetario/types` Zod schemas and maps raw rows into DTOs via Zod response schemas before `c.json()`.
- **API never imports `prisma`.** `@recetario/db` keeps exporting `prisma` only for `packages/auth` (Better Auth `prismaAdapter` requires the raw client) and the seed. `apps/api` is forbidden from importing it; the boundary is enforced by convention + review (the export stays for auth).
- **OwnerId is a hard invariant.** Every tenant-scoped db method takes `ownerId` and scopes `where` by it (or via nested `recipe: { ownerId }`). The unscoped readers (`getIngredient`, `getPresentation`, `getPresentationsByRecipeId`) are fixed to require `ownerId`. The AGENTS.md security note moves from "every query in apps/api" to "every CRUD method in packages/db".
- **Method naming.** Canonical db names: `getRecipe`, `getRecipeSummaries` (renamed from `listRecipeSummaries`), `getRecipesByIds`, `createRecipe`, `updateRecipe`, `deleteRecipe`, `duplicateRecipe`; `getIngredients`, `getIngredient`, `createIngredient`, `updateIngredient`, `deleteIngredient`, `getIngredientUsage` (renamed from `listIngredientUsage`); `getPresentation`, `getPresentationsByRecipeId`, `createPresentation`, `updatePresentation`, `deletePresentation`; `createRecipeFixedCost`, `updateRecipeFixedCost`, `deleteRecipeFixedCost`, `createPresentationFixedCost`, `updatePresentationFixedCost`, `deletePresentationFixedCost`; `getUserPreferences`, `upsertUserPreferences`. The API imports are updated to match these names (db names are canonical, not the API's).
- **Signature convention.** Each db method uses `Omit<>` on the generated Prisma input types to drop the fields the method itself provides (`ownerId` on create, `recipeId` on nested creates), so the API→db calls typecheck cleanly without extra mapping.
- **Billing boundary.** `packages/billing` moves its 18 raw prisma calls into db methods (`getSubscriptionPlans`, `upsertSubscriptionPlan`, `deactivatePlansNotIn`, `getSubscriptionByUserId`, `getSubscriptionByStripeId`, `upsertSubscription`, `updateSubscriptionStatus`, `getPlanByStripePriceId`, `getStripeCustomerId`, `countUserRecipes`, `countUserIngredients`). The plans seed (`syncPlansFromStripe`/`seedSubscriptionPlans`), `FEATURE_FLAGS`, and the `stripe` singleton move into `packages/db`. The Stripe domain logic (webhook lifecycle mapping, `getPricingPlans`, `UserSubscription`/`CreateSubscriptionInput` DTOs, `buildPricingPlans`, `resolveSubscription`, `TIER_CONFIG`, `formatCurrency`) stays in billing, calling db methods.
- **`helpers.ts` deleted.** All validation is handled by the existing `@recetario/types` Zod schemas; there is no second source of truth.
- **Prisma schema untouched.** Only the db package's code and the generated client change; the schema/migrations are not modified.
- **Infra methods.** Thin db methods added for the API's infra needs: `getCredentialAccount`, `updateAccount`, `updateUser`, `logAuditEvent` (exists), `getUsageCounts`. Decision logic (e.g. "is the user over the plan limit?") stays in the API.

## Testing Decisions

- **Primary seam (existing): API handler tests.** Each handler test mocks `@recetario/db` at module level (`vi.mock("@recetario/db")`) and asserts: unauthenticated → 401; invalid body → 400 `VALIDATION_ERROR`; valid body → correct db method called with correct args (including `ownerId`); correct response shaping. This is exactly the pattern in `apps/api/src/recipes/create.test.ts` and `apps/api/src/ingredients/delete.test.ts`. The mock shape changes to drop the now-removed `prisma: {}` export and use the renamed method names.
- **Secondary seam (new): db package unit tests.** A minimal Vitest setup in `packages/db` (confirm with the user — no test infra exists there yet) mocks the `prisma` client and asserts, for every tenant CRUD method, that the generated `where` includes `ownerId` (or the nested `recipe: { ownerId }` equivalent). This is the only seam that can catch the cross-tenant hole currently in `getIngredient`/`getPresentation`. Prior art: none in db; the API's Vitest + mock-factory pattern is the closest existing style.
- **What makes a good test:** only external behavior — the db methods' query shapes (via mocked prisma call args) and the handlers' HTTP contract (status codes, error codes, response bodies). Not implementation details like internal helper functions.

## Out of Scope

- Prisma schema or migration changes (the generator switch to `prisma-client` is a separate decision; this spec does not alter `schema.prisma`).
- `packages/auth` refactoring — it keeps the raw `prisma` client and its current structure.
- The data-layer-boundary ADR itself (handled in a separate conversation; this spec records the decisions it encodes).
- Web app changes — `apps/web` already calls the API via `apiFetch` and is unaffected.
- Stripe domain-logic restructuring beyond moving the seed + singleton; the webhook lifecycle stays in billing.
- No UI or user-facing behavior changes.

## Further Notes

- The refactor is mid-flight and the build is currently broken (`tsc` fails across `apps/api` with ~30 errors from stale imports and signature mismatches); completing the boundary fixes those.
- `packages/db/src/types.ts` was already deleted and `packages/db/src/helpers.ts` is now dead code — both consistent with the target state.
- AGENTS.md is stale in several places (the `withFreshDb` paragraph, the `pg.Pool` description, the `packages/db/src/cache.ts` reference, the `RecipeIngredient` composite-PK claim) and must be corrected to match the new boundary. The in-memory `apps/api/src/cache.ts` is unaffected.
- CONTEXT.md glossary already documents the "Data layer" terms (CRUD method, data layer boundary, raw row).
