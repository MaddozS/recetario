# Plan: Fix Badge Dark Mode Flash

Created: 2025-06-05
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20250605-Badge-dark-mode-flash.md
Complexity: ajuste

## Goal
Eliminate the white flash on Badge component during page reload in dark mode.

## Acceptance Criteria
- [ ] `getAccentCssVars()` emits `--color-accent-*` alongside `--aw-accent-*` in its output
- [ ] `pnpm build` succeeds without errors
- [ ] Inline style on `<html>` includes both `--aw-accent-*` and `--color-accent-*`

## Analysis Summary
Badge uses `bg-accent-100` which depends on `--color-accent-100`. This variable is only defined in the external CSS file. The inline style on `<html>` sets `--aw-accent-100` but not `--color-accent-100`. During CSS load gap, `bg-accent-100` has no background value → white flash in dark mode.

## Design Rationale
Adding `--color-accent-*` alongside `--aw-accent-*` in the inline style output makes the Tailwind utility dependent variable available immediately. The existing `--aw-accent-*` variables are still needed for explicit `var(--aw-accent-*)` references in global.css (e.g., `.dark .step-badge-time`). Both must coexist.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Inline style on `<html>` overrides CSS file's `:root` definition of `--color-accent-*` | None — this is desired; inline should take precedence | Inline values match what CSS file would compute anyway. Accent changes via settings.astro update the inline style, maintaining correctness |

## Tasks
### Task 1: Modify getAccentCssVars to emit --color-accent-* inline
- **Agent**: implementer
- **Skills**: none required
- **Summary**: Add `--color-accent-*` to the output string alongside existing `--aw-accent-*`

## Retrospective
[To be filled by orchestrator after Phase 7]
