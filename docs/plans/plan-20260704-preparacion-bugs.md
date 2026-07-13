# Plan: Fixes for preparación section bugs

## Summary
Address 4 bugs in the recipe preparación (instructions) section: list markers missing in edit mode, HTML list duplication in read mode, unwanted border dividers around the editor, and horizontal margin inconsistency. Three files, all CSS/regex/markup fixes — no data, auth, or business-logic changes.

## Inputs
- Spec: docs/analysis/analysis-20260704-preparacion-bugs.md
- Memory context: none (bugs are self-contained, no prior decisions reused)
- Explore reports: none (orchestrator already read all relevant source)

## Skills
Selected:
- ponytail — minimal fixes, no over-engineering
Discarded:
- design-system-verify — not needed for planning phase
- prisma-client-api — no DB changes
- ui-ux-pro-max — simple CSS/HTML fixes
- impeccable — not a design task
- better-auth-best-practices — no auth changes
- security-best-practices — no security impact
May load if needed:
- none
Added During Execution:
- none

## Human Approval
not-required — purely cosmetic fixes, no data/auth/business-logic risk, all risks rated Low in analysis

## Task Dependencies
| Task | Depends On | Parallel-Safe | Reason |
|------|------------|---------------|--------|
| Task 1 | — | yes (single task) | Only task in this plan |

## Parallel Execution Groups
| Group | Tasks | Phase | Safe Because | Must Run Sequentially If |
|-------|-------|-------|--------------|--------------------------|
| - | Task 1 | build | Single task | N/A |

## Tasks

### Task 1: Fix preparación section bugs (4 bugs, 3 files)
Scope: fix
Owner: kitchcalc-builder
Editable files or file groups:
- apps/web/src/styles/global.css (lines 367-371)
- apps/web/src/lib/instructions-parser.ts (line 224)
- apps/web/src/components/InstructionsEditor.astro (line 22)

Instructions:

**Bug 1 — List markers missing in edit mode** (global.css):
1. Add `list-style-type: disc;` inside `.contenteditable-editor ul` rule
2. Add `list-style-type: decimal;` inside `.contenteditable-editor ol` rule
3. Both rules already exist at lines 367-371 of global.css; add the property alongside existing `padding-left` and `margin`

**Bug 2 — HTML list duplication in read mode** (instructions-parser.ts):
1. On line 224, change the regex from `/(div|h2|h3|p|ol|ul|li)/` to `/(div|h2|h3|p)/` (remove `ol`, `ul`, `li` from the alternation)
2. This regex is used by `parseHtmlSteps()` which is only called from `RecipeInstructions.astro` line 40 in read mode
3. The fallback `if (steps.length === 0 && html.trim())` at line 230 will capture solo lists as a single step — acceptable behavior

**Bug 3 — Unwanted border dividers** (InstructionsEditor.astro):
1. On line 22, remove `border-y` from the wrapper div's class string
2. The wrapper currently reads: `<div class="border-border mx-5 border-y py-6 sm:mx-6 lg:mx-8">`
3. After removal: `<div class="border-border mx-1 mt-6 py-6 sm:mx-2 lg:mx-8">` (margins handled in Bug 4 below)

**Bug 4 — Margin misalignment** (InstructionsEditor.astro):
1. On line 22, change `mx-5` to `mx-1` and `sm:mx-6` to `sm:mx-2`
2. Add `mt-6` (top margin to match the tab-bar spacing convention used by other panels, e.g., `RecipeInstructions.astro` line 67)
3. Keep `lg:mx-8` unchanged (already consistent with other panels)
4. Final wrapper class: `class="border-border mx-1 mt-6 py-6 sm:mx-2 lg:mx-8"`

Pre-existing code this task builds on:
- `.contenteditable-editor ul/ol` rules in `apps/web/src/styles/global.css` (lines 367-371) — already styled, missing only `list-style-type`
- `parseHtmlSteps()` in `apps/web/src/lib/instructions-parser.ts` (lines 222-232) — used only by `RecipeInstructions.astro`
- `InstructionsEditor.astro` wrapper div (line 22) and `RecipeInstructions.astro` panel margins (line 67) — existing patterns to align with

Acceptance criteria:
- Listas numeradas muestran número en modo edición (contenteditable)
- Listas con viñetas muestran punto (bullet) en modo edición
- Pasos con listas HTML en modo lectura no se duplican ni muestran doble numeración
- No hay bordes horizontales (border-y) alrededor del editor de preparación
- El editor está alineado horizontalmente con la tab bar superior y demás paneles
- `pnpm astro check` pasa sin errores nuevos
- `pnpm eslint .` no introduce errores nuevos
- Spanish copy: no new user-facing text introduced — labels unchanged

Suggested skills:
- ponytail — minimal fixes, no over-engineering

Dependency and parallel safety:
- Depends on: none
- Parallel group: none (single task)
- Parallel-safe: yes (single task, no siblings)

Validation:
- `pnpm astro check` — verify no type errors
- `pnpm eslint .` — verify no lint errors
- Visual QA:
  - Run `pnpm dev`, open a recipe edit page
  - Desktop (1280px): verify list markers visible in contenteditable, no border-y dividers, margins match tab bar
  - Mobile (375px): verify same checks, margins not too wide (mx-1 = 4px per side vs old mx-5 = 20px per side)
  - Read mode: open a recipe with HTML list instructions, verify no duplicate steps

## Validation Parallelism
- Full-suite checks: `pnpm astro check` + `pnpm eslint .` after Task 1 completes
- Visual QA: manual verification per acceptance criteria above

## Reviewer Parallelism
- Single reviewer for Task 1 (only task)
- Consolidated reviewer not needed

## Reviewer Focus
- `parseHtmlSteps` regex change: verify no edge cases where `<ol>/<ul>/<li>` removal causes content loss (shouldn't — fallback captures solo lists)
- `InstructionsEditor.astro` wrapper class: verify `mt-6` doesn't double with parent container spacing
- CSS `list-style-type`: verify Tailwind preflight `list-style: none` isn't reapplied by another selector
- Visual parity: mobile and desktop should both show list markers, same margins relative to viewport

## Planner Verdict
ready
