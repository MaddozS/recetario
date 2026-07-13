# Validator Report: task-20260702-recipe-fixes-v3-validate

## Validation Scope
- **Changed file**: `apps/web/src/pages/recipes/[recipe].astro` (+ new import `InstructionsEditor`, restructured preparación panel, fixed costs display simplification, `false &&` guard on `PresentationFixedCosts`, `overflow-visible` on ingredient Card, ingredient picker UI)
- **Task**: Run `pnpm astro check` and `pnpm eslint .` (via `pnpm lint`), classify errors as new vs pre-existing

## Skills Used
Selected:
- `ponytail` — concise reporting

Discarded:
- `brainstorming` — not a creative task
- `design-system-verify` — no UI/color/icon verification requested, only type/lint checking
- `diagnose` — no bug to diagnose

Added During Execution:
- none

## Commands Run

| Command | Result | Evidence |
|---------|--------|----------|
| `pnpm astro check` | **pass** — 0 errors, 0 warnings, 11 hints | All hints are `document.execCommand` deprecation warnings (7 in `InstructionsEditor.astro`, new component), plus pre-existing unused-variable hints in `LandingLayout.astro:46`, `[recipe].astro:429,483`, `recipes/index.astro:71` |
| `pnpm lint` (eslint via turbo) | **fail** — 10 errors (1 new, 9 pre-existing) | See Failures section |

## Failures

### NEW error (introduced by v3 diff)

1. **`[recipe].astro:1223:18` — `no-constant-binary-expression`**
   - **Code**: `{false && ( <PresentationFixedCosts ... /> )}`
   - **Root cause**: The v3 diff wrapped `PresentationFixedCosts` in a `{false && (...)}` guard with a comment "hidden until presentation-level FC planning is complete". ESLint's `no-constant-binary-expression` rule flags constant truthiness on the left of `&&`.
   - **Fix**: Replace with `{false ? ( ... ) : null}` to satisfy the rule, or just comment out the JSX entirely.

### PRE-EXISTING errors (not introduced by v3 diff)

| Line | Rule | Code |
|------|------|------|
| 422:25 | `@typescript-eslint/no-explicit-any` | `type: type as any` — `create_recipe_fixed_cost` handler |
| 423:25 | `@typescript-eslint/no-explicit-any` | `base: base as any` — same handler |
| 477:25 | `@typescript-eslint/no-explicit-any` | `type: type as any` — `create_presentation_fixed_cost` handler |
| 478:25 | `@typescript-eslint/no-explicit-any` | `base: base as any` — same handler |
| 543:39 | `@typescript-eslint/no-explicit-any` | `type: type as any` — `update_fixed_cost` handler |
| 543:58 | `@typescript-eslint/no-explicit-any` | `base: base as any` — same handler |
| 548:39 | `@typescript-eslint/no-explicit-any` | `type: type as any` — `update_fixed_cost` handler (presentation branch) |
| 548:58 | `@typescript-eslint/no-explicit-any` | `base: base as any` — same handler |
| 1495:94 | `no-empty` | `try { ... } catch {}` — empty catch block in script (pre-existing, in client-side tab persistence code) |

All 9 pre-existing errors are in code sections that were NOT modified by the v3 diff. They involve `as any` casts on Prisma enum fields and a deliberately empty catch block.

### Astro check hints (non-blocking)

- 7 deprecation warnings for `document.execCommand()` in `InstructionsEditor.astro` (new component) — warnings only, not errors
- 1 unused variable `media` in `LandingLayout.astro:46`
- 2 unused `fixedCostCardHtml` in `[recipe].astro:429,483`
- 1 unused `dupResult` in `recipes/index.astro:71`

## Visual QA
Not performed — no browser/dev-server requested or available in this validation scope.

## Verdict
**fail** — 1 new ESLint error introduced by the v3 diff (`no-constant-binary-expression` at line 1223 due to `{false && ...}` guard). `pnpm astro check` passes cleanly (no type errors).
