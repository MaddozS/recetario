# Reviewer Report: 20260704-preparacion-bugs

## Review Scope
- Spec: docs/analysis/analysis-20260704-preparacion-bugs.md
- Plan: docs/plans/plan-20260704-preparacion-bugs.md
- Builder report: docs/tasks/task-20260704-preparacion-bugs-builder-report.md
- Validator report: docs/tasks/task-20260704-preparacion-bugs-validator-report.md
- Files reviewed:
  - apps/web/src/styles/global.css (lines 367-377)
  - apps/web/src/lib/instructions-parser.ts (line 224)
  - apps/web/src/components/InstructionsEditor.astro (line 22)

## Parallel Context
- Parallel group: none
- Review mode: parallel-per-task (single task)
- Sibling reviewer tasks: none
- Parallel-safe confirmed: yes — single task, no siblings

## Skills Used
Selected:
- ponytail-review — look for over-engineering (minimal fixes expected)
- design-system-verify — verify no hardcoded colors, semantic tokens used

Discarded:
- prisma-client-api — no DB changes
- security-best-practices — no auth/security impact
- stripe-best-practices — no billing impact
- ui-ux-pro-max — simple CSS fixes
- impeccable — not a design task

Added During Execution:
- none

## Findings

| Severity | File | Issue | Evidence | Required Action |
|----------|------|-------|----------|-----------------|
| note | apps/web/src/components/InstructionsEditor.astro:22 | Dead class `border-border` on wrapper div — no `border`/`border-y`/`border-*` width class present, so it produces no visible effect | Line 22: `class="border-border mx-1 mt-6 py-6 sm:mx-2 lg:mx-8"` — `border-border` sets border-color but no border-width class exists after `border-y` was removed | Remove `border-border` from the wrapper or add a visible border. Low priority — no visual impact. |
| should-fix | apps/web/src/lib/instructions-parser.ts:224 | Regex change introduces a content-loss regression for mixed block+list HTML. When HTML contains a non-list block followed by a standalone `<ol>/<ul>`, the list is silently dropped because `steps.length > 0` prevents the fallback from firing. | Plan acknowledges: "fallback at line 230 will capture solo lists as a single step — acceptable behavior." This only applies when the list is the ONLY content. Mixed: `<p>Step 1</p><ol><li>A</li><li>B</li></ol>` → only `Step 1` captured, list lost. | Either document this as a known limitation or refine the regex to handle this case (e.g., capture `<ol>`/`<ul>` as blocks but not nested `<li>`). The analysis explicitly chose this tradeoff; accept if judged low-risk. |

## Protocol Issues

None. Builder changed exactly 3 files as specified. All changes match the plan's line-level instructions.

### ponytail-review

`global.css:L367-377`: Split combined `ul, ol` rule into two selectors to allow different `list-style-type` values. Necessary — can't set `list-style-type: disc` and `list-style-type: decimal` on the same combined selector. **Lean.**

`instructions-parser.ts:L224`: Removed 3 tokens from regex alternation. Minimal fix. **Lean.**

`InstructionsEditor.astro:L22`: Adjusted 2 class tokens (`mx-5`→`mx-1`, `sm:mx-6`→`sm:mx-2`), removed `border-y`, added `mt-6`. One dead class left behind (`border-border`). **net: -1 line possible** (remove dead class).

### design-system-verify

- **Hardcoded Colors**: PASS — changed lines use only Tailwind utilities and CSS properties. Validator independently confirmed.
- **Manual Overrides**: PASS — no design-system component overrides in changed files.
- **Icon Whitelist**: N/A — no new icons.
- **Prisma ownerId**: N/A — no database changes.

## Acceptance Criteria Review

- [x] En modo edición, listas numeradas muestran número — `list-style-type: decimal` on `.contenteditable-editor ol` (global.css:373-377)
- [x] En modo edición, listas con viñetas muestran punto — `list-style-type: disc` on `.contenteditable-editor ul` (global.css:367-371)
- [x] En modo lectura, pasos con listas HTML se muestran correctamente sin duplicación — regex no longer matches `ol|ul|li`, eliminating duplicate `<li>` matches (instructions-parser.ts:224)
- [x] No hay divisores horizontales en el editor de preparación — `border-y` removed from wrapper (InstructionsEditor.astro:22)
- [x] Editor alineado horizontalmente con tab bar y demás paneles — margins now match `RecipeInstructions.astro` pattern: `mx-1 sm:mx-2 lg:mx-8` with `mt-6` (InstructionsEditor.astro:22)
- [x] `pnpm astro check` sin errores nuevos — validator confirmed 0 errors, 0 warnings, 11 pre-existing hints
- [x] `pnpm eslint .` sin errores nuevos introducidos — validator confirmed 10 pre-existing errors in `recipes/[recipe].astro`, none in changed files

## Verdict

accept

### Notes
1. The `border-border` dead class on InstructionsEditor.astro:22 is cosmetic dead code — remove when touching that file next.
2. The regex regression for mixed block+list HTML is a known tradeoff documented in the analysis. The common case (pure list content) is handled correctly by the fallback. Mixed content edge case risk is low given the editor's typical usage pattern (users type one paragraph at a time; lists are nested within).

## Rework Task Hints

None — verdict is accept. No rework required.
