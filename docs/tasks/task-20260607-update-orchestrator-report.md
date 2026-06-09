# Implementer Report: Update orchestrator agent spec with rework phase and documentation rules
Date: 2026-06-07
Task File: N/A (direct request)
Agent: implementer

## Steps Executed
- **Read file**: `.opencode/agents/orchestrator.md` (481 lines)
- **Change 1**: Added constraint #8 — Document EVERY change
- **Change 2**: Added Phase 6b — Rework (conditional) between Phase 6 and Phase 7
- **Change 3**: Added verification checklist before spawning analyst in Phase 7
- **Change 4**: Added "Rework iterations" line to Phase 8 output template
- **Fix**: Normalized indentation on Phase 6 decision bullet

## Files Modified
- `.opencode/agents/orchestrator.md`: 4 targeted edits + 1 whitespace fix

## Changes Applied

### 1. Hard Constraint #8 (line 33)
```
8. **Document EVERY change** — every code modification, no matter how small, MUST have: analysis file, task file, implementer report, reviewer report. No exceptions.
```

### 2. Phase 6b — Rework (lines 387-418)
New section between Phase 6 and Phase 7 with:
- Mini analysis file creation format
- Mini task file creation format
- Implementer → reviewer dispatch loop
- Return to Phase 7 after all rework
- Synthesizer as final step
- Mandatory file creation rules (4 files even for single-line changes)
- NEVER rules (don't reference nonexistent files, don't skip reviewer)

### 3. Phase 7 checklist (lines 424-427)
Pre-analyst checklist: verify all rework PASSes, no open iterations, document in Retrospective.

### 4. Phase 8 output (line 447)
Added: `- **Rework iterations**: [count] — [brief summary if any]`

### 5. Indentation fix (line 383)
Fixed inconsistent spacing on `- Criteria not met` bullet in Phase 6.

## Verification
- File is syntactically valid Markdown
- All existing content preserved
- No other files modified
