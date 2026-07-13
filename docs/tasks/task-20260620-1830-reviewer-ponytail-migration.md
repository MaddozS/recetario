# Task: Verify ponytail migration

Agent: kitchcalc-reviewer
Date: 2026-06-20
Analysis: [analysis-20260620-1830-ponytail-replaces-caveman.md](../../analysis/analysis-20260620-1830-ponytail-replaces-caveman.md)
Plan: [plan-20260620-1830-ponytail-replaces-caveman.md](../../plans/plan-20260620-1830-ponytail-replaces-caveman.md)

## Goal

Read the builder's report + every modified file, and verify the migration matches the plan's acceptance criteria.

## Context

The builder just migrated the agent system from `caveman` to `ponytail`:
- 6 agent specs at `.opencode/agents/*.md` — text changes only
- `.agents/skills/caveman/` directory deleted
- `caveman` entry removed from `skills-lock.json`

Plus additive changes for the 3 agents whose job matches a ponytail lens:
- `kitchcalc-reviewer` — new "Ponytail Review Pass" section + 🟣 Ponytail line in Output format
- `kitchcalc-closer-analyze` — `/ponytail-audit` and `/ponytail-debt` guidance in Suggestions
- `kitchcalc-builder` — `ponytail:` comment convention documented

## Task Scope

- **Type**: extends-existing (verification only)
- **Pre-existing components**:
  - 6 agent specs (already modified by builder)
  - `skills-lock.json` (already modified by builder)
  - `.agents/skills/caveman/` (already deleted by builder)
  - Builder report at `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md`
- **New deliverables**: a reviewer report at `docs/tasks/task-20260620-1830-reviewer-ponytail-migration-report.md` with PASS/FAIL verdict per acceptance criterion
- **Dependencies**: T1 (builder) must be complete

## Skills Required

- none (semantic-only review; no domain skills)

## Files Involved

Read only:
- `.opencode/agents/kitchcalc-orchestrator.md`
- `.opencode/agents/kitchcalc-builder.md`
- `.opencode/agents/kitchcalc-reviewer.md`
- `.opencode/agents/kitchcalc-validator.md`
- `.opencode/agents/kitchcalc-closer-analyze.md`
- `.opencode/agents/kitchcalc-explore.md`
- `skills-lock.json`
- `.agents/skills/caveman/` (should not exist; verify with `ls`)
- `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md`

## Files the Subagent May Create or Edit

**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `docs/tasks/task-20260620-1830-reviewer-ponytail-migration-report.md` — report (mandatory, always present)

## Technical Steps

### Step 1: Load the report

Read `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md` first. Note each line range the builder claims to have changed.

### Step 2: Verify zero caveman in live system

Run `grep -rn caveman .opencode/agents/ .agents/skills/ skills-lock.json` and confirm zero matches. If any match, FAIL.

Run `ls -la .agents/skills/caveman 2>/dev/null` and confirm "No such file or directory". If the directory exists, FAIL.

### Step 3: Verify each agent spec

For each of the 6 agent specs, read it (focus on the changed sections). Verify:

**All 6 specs**:
- [ ] No `caveman` mention anywhere
- [ ] The `## Communication` section references `ponytail` (full mode)
- [ ] The "Skill & Instruction Priority" header (line 25/22/33/35/33/35) lists `ponytail`, not `caveman`

**kitchcalc-orchestrator** (extends):
- [ ] Skills list at line ~221 mentions `ponytail`
- [ ] Skills Reference table (line ~805) has the `ponytail` row + the 3 ponytail-lens rows (reviewer/audit/debt)
- [ ] Communication section includes the "Code ladder" bullet (orchestrator plans implementation work)

**kitchcalc-builder** (extends):
- [ ] Start Here mentions `ponytail` full mode
- [ ] Other constraints item 2 says `ponytail full` (not `caveman lite`) and includes the `// ponytail:` / `<!-- ponytail: -->` convention
- [ ] Communication section includes the "Mark intentional simplifications" bullet

**kitchcalc-reviewer** (extends):
- [ ] The duplicated "Caveman Lite Mode" + "Communication" sections are collapsed into a single `## Communication` section
- [ ] New "Ponytail Review Pass" subsection exists with the 5 tags (delete/stdlib/native/yagni/shrink)
- [ ] Output format template now includes a `### 🟣 Ponytail (over-engineering)` block
- [ ] Communication section notes the reviewer does not write code (so the code ladder does not apply)

**kitchcalc-validator** (output only):
- [ ] Communication section references `ponytail` and notes validator does not write code

**kitchcalc-closer-analyze** (extends):
- [ ] Suggestions section (or a new subsection) includes the "Ponytail lenses to recommend" block with the 3 trigger conditions (ponytail: comments, new abstractions, speculative features)

**kitchcalc-explore** (extends):
- [ ] Required Workflow skills list mentions `ponytail`
- [ ] Communication section includes the "Code ladder" bullet with the "Challenge the spec before recommending a new file or pattern" line

### Step 4: Verify skills-lock.json

- [ ] `caveman` key is not present in the JSON
- [ ] JSON is valid (parse with `node -e "JSON.parse(require('fs').readFileSync('skills-lock.json','utf8'))"` or similar)
- [ ] All other skills entries (`business-analyst`, `diagnose`, `impeccable`, `prisma-client-api`, `prisma-database-setup`, `security-best-practices`, `stripe-best-practices`, `stripe-projects`, `supabase`, `supabase-postgres-best-practices`, `tailwind-design-system`, `ui-ux-pro-max`, `upgrade-stripe`) remain unchanged

### Step 5: Verify historical docs untouched

Run `grep -rln caveman docs/plans/ docs/tasks/ docs/specs/ docs/analysis/ 2>/dev/null` and confirm historical references still exist (these are immutable per the plan's Out of Scope). If the builder accidentally touched them, FAIL with the specific file path.

### Step 6: Write the report

Render the verdict per the reviewer's standard Output format (adapted for this verification):

```
## Review Summary
<verdict: approved | changes requested | blocked>

## Per-File Findings

### 🟢 Passed
- <file>:<line> — <what was verified>

### 🔴 Critical (blocking)
- <file>:<line> — <issue> (why it's critical)

### 🟡 Warning (should fix)
- <file>:<line> — <issue> (suggested fix)

### 🔵 Info (nice to have)
- <file>:<line> — <observation>

### 🟣 Ponytail (over-engineering)
- L<line>: <tag> <what to cut>. <replacement>.
```

For each acceptance criterion, write either `🟢 Passed: <criterion>` or `🔴 Critical: <criterion> failed because <reason>`.

## Expected Output

- **Code changes**: none
- **Report**: `docs/tasks/task-20260620-1830-reviewer-ponytail-migration-report.md` with PASS or FAIL verdict, per-criterion status, and any deviations found.

## Guardrails

- Read-only. Do not modify any source file, agent spec, or skill definition.
- Do not re-run any build/lint/test commands. This is a semantic review.
- Do not touch historical docs (they should still contain `caveman` references; that's correct).
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list.
