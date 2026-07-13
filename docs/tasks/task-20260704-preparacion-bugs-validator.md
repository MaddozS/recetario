# Task: Validate preparación section bug fixes

## Assigned Agent
kitchcalc-validator

## Context Received
- Plan: docs/plans/plan-20260704-preparacion-bugs.md
- Builder report: docs/tasks/task-20260704-preparacion-bugs-builder-report.md
- State: docs/tasks/task-20260704-preparacion-bugs-state.json

## Files Changed (from builder report)
- apps/web/src/styles/global.css — split ul/ol rule, added list-style-type
- apps/web/src/lib/instructions-parser.ts — removed ol|ul|li from regex
- apps/web/src/components/InstructionsEditor.astro — removed border-y, adjusted margins

## Dependency And Parallel Safety
- Depends on: builder task (completed)
- Parallel group: none
- Parallel-safe: yes (single validator)
- Sibling tasks: none

## Skills
Selected:
- design-system-verify — verify no hardcoded colors, icons in whitelist
- ponytail — minimal validation

Discarded:
- prisma-client-api — no DB changes
- security-best-practices — no auth/security impact
- stripe-best-practices — no billing impact

May load if needed:
- none

## Validation Commands
1. `pnpm astro check` — verify 0 errors, compare against builder baseline (0 errors, 0 warnings, 11 hints)
2. `pnpm eslint .` — if `pnpm eslint` is unavailable, try `cd apps/web && pnpm exec eslint .` or `npx eslint .`. Document the result. If completely unavailable, note as pre-existing infrastructure issue.
3. `pnpm build` — attempt production build. If blocked by known pre-existing issues (dotenv in packages/billing), document and fall back to `pnpm dev` for visual QA.
4. Visual QA (see below)

## Visual QA
Run `pnpm dev` and verify at both breakpoints. The preparación tab is inside a recipe edit page (e.g., `/recipes/1?edit=1`).

### Desktop (1280px)
- [ ] Editor toolbar and text area have NO horizontal border lines above/below
- [ ] Editor left/right margins match the tab bar and other panels
- [ ] Create a numbered list in the editor → numbers (1., 2., 3.) are visible
- [ ] Create a bullet list in the editor → bullets (•) are visible
- [ ] Bold, italic, heading formatting works normally

### Mobile (375px)
- [ ] Same no-border verification
- [ ] Editor margins are not excessively wide (mx-1 = 4px per side)
- [ ] List markers visible at mobile width
- [ ] Toolbar is usable (scrollable horizontally)

### Read mode (non-edit)
- [ ] Recipe with HTML list instructions renders steps correctly (no duplicate numbering)

## Acceptance Criteria
- `pnpm astro check` passes (0 errors, warnings ≤ baseline)
- ESLint: result documented; any NEW errors classified as introduced
- Visual QA checklist completed
- Report documents any failures with reproduction steps

## Reporting
Write report to: docs/tasks/task-20260704-preparacion-bugs-validator-report.md
Return only: done docs/tasks/task-20260704-preparacion-bugs-validator-report.md
