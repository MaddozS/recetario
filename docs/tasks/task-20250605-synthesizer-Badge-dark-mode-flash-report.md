# Synthesis: Fix Badge Dark Mode Flash
**Date**: 2025-06-05
**File**: docs/tasks/task-20250605-synthesizer-Badge-dark-mode-flash-report.md

## Accomplished
- **Implementer** modified `src/lib/accent-colors.ts:168` — `getAccentCssVars()` now emits `--color-accent-*` alongside `--aw-accent-*`. Verified with `pnpm build` (4.22s), `pnpm astro check` (0 errors), and `pnpm eslint` (0 new errors).
- **Reviewer** validated the change against all 5 acceptance criteria: code correct, old vars preserved, build passes, type checks pass, all 3 callers backward-compatible. **APPROVED**.
- **Analyst** produced a deep post-implementation analysis identifying the same `--tw-*` indirection vulnerability across 28 other CSS variables (surface, text, border, feedback tokens) affecting 393+ utility usages. Suggested 3 improvements: fix surface/text tokens, add "Broader Pattern Check" to analysis template, enhance `diagnose` skill for CSS variable chain audits.

## Gaps

### Documentation Gaps
1. `docs/analysis/analysis-20250605-Badge-dark-mode-flash.md` — No "Broader Pattern Check" section. The analysis identified the correct root cause but didn't expand to the same indirection pattern in `--tw-*` variables (28 other tokens). Analyst report found this same gap in 2 prior analyses (`analysis-20260604-table-not-updating.md`, `analysis-20260604-ingredient-id-sequence.md`).
2. `docs/analysis/analysis-20260604-table-not-updating.md` — Identified that ALL cache invalidation functions were fire-and-forget, not just the single reported case. This systemic finding was not elevated to the orchestrator as a recurring pattern — no cross-reference between this and the Badge analysis.
3. `docs/analysis/analysis-20260604-ingredient-id-sequence.md` — Found sequence bug affected Recipe and RecipePresentation, not just Ingredient. Same missed "broader pattern" gap.

### Traceability Gaps
4. `docs/plans/plan-20250605-Badge-dark-mode-flash.md` — Plan has a `Retrospective` section marked "[To be filled by orchestrator after Phase 7]" that remains empty. The orchestrator's Phase 8 output to the user should populate this or remove it.
5. No documentation anywhere captures the CSS variable chaining vulnerability pattern (`Tailwind utility → var(--color-*) → var(--tw-*, fallback)`) as a known architecture concern. AGENTS.md has no section for "CSS Variable Chain Vulnerability."

### Process Gaps
6. The analyst report (this session's Phase 7) suggests adding "Broader Pattern Check" to the analysis report template (`docs/analysis/analysis-*.md`). This was written as a suggestion to the orchestrator but has no follow-up mechanism.

## Improvements

### Agent files
1. `.opencode/agents/orchestrator.md` (line ~108, Phase 1 analysis template):
   - **Add** a `## Broader Pattern Check` section in the analysis report template:
     ```
     ## Broader Pattern Check
     - [ ] Does the root cause affect other variables/entities using the same pattern?
     - [ ] Are there adjacent tokens, models, or functions with the same vulnerability?
     - [ ] References to other analysis reports with similar patterns
     ```

2. `.opencode/agents/analyst.md`:
   - **Add** to "Process Efficiency" analysis dimension a check: "Did the analysis report include a Broader Pattern Check section?"
   - **Add** to the "Code Quality" analysis a CSS variable chaining check: "If CSS variable indirection (`--color-*` → `--tw-*`) is involved, were all variables with this pattern checked?"
   - **Add** in "Required Workflow" (step 9): "When CSS variables are involved, grep for all `var(--color-*)` references and check which depend on `--tw-*` that isn't inline-set."

3. `.opencode/agents/reviewer.md`:
   - **Strengthen** the `Residual Risks` section to explicitly prompt for systemic patterns:
     ```
     ## Residual Risks
     - Immediate code risk: [none]
     - Systemic risk: [Does this change affect 3+ other tokens/functions with the same pattern?]
     - Recommendations for orchestrator: [What broader work should be tracked?]
     ```

4. `.opencode/agents/explorer.md`:
   - **Add** to "Deep Context Analysis" section: "When analyzing CSS variable/theme bugs, search for all variables using the same chaining indirection pattern, not just the one cited in the bug report."

### Skills
5. **New skill: `theme-audit`** (requested by analyst, `.agents/skills/theme-audit/SKILL.md`):
   - Given a CSS variables file with `@theme` blocks and `:root`/`.dark` overrides, identifies all variables that chain through intermediate vars not set inline and flags dark-mode flash risk.
   - Used by: explorer during analysis phase for any theme-related bug diagnosis.

6. **Enhance `diagnose` skill**: When root cause involves a missing link in a CSS variable chain, add step to search the codebase for all other variables using the same chaining pattern and assess whether they share the vulnerability.

### Project docs
7. `AGENTS.md`:
   - **Add** a new section under "Key gotchas" or as a new subsection:
     ```
     #### CSS variable chain vulnerability
     A known dark-mode flash pattern: Tailwind utility (e.g., `bg-card`) → `var(--color-card)` (defined in `@theme` block, external CSS only) → `var(--tw-card, #ffffff)` (only in `:root`/`.dark` in external CSS). During the CSS load gap, `--tw-card` is undefined → light-mode fallback flashes in dark mode.
     ```
   - **Update** the `Broader Pattern` guidance under Orchestrator.md: when an analysis report creates Phase 1 output, before advancing to Phase 3 (Planning), check whether similar patterns exist elsewhere.

## Orchestrator notes

Deferred suggestions from this session's analyst report (docs/tasks/task-20250605-analyst-Badge-dark-mode-flash-report.md):

1. **Fix surface/text token indirection**: 28 `--tw-*` variables still have the same CSS-load-gap vulnerability. Affects 393+ utility usages of `bg-card`, `bg-background`, `text-foreground`, etc. Two approaches: inline all `--color-*` vars (adds ~500 bytes HTML per page) or set `--tw-*` in the blocking `<script>` that already detects dark mode. Requires product decision on priority.
2. **Plan `Retrospective` empty**: `docs/plans/plan-20250605-Badge-dark-mode-flash.md:34` — the `[To be filled by orchestrator after Phase 7]` placeholder should be populated or the section removed.
3. **Cross-report pattern tracking**: Three consecutive analyses (table-not-updating, ingredient-id-sequence, Badge flash) each found systemic issues beyond the immediate bug. The orchestrator should consider adding a recurring "systemic pattern tracker" to future analysis reports.

## Recommended actions
1. **Accept analyst suggestions** — implement the "Broader Pattern Check" addition to orchestrator.md, enhance analyst.md, strengthen reviewer.md Residual Risks, and update explorer.md.
2. **Create theme-audit skill** — `.agents/skills/theme-audit/SKILL.md` for CSS variable chain vulnerability detection.
3. **Document CSS chain vulnerability** in AGENTS.md under a new "Key gotchas" subsection.
4. **Track the 28 `--tw-*` variable fix** as a future task (needs product priority decision).
5. **Populate plan Retrospective** section or remove the placeholder.
