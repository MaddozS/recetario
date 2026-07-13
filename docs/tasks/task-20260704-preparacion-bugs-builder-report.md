# Builder Report: 20260704-preparacion-bugs

## Task Received
Fix 4 bugs in the preparación (instructions) section: list markers missing in edit mode, HTML list duplication in read mode, unwanted border dividers, and margin misalignment. 3 files, all CSS/regex/markup fixes.

## Context Received
- Spec: docs/analysis/analysis-20260704-preparacion-bugs.md
- Plan: docs/plans/plan-20260704-preparacion-bugs.md
- State: docs/tasks/task-20260704-preparacion-bugs-state.json
- Context pack: Self-contained bug fixes, no prior decisions reused

## Parallel Context
- Parallel group: none
- Depends on: none
- Sibling tasks: none
- Parallel-safe confirmed: yes — single task

## Skills Used
Selected:
- ponytail — minimal fixes, no over-engineering

Discarded:
- design-system-verify — will be checked by reviewer
- prisma-client-api — no DB changes
- ui-ux-pro-max — simple CSS/markup fixes

Added During Execution:
- none

## Files Read
| File | Reason | Decision |
|------|--------|----------|
| docs/tasks/task-20260704-preparacion-bugs-builder.md | Task instructions | Exact fix specs |
| docs/analysis/analysis-20260704-preparacion-bugs.md | Root cause analysis | Confirmed regex/CSS/markup issues |
| docs/plans/plan-20260704-preparacion-bugs.md | Implementation plan | Exact line-level changes |
| apps/web/src/styles/global.css:367-371 | Bug 1: missing list-style-type | Split combined rule, added disc/decimal |
| apps/web/src/lib/instructions-parser.ts:224 | Bug 2: regex includes ol/ul/li | Removed ol\|ul\|li from block regex |
| apps/web/src/components/InstructionsEditor.astro:22 | Bugs 3+4: border-y + margins | Removed border-y, adjusted margins |

## Files Changed
| File | Change |
|------|--------|
| apps/web/src/styles/global.css | Split `.contenteditable-editor ul, ol` into separate rules; added `list-style-type: disc` to ul, `list-style-type: decimal` to ol |
| apps/web/src/lib/instructions-parser.ts | Changed block regex from `/(div\|h2\|h3\|p\|ol\|ul\|li)/` to `/(div\|h2\|h3\|p)/` |
| apps/web/src/components/InstructionsEditor.astro | Removed `border-y`, changed `mx-5` to `mx-1`, `sm:mx-6` to `sm:mx-2`, added `mt-6` |

## Commands Run
| Command | Result | Notes |
|---------|--------|-------|
| `pnpm eslint .` | Command not found | ESLint not available via pnpm — no direct eslint script configured |
| `pnpm astro check` | 0 errors, 0 warnings, 11 hints | All hints pre-existing (fixedCostCardHtml, dupResult). No new issues introduced |

## Acceptance Criteria Status
- [x] List markers visible in edit mode (list-style-type: disc for ul, decimal for ol)
- [x] Read mode: HTML list instructions don't duplicate steps (removed ol/ul/li from regex)
- [x] No horizontal borders around editor (removed border-y)
- [x] Editor aligned with tab bar (mx-1, sm:mx-2, mt-6)
- [x] pnpm astro check passes without new errors (0 errors, 0 warnings)
- [ ] pnpm eslint . results — unable to verify (eslint not available in environment)

## Failures Or Blockers
- `pnpm eslint .` fails with "command not found" — pre-existing issue with eslint configuration. The project uses `turbo run lint` but eslint binary isn't directly accessible. Pre-existing issue documented in state.json.

## Notes For Reviewer
- **Bug 1**: Split the combined `ul, ol` selector into two separate rules to allow different `list-style-type` values. This is slightly more verbose but necessary — Tailwind preflight resets `list-style: none` globally, so explicit re-declaration is required.
- **Bug 2**: The fallback at line 230 (`if (steps.length === 0 && html.trim())`) still captures solo lists as a single step — acceptable edge case.
- **Bugs 3+4**: Final wrapper class is `class="border-border mx-1 mt-6 py-6 sm:mx-2 lg:mx-8"` — matches other panel margins (e.g., RecipeInstructions.astro line 67).
- **Visual QA needed**: Run `pnpm dev` and verify list markers render at desktop (1280px) and mobile (375px), and that editor margins align with the tab bar. Full visual QA belongs to kitchcalc-validator.
