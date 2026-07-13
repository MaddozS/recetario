# Task: Apply 3 approved improvements

Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: [analysis-20260620-1830-approved-improvements.md](../../analysis/analysis-20260620-1830-approved-improvements.md)
Plan: [plan-20260620-1830-approved-improvements.md](../../plans/plan-20260620-1830-approved-improvements.md)

## Goal

Apply 3 small edits to 2 agent specs. No new files, no deletions.

## Context

Just finished a ponytail migration. Closer-analyze produced 11 suggestions; user approved the top 3. Scope: 3 edits, 2 files. Do not touch anything else.

## Task Scope

- **Type**: extends-existing
- **Pre-existing components**:
  - `.opencode/agents/kitchcalc-orchestrator.md` (already modified in main cycle, line ~221 has a "ponytail" skills list entry, line ~796 has a "Skills Reference" table header)
  - `.opencode/agents/kitchcalc-reviewer.md` (already modified in main cycle, line ~333 has a "Ponytail Review Pass" section)
- **New deliverables**: 3 small text edits
- **Dependencies**: none

## Skills Required

- none

## Files Involved

- `.opencode/agents/kitchcalc-orchestrator.md` — modify (Edits 1 + 2)
- `.opencode/agents/kitchcalc-reviewer.md` — modify (Edit 3)
- `docs/tasks/task-20260620-1830-builder-approved-improvements-report.md` — create (report)

## Files the Subagent May Create or Edit

**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.

- [ ] `.opencode/agents/kitchcalc-orchestrator.md` — modify (Edit 1 + Edit 2)
- [ ] `.opencode/agents/kitchcalc-reviewer.md` — modify (Edit 3)
- [ ] `docs/tasks/task-20260620-1830-builder-approved-improvements-report.md` — create (report)

## Technical Steps

### Step 1: Read the target files

Read each file to get the exact line context for `oldString` matching. Do not assume the lines are at exactly the offsets in the plan; the main cycle's edits may have shifted them.

### Step 2: Edit 1 — orchestrator skills list annotation

Find the line under "Load relevant skills" (Phase 1, around line 221) that begins with `   - \`ponytail\``. The current line should be similar to:

old:
```
   - `ponytail` — for concise communication + code lens (auto-injected by the ponytail plugin)
```

new:
```
   - `ponytail` — concise communication + code lens (no skill load needed — auto-injected by the ponytail plugin at every turn)
```

### Step 3: Edit 2 — orchestrator table header rename

Find the `## Skills Reference` heading (around line 796) in the orchestrator spec.

old:
```
## Skills Reference
```

new:
```
## Skills & Lenses Reference
```

Do not change the table rows. Do not rename other section headers.

### Step 4: Edit 3 — reviewer action prompt

Find the `### Ponytail Review Pass (over-engineering, not correctness)` heading (around line 333) in the reviewer spec. The current section starts with:

old:
```
### Ponytail Review Pass (over-engineering, not correctness)

Apply the `/ponytail-review` lens to the modified code. One finding per line, tagged with one of:
```

new:
```
### Ponytail Review Pass (over-engineering, not correctness)

When reviewing any code change: run `/ponytail-review` first, then map results to the 5 tags below and add findings to the `🟣 Ponytail` block in the report. Apply the `/ponytail-review` lens to the modified code. One finding per line, tagged with one of:
```

The "When reviewing..." sentence becomes the new first paragraph. The original "Apply the /ponytail-review lens to the modified code..." sentence moves to second paragraph (and now reads as a follow-on, not the opener).

### Step 5: Verify

- `grep -rn caveman .opencode/agents/` → still 0 matches (no regression)
- `grep -c "no skill load needed" .opencode/agents/kitchcalc-orchestrator.md` → 1
- `grep -c "Skills & Lenses Reference" .opencode/agents/kitchcalc-orchestrator.md` → 1
- `grep -c "When reviewing any code change" .opencode/agents/kitchcalc-reviewer.md` → 1
- `grep -c "## Skills Reference" .opencode/agents/kitchcalc-orchestrator.md` → 0 (old name removed)

## Expected Output

- **Code changes**: 2 files modified
  - `.opencode/agents/kitchcalc-orchestrator.md` (2 edits)
  - `.opencode/agents/kitchcalc-reviewer.md` (1 edit)
- **Report**: `docs/tasks/task-20260620-1830-builder-approved-improvements-report.md` with: each edit (line + before/after), grep verification output.

## Guardrails

- Only edit the 2 files in scope. No other file changes.
- Do not modify plan/analysis/task files.
- If any `oldString` doesn't match exactly, STOP and report the mismatch. Do not invent edits.
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list.
