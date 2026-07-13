# Task: Review preparación section bug fixes

## Assigned Agent
kitchcalc-reviewer

## Context Received
- Spec: docs/analysis/analysis-20260704-preparacion-bugs.md
- Plan: docs/plans/plan-20260704-preparacion-bugs.md
- Builder report: docs/tasks/task-20260704-preparacion-bugs-builder-report.md
- Validator report: docs/tasks/task-20260704-preparacion-bugs-validator-report.md
- State: docs/tasks/task-20260704-preparacion-bugs-state.json

## Files Changed
- apps/web/src/styles/global.css
- apps/web/src/lib/instructions-parser.ts
- apps/web/src/components/InstructionsEditor.astro

## Skills
Selected:
- ponytail-review — look for over-engineering (minimal fixes expected)
- design-system-verify — verify no hardcoded colors, semantic tokens used

Discarded:
- prisma-client-api — no DB changes
- security-best-practices — no auth/security impact
- stripe-best-practices — no billing impact
- ui-ux-pro-max — simple CSS fixes
- impeccable — not a design task

May load if needed:
- none

## Review Focus
1. **Correctness**: Does each change fix the intended bug?
   - global.css: `list-style-type: disc` on ul, `list-style-type: decimal` on ol — fixes Tailwind preflight reset
   - instructions-parser.ts: removed `ol|ul|li` from regex — fixes duplicate step rendering
   - InstructionsEditor.astro: removed `border-y`, adjusted margins — fixes dividers and alignment

2. **Regressions**: Could any change introduce new issues?
   - Regex change: verify fallback on line 230 still captures solo lists
   - Margin change: any parent containers that expect `mx-5`?
   - CSS split: any cascading issues from separating ul/ol selectors?

3. **Project invariants**:
   - No hardcoded colors (validator confirmed PASS)
   - No new icons (validator confirmed N/A)
   - No Spanish copy changes (editor label unchanged)
   - No Prisma queries touched

4. **Mobile/desktop parity**: Both breakpoints should show list markers and have consistent margins

## Reporting
Write report to: docs/tasks/task-20260704-preparacion-bugs-reviewer-report.md
Return only: done docs/tasks/task-20260704-preparacion-bugs-reviewer-report.md
