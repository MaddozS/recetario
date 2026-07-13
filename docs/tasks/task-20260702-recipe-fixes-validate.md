# Validator Report: task-20260702-recipe-fixes-validate

## Validation Scope
- Changed files:
  - `apps/web/src/pages/recipes/[recipe].astro`
  - `apps/web/src/components/PresentationCard.astro`
  - `apps/web/src/components/RecipeFixedCosts.astro`
  - `apps/web/src/components/PresentationFixedCosts.astro`
  - `apps/web/src/components/FixedCostCard.astro`

## Skills Used
Selected:
- `ponytail` — concise reporting
- `better-auth-best-practices` — pre-loaded (context from password-reset flow)

Discarded: none

Added During Execution: none

## Parallel Context
- Parallel group: none

## Commands Run

| Command | Result | Evidence |
|---------|--------|----------|
| `pnpm astro check` | PASS | 0 errors, 0 warnings, 11 hints (all hints pre-existing except 2 `fixedCostCardHtml` unused hints in `[recipe].astro:428,482`) |
| `pnpm eslint .` (via `pnpm lint`) | FAIL | 9 errors in `apps/web/src/pages/recipes/[recipe].astro` — all **new** |
| `pnpm build` | FAIL | `"webcrypto" not exported by "__vite-browser-external"` — **pre-existing** Prisma 7 + Vite SSR incompatibility |

## ESLint Errors (all new — no pre-existing failures in apps/web/)

All 9 errors in `apps/web/src/pages/recipes/[recipe].astro`:

1. **Line 421:25** — `Unexpected any. Specify a different type` (`type as any` cast)
2. **Line 422:25** — `Unexpected any. Specify a different type` (`base as any` cast)
3. **Line 476:25** — `Unexpected any. Specify a different type` (`type as any` cast)
4. **Line 477:25** — `Unexpected any. Specify a different type` (`base as any` cast)
5. **Line 542:39** — `Unexpected any. Specify a different type` (`type as any` cast)
6. **Line 542:58** — `Unexpected any. Specify a different type` (`base as any` cast)
7. **Line 547:39** — `Unexpected any. Specify a different type` (`type as any` cast)
8. **Line 547:58** — `Unexpected any. Specify a different type` (`base as any` cast)
9. **Line 1476:94** — `Empty block statement` (`try { sessionStorage.setItem(...) } catch {}`)

The 8 `no-explicit-any` errors are on Prisma enums cast with `as any` in the `create_fixed_cost`, `create_presentation_fixed_cost`, and `update_fixed_cost` handlers. The `no-empty` is on the tab-persistence `catch {}` block in the script section.

## Astro Check Hints

| Hint | File | Pre-existing or New |
|------|------|---------------------|
| `document.execCommand` deprecated (7x) | `InstructionsEditor.astro` | Pre-existing |
| `media` declared but never read | `LandingLayout.astro:46` | Pre-existing |
| `fixedCostCardHtml` declared but never read | `[recipe].astro:428` | **New** — declared but only used to render a JSON-serialized HTML snippet for AJAX response |
| `fixedCostCardHtml` declared but never read | `[recipe].astro:482` | **New** — same pattern, second handler |
| `dupResult` declared but never read | `recipes/index.astro:71` | Pre-existing |

## Build Failure Details

The build fails at Vite bundling with:
```
"webcrypto" is not exported by "__vite-browser-external"
at @prisma/client/runtime/client.mjs:2916:9
```

This is a **pre-existing** Prisma 7 + Vite SSR build incompatibility — the Prisma client runtime imports Node.js built-in modules (`webcrypto`, `fileURLToPath`, `dirname`, etc.) that Vite's browser-external shim doesn't provide. None of the 5 changed files touch Vite config, Prisma schema, or bundler settings. The same error would occur without any recipe-page changes.

## Visual QA
Build does not complete — cannot run dev server to verify visual rendering. Visual QA deferred.

## Failures

### New (introduced by builder diff)
- **ESLint**: 9 errors in `apps/web/src/pages/recipes/[recipe].astro`
  - 8x `@typescript-eslint/no-explicit-any` from `as any` casts for Prisma enum fields
  - 1x `no-empty` from empty `catch {}` block

### Pre-existing (not caused by builder)
- **Build**: `"webcrypto" not exported by "__vite-browser-external"` — Prisma 7 client runtime incompatibility with Vite SSR bundling

## Verdict
**partial** — Astro type-checking passes cleanly. ESLint reveals 9 new errors in the builder's changed file. Build failure is pre-existing and unrelated to the changes. Builder should fix the 9 ESLint errors (replace `as any` casts with proper Prisma enum types, add a no-empty comment or `catch { /* sessionStorage may throw in some browsers */ }`).
