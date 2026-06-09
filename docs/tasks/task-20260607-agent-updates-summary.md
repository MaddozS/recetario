# Agent Updates Summary: Documentation Integrity Rules

Date: 2026-06-07
Context: Post-session analysis revealed 4 fix iterations without proper documentation

## Problem
During the recipe header layout redesign session:
- Initial implementation followed full pipeline (analysis → plan → task → implement → review → analyst → synthesizer)
- 4 subsequent fix iterations skipped documentation:
  - Fix 1: Dropdown JS scope bug (had minimal "quick review")
  - Fix 2: Reposition menu button (no review)
  - Fix 3: Mobile row layout (no review, phantom task file reference)
  - Fix 4: Align edit buttons (no review, phantom task file reference)
- Analyst and synthesizer ran BEFORE fixes, producing factually incorrect "zero-fix" reports

## Root Causes
1. "Too small" heuristic — orchestrator treated single-line changes as not needing documentation
2. No rework phase in orchestrator workflow
3. Process drift under time pressure (21 minutes for 4 fixes)

## Agent Updates

### 1. orchestrator.md
**New constraint #8:**
> Document EVERY change — every code modification, no matter how small, MUST have: analysis file, task file, implementer report, reviewer report. No exceptions.

**New Phase 6b — Rework:**
- Mini analysis (15-20 lines)
- Mini task file (10-15 lines)
- Implementer → reviewer loop
- Mandatory 4-file rule for even single-line changes
- NEVER rules: no phantom task files, no skipping reviewer, no incomplete sessions

**Phase 7 guard:**
- Verify all rework has PASS verdicts before spawning analyst
- Verify no open fix iterations remain

**Phase 8 output:**
- Added "Rework iterations" line to output template

### 2. implementer.md
**New constraints #9-10:**
- Never reference task files that don't exist
- Always verify task file exists before referencing
- If no task file provided, write "Task File: (ad-hoc request — no formal task file created)"

**Report format note:**
- Task File field must reference ACTUAL file or use ad-hoc notation

### 3. reviewer.md
**New constraint:**
- Review EVERY code change — no change is "too small" to review

**Approach addition:**
- No "quick reviews" or abbreviated checks
- Every review must include: expected vs actual, `pnpm astro check`, regressions check, Visual QA for UI changes

### 4. analyst.md
**New workflow step #11:**
- Verify rework documentation
- Check each fix has: analysis, task, implementer report, reviewer report
- Flag fixes lacking documentation
- Note if analyst/synthesizer ran BEFORE rework (timing issue)

**New analysis dimension:**
- Rework documentation audit in Process Efficiency section

**New report section:**
- Rework Documentation Audit checklist

### 5. synthesizer.md
**New rules:**
- Verify rework documentation chains
- Check timing — analyst/synthesizer must run AFTER all rework

**New output section:**
- Rework Audit: fix iterations count, documentation completeness, timing verification, process failures

## Impact
These changes ensure:
1. **Traceability**: Every code change has a paper trail
2. **Quality**: No change ships without reviewer verification
3. **Accuracy**: Analyst/synthesizer reports reflect actual session state
4. **Integrity**: No phantom documentation references

## Files Modified
- `.opencode/agents/orchestrator.md` (+47 lines)
- `.opencode/agents/implementer.md` (+6 lines)
- `.opencode/agents/reviewer.md` (+7 lines)
- `.opencode/agents/analyst.md` (+11 lines)
- `.opencode/agents/synthesizer.md` (+9 lines)

## Verification
All agent files updated successfully. Next session will enforce these rules.
