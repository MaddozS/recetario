# Decompose monolithic Astro page files

## Problem Statement

Three Astro page files exceed 1,000 lines each: `recipes/[recipe].astro` (1,762 lines), `ingredients.astro` (1,115 lines), and `settings.astro` (1,232 lines). These files mix data fetching (Prisma queries), POST form handling (mutations), template markup, and inline client scripts in a single module. The recipe page alone handles recipe CRUD, presentation CRUD, fixed-cost CRUD, ingredient management, instructions editing, tab state, and production calculations. Navigating a single concern (e.g., understanding how ingredient updates work) requires scrolling past unrelated markup and form-handling code for other features.

## Solution

Extract data-fetching and POST-handling logic from each page into page-specific lib modules. The Astro page files become thin composition layers: fetch data in the frontmatter via lib modules, render components in the template. This follows the existing pattern where `packages/db` provides data access — the page-specific lib modules bridge the gap between raw DB queries and page-template data shapes.

## User Stories

1. As a developer debugging an ingredient-update bug, I want to find the mutation logic in a focused ~50-line module rather than searching a 1,115-line file, so that I can locate and fix the issue faster.
2. As a developer adding a new recipe feature, I want to add the data logic in a lib module and the UI in a component, without touching the page file, so that I reduce the blast radius of my change.
3. As a developer understanding how presentations work, I want to read a single `recipe-presentations.ts` module rather than digesting half of a 1,762-line file, so that I can build a mental model quickly.
4. As a developer reviewing a PR that changes settings, I want the data-layer diff to be separate from the template diff, so that I can verify each concern independently.
5. As a developer working with the recipe page, I want the frontmatter to fit on one screen (~100 lines), so that I can understand the page's data dependencies at a glance.

## Implementation Decisions

### Approach

This is done incrementally — one page at a time, extracting one concern at a time. No single massive refactor. Each extraction produces:

1. A lib module (e.g., `apps/web/src/lib/recipe-page-data.ts`) containing the extracted logic.
2. An updated page file where the frontmatter calls the lib module.

### Recipe page extraction plan

The recipe page is the largest and most complex. Target extractions:

- **Fixed-cost CRUD handlers** → `apps/web/src/lib/recipe-fixed-costs.ts`: create, update, delete handlers (currently inline POST handling + `renderFixedCostCardSnippet`)
- **Presentation CRUD handlers** → `apps/web/src/lib/recipe-presentations.ts`: create, update, delete handlers + form-error mapping
- **Recipe ingredient update handler** → extracted into its own function in a lib module
- **URL-building helpers** (`buildPresentationSectionUrl`, `buildRecipePageUrl`) → remain as inline helpers or move to utils

### Ingredients page extraction plan

- **CRUD handlers** (create, update, delete, block-check) → `apps/web/src/lib/ingredients-page-data.ts`

### Settings page extraction plan

- **Account update handlers** → `apps/web/src/lib/settings-page-data.ts`
- **Preference update handlers** → same module

### Constraints

- No behavioral changes — exact same queries, same responses, same redirects, same error handling.
- Existing components (RecipeFixedCosts, PresentationCard, etc.) are not modified.
- The Prisma `ownerId` guard is preserved in every extracted query.
- No new dependencies or packages.

## Testing Decisions

No test infrastructure exists. Verification is operational:
- After each page extraction, visually verify the page renders identically at desktop (1280px) and mobile (375px).
- For recipe page: perform create/update/delete operations on ingredients, fixed costs, and presentations — confirm no regressions.
- For ingredients page: perform create/update/delete operations — confirm blocked-delete detection works.
- For settings page: update name, email, password, preferences — confirm all operations succeed.

## Out of Scope

- Restructuring the template markup or component hierarchy.
- Extracting client-side JavaScript from the page files.
- Adding test infrastructure or test files.
- Creating new reusable components or layout abstractions.
- Changing the POST-to-same-page form pattern (per AGENTS.md: "Forms: no Astro Actions. POST to the same page").
- Extracting page-specific logic into `packages/db` — page data shapes are UI concerns, not data-layer concerns.

## Further Notes

This is the Bonus candidate from the July 24, 2026 architecture review. It's the highest-effort candidate and should be done incrementally — one page at a time, one concern at a time. The recipe page (1,762 lines) is the highest priority due to its complexity. Each extraction can be verified independently and merged separately, minimizing risk of a large monolithic PR.
