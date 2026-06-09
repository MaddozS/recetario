# Implementer Report: Update reviewer agent spec
Date: 2026-06-07
Task File: task-20260607-update-reviewer.md (inline instructions)
Agent: implementer

## Steps Executed
- Read `.opencode/agents/reviewer.md` — full file read, 176 lines
- Added constraint "Review EVERY code change" after line 30
- Added note "No quick reviews or abbreviated checks" after line 52

## Files Modified
- `.opencode/agents/reviewer.md`:
  - **Line 31**: New constraint: `- **Review EVERY code change** — no change is "too small" to review. Even single-line CSS class changes need verification. If the orchestrator asks you to review, do it. If you notice a code change without a review request, flag it.`
  - **Lines 54-57**: New note under Approach: `**No "quick reviews" or abbreviated checks.**` with 4 bullet points (expected vs actual, astro check, regressions, visual QA)

## Commands Executed
- None (file edits only)

## Issues Encountered
- None

## Verification
- File reads back correctly with both additions in place
