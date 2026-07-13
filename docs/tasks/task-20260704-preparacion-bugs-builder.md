# Task: Fix preparación section bugs (4 bugs, 3 files)

## Assigned Agent
kitchcalc-builder

## Context Received
- Spec: docs/analysis/analysis-20260704-preparacion-bugs.md
- Plan: docs/plans/plan-20260704-preparacion-bugs.md
- State: docs/tasks/task-20260704-preparacion-bugs-state.json
- Memory context: none

## Dependency And Parallel Safety
- Depends on: none
- Parallel group: none
- Parallel-safe: yes (single task)
- Sibling tasks: none

## Skills
Selected:
- ponytail — minimal fixes, no over-engineering

Discarded:
- design-system-verify — will be checked by reviewer
- prisma-client-api — no DB changes
- ui-ux-pro-max — simple CSS/markup fixes

May load if needed:
- none

## Scope
Editable files or file groups:
- apps/web/src/styles/global.css (lines 367-371)
- apps/web/src/lib/instructions-parser.ts (line 224)
- apps/web/src/components/InstructionsEditor.astro (line 22)

Forbidden files:
- prisma/schema.prisma
- packages/*
- astro.config.mjs
- middleware.ts
- All other files

## Instructions

### Bug 1 — List markers missing in edit mode (global.css)
1. In `apps/web/src/styles/global.css`, lines 367-371, add `list-style-type: disc;` to `.contenteditable-editor ul` rule
2. Add `list-style-type: decimal;` to `.contenteditable-editor ol` rule
3. Keep existing `padding-left` and `margin` properties

### Bug 2 — HTML list duplication in read mode (instructions-parser.ts)
1. In `apps/web/src/lib/instructions-parser.ts`, line 224, change the regex alternation from `(div|h2|h3|p|ol|ul|li)` to `(div|h2|h3|p)`
2. This removes `ol`, `ul`, `li` from the block regex — lists become inline content within parent steps
3. The fallback `if (steps.length === 0 && html.trim())` at line 230 already handles solo lists as a single step

### Bug 3 — Unwanted border dividers (InstructionsEditor.astro)
1. In `apps/web/src/components/InstructionsEditor.astro`, line 22, remove `border-y` from the wrapper div class
2. Current: `class="border-border mx-5 border-y py-6 sm:mx-6 lg:mx-8"`
3. After removing border-y and applying Bug 4 margin fix, final: `class="border-border mx-1 mt-6 py-6 sm:mx-2 lg:mx-8"`

### Bug 4 — Margin misalignment (InstructionsEditor.astro)
1. On line 22, change `mx-5` to `mx-1` and `sm:mx-6` to `sm:mx-2` 
2. Add `mt-6` for top margin to match other panels
3. Keep `lg:mx-8` unchanged

IMPORTANT: Edit the file at `apps/web/src/components/InstructionsEditor.astro`. This filename contains NO brackets — it's a regular component file, NOT the `[recipe].astro` route file. The `edits` array workaround for bracket filenames is NOT needed here.

## Pre-Flight Verification
Before starting:
1. Run `pnpm eslint .` and note EXISTING errors so you can distinguish pre-existing from introduced
2. Record the baseline in your report

## Post-Implementation Verification
After making changes:
1. Run `pnpm astro check` — verify no NEW type errors
2. Run `pnpm eslint .` — compare against baseline, classify any errors as "introduced" vs "pre-existing" with evidence
3. Run `pnpm dev` and visually verify:
   - Desktop (1280px): contenteditable shows list markers (numbered/bullet), no border-y around editor, margins aligned with tab bar
   - Mobile (375px): same checks

## Acceptance Criteria
- `pnpm astro check` passes without new errors
- `pnpm eslint .` results: no errors introduced by this diff (pre-existing are OK, must be documented)
- List markers visible in edit mode (numbered list shows numbers, bullet list shows bullets)
- Read mode: HTML list instructions don't duplicate steps
- No horizontal borders around the editor
- Editor aligned horizontally with tab bar

## Reporting
Write report to: docs/tasks/task-20260704-preparacion-bugs-builder-report.md
Return only: done docs/tasks/task-20260704-preparacion-bugs-builder-report.md
