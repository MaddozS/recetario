# Homologation Report: KitchCalc Agent Standardization

Date: 2026-06-12
Agent: general-purpose
Task: Homologación de Agentes Recetario (kitchcalc-*)

## Summary

Standardized 7 agent files in `.opencode/agents/` to align writing restrictions, skill usage, and canonical structure.

## Changes Applied

### Step 1: Migrated 4 read-only agents to edit:allow + File Write Scope

**Agents modified:**
- `kitchcalc-explore.md`
- `kitchcalc-reviewer.md`
- `kitchcalc-validator.md`
- `kitchcalc-closer-analyze.md`

**Changes:**
1. Changed frontmatter `permission.edit: deny` → `permission.edit: allow`
2. Added `## File Write Scope (ENFORCED)` section immediately after frontmatter, restricting each agent to only write its own report file:
   - explore → `docs/tasks/task-YYYYMMDD-HHmm-explore-report.md`
   - reviewer → `docs/tasks/task-YYYYMMDD-HHmm-reviewer-report.md`
   - validator → `docs/tasks/task-YYYYMMDD-HHmm-validator-report.md`
   - closer-analyze → `docs/tasks/task-YYYYMMDD-HHmm-closer-analyze-report.md`

**Rationale:** With `edit: deny`, agents cannot write their report files at all. Switching to `edit: allow` + explicit File Write Scope gives agents the ability to write while enforcing strict boundaries.

### Step 2: Added "Load These Skills First" to 2 agents

**Agents modified:**
- `kitchcalc-builder.md` — added before `## File-Based Communication Protocol`
- `kitchcalc-closer-apply.md` — added before `## File-Based Communication Protocol`

**Content added:**
```markdown
## Load These Skills First
Before doing any work, load:
- `graphify` — for codebase understanding before reading/editing files
- `caveman` — lite mode for all output
```

### Step 3: Standardized "Communication" section in all 7 agents

**Agents modified:**
- `kitchcalc-explore.md` — added `## Communication` section
- `kitchcalc-reviewer.md` — added `## Communication` section
- `kitchcalc-closer-analyze.md` — added `## Communication` section
- `kitchcalc-builder.md` — added `## Communication` section
- `kitchcalc-closer-apply.md` — added `## Communication` section
- `kitchcalc-orchestrator.md` — renamed `## Communication Style` → `## Communication`

**Already compliant:**
- `kitchcalc-validator.md` — already had `## Communication` section ✓

**Standard content:**
```markdown
## Communication
Use the `caveman` skill in **lite mode** for all output. Drop filler and hedging words. Keep articles and full sentences. Professional but tight.

**Clarity exceptions:** Auto-drop caveman for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume caveman lite after the clear part is done.
```

### Step 4: Verified no "File Writing Protocol" section exists

**Result:** No `## File Writing Protocol` sections found in any of the 7 agents. ✓

### Step 5: Standardized "Hard Constraints" section in all 7 agents

**Agents modified:**
- `kitchcalc-explore.md` — renamed `## IMMUTABLE Rule (MANDATORY)` → `## Hard Constraints`
- `kitchcalc-reviewer.md` — renamed `## IMMUTABLE Rule (MANDATORY)` → `## Hard Constraints`
- `kitchcalc-validator.md` — renamed `## IMMUTABLE Rule (MANDATORY)` → `## Hard Constraints`
- `kitchcalc-builder.md` — renamed `## IMMUTABLE Rule (MANDATORY)` → `## Hard Constraints`

**Already compliant:**
- `kitchcalc-closer-analyze.md` — already had `## Hard Constraints` ✓
- `kitchcalc-closer-apply.md` — already had `## Hard Constraints` ✓
- `kitchcalc-orchestrator.md` — already had `## Hard Constraints` ✓

## Verification Checklist

- [x] 4 read-only agents (explore, reviewer, validator, closer-analyze) have `edit: allow` in frontmatter
- [x] 4 read-only agents have `## File Write Scope (ENFORCED)` section immediately after frontmatter
- [x] kitchcalc-builder has `## Load These Skills First` section
- [x] kitchcalc-closer-apply has `## Load These Skills First` section
- [x] All 7 agents have `## Communication` section (not "Communication Style")
- [x] No agent has `## File Writing Protocol` section
- [x] All 7 agents have `## Hard Constraints` section

## Files Modified

1. `.opencode/agents/kitchcalc-explore.md`
2. `.opencode/agents/kitchcalc-reviewer.md`
3. `.opencode/agents/kitchcalc-validator.md`
4. `.opencode/agents/kitchcalc-closer-analyze.md`
5. `.opencode/agents/kitchcalc-builder.md`
6. `.opencode/agents/kitchcalc-closer-apply.md`
7. `.opencode/agents/kitchcalc-orchestrator.md`

## Skills Used

none

## Conclusion

PASS — All 7 agents now follow a consistent structure with standardized sections for permissions, file write scope, skill loading, communication style, and hard constraints.
