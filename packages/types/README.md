# `@recetario/types` — Shared TypeScript types

Cross-package type definitions for the KitchCalc monorepo. Lives outside `@recetario/db` so consumers don't have to import the data layer to share a type.

## What it contains

- `types.ts` — domain types (Ingredient, Recipe, FixedCost, Presentation, etc.) moved from `@recetario/db`
- `api/errors.ts` — `ApiErrorCode`, `ApiErrorResponse` (the uniform error envelope shape)
- `api/errors.zod.ts` — Zod schemas for the error envelope + `parseApiError(res)` helper
- `api/reasons.ts` — closed list of `DOMAIN_ERROR` reasons

## Usage

```ts
import type { Ingredient, RecipeWithIngredients } from "@recetario/types";
import { ApiErrorCodeSchema, parseApiError } from "@recetario/types";
```

## Environment variables

None. This package is pure type definitions and validation schemas.

## peerDependencies

None. `zod` is a direct dependency.

## Exports

Public API surface (see `src/index.ts`):

```text
// types.ts
Ingredient, RecipeIngredient, RecipeIngredientWithData,
FixedCostType, FixedCostBase, FixedCostLine,
RecipeFixedCost, PresentationFixedCost, FixedCostInput,
RecipePresentation, RecipeWithIngredients, RecipeSummary,
CreateIngredientInput, UpdateIngredientInput, CreatePresentationInput,
DeleteIngredientResult, DeletePresentationResult, DeleteRecipeResult,
UserPreferences, CreateRecipeInput, UpdateRecipeInput

// api/errors.ts
ApiErrorCode, ApiErrorResponse, ApiErrorParsed

// api/errors.zod.ts
ApiErrorCodeSchema, DomainErrorReasonSchema, ApiErrorResponseSchema,
parseApiError

// api/reasons.ts
DOMAIN_ERROR_REASONS, DomainErrorReason
```
