# Implementer Report: Update Implementer Agent Spec with Documentation Integrity Rules
Date: 2026-06-07
Task File: (ad-hoc request — no formal task file created)
Agent: implementer

## Steps Executed
- Read `.opencode/agents/implementer.md` to understand current state
- Added **IMPORTANT** note after Report Format code block about `Task File:` field requiring an actual file reference
- Added constraints 9 and 10 to Hard Constraints section:
  - Constraint 9: Never reference non-existent task files
  - Constraint 10: Always verify task file exists before referencing in reports

## Files Modified
- `.opencode/agents/implementer.md`: Added documentation integrity rules

## Commands Executed
- No terminal commands required (file-only changes)

## Issues Encountered
- None

## Verification
- `pnpm astro check`: Skipped — no code changes, agent spec only
- `pnpm eslint .`: Skipped — no code changes, agent spec only
- Manual review confirms both changes match the requested spec exactly
