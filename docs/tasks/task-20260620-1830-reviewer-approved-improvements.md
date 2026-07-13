# Task: Verify 3 approved improvements

Agent: kitchcalc-reviewer
Date: 2026-06-20
Analysis: [analysis-20260620-1830-approved-improvements.md](../../analysis/analysis-20260620-1830-approved-improvements.md)
Plan: [plan-20260620-1830-approved-improvements.md](../../plans/plan-20260620-1830-approved-improvements.md)

## Goal

Read the builder's report + the 2 modified agent specs, and verify the 3 approved improvements match the acceptance criteria.

## Task Scope

- **Type**: extends-existing (verification only)
- **Pre-existing components**:
  - 2 modified agent specs (orchestrator, reviewer)
  - Builder report at `docs/tasks/task-20260620-1830-builder-approved-improvements-report.md`
- **New deliverables**: reviewer report at `docs/tasks/task-20260620-1830-reviewer-approved-improvements-report.md`
- **Dependencies**: T1 (builder) must be complete

## Skills Required

- none

## Files Involved

Read only:
- `.opencode/agents/kitchcalc-orchestrator.md`
- `.opencode/agents/kitchcalc-reviewer.md`
- `docs/tasks/task-20260620-1830-builder-approved-improvements-report.md`
- `docs/analysis/analysis-20260620-1830-approved-improvements.md`
- `docs/plans/plan-20260620-1830-approved-improvements.md`

## Files the Subagent May Create or Edit

**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `docs/tasks/task-20260620-1830-reviewer-approved-improvements-report.md` — report (mandatory, always present)

## Technical Steps

### Step 1: Read the builder report

Note the line ranges and before/after snippets the builder claims.

### Step 2: Verify the 3 acceptance criteria

Run these greps and confirm the expected counts:

- `grep -rn caveman .opencode/agents/` → 0 matches (no regression)
- `grep -c "no skill load needed" .opencode/agents/kitchcalc-orchestrator.md` → 1
- `grep -c "Skills & Lenses Reference" .opencode/agents/kitchcalc-orchestrator.md` → 1
- `grep -c "## Skills Reference$" .opencode/agents/kitchcalc-orchestrator.md` → 0 (old name removed)
- `grep -c "When reviewing any code change" .opencode/agents/kitchcalc-reviewer.md` → 1

Then read the 2 modified specs around the changed lines to confirm:
- orchestrator line ~221: ponytail annotation includes "no skill load needed"
- orchestrator line ~796: section header is now `## Skills & Lenses Reference`
- reviewer line ~333: the "Ponytail Review Pass" section now opens with the action-prompt paragraph

### Step 3: Verify no other lines changed

Use `git diff` (if available) to confirm only the 3 expected edits touched the 2 files. If other lines changed, FAIL.

### Step 4: Write the report

Render the verdict per the reviewer's standard Output format:

```
## Review Summary
<verdict: approved | changes requested | blocked>

## Acceptance Criteria

| # | Criterion | Result |
|---|-----------|--------|
| 1 | orchestrator line ~221 annotated | 🟢/🔴 |
| 2 | orchestrator line ~796 header renamed | 🟢/🔴 |
| 3 | reviewer line ~333 action prompt added | 🟢/🔴 |
| 4 | no other lines changed | 🟢/🔴 |
| 5 | no caveman regression | 🟢/🔴 |

## Findings
- 🟢 / 🟡 / 🔴 / 🔵 / 🟣
```

## Expected Output

- **Code changes**: none
- **Report**: `docs/tasks/task-20260620-1830-reviewer-approved-improvements-report.md` with verdict + per-criterion status.

## Guardrails

- Read-only. Do not modify any source file, agent spec, or skill definition.
- Do not run build/lint/test commands.
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list.
