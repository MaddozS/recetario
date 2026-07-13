# Task: Post-mortem on ponytail migration

Agent: kitchcalc-closer-analyze
Date: 2026-06-20
Analysis: [analysis-20260620-1830-ponytail-replaces-caveman.md](../../analysis/analysis-20260620-1830-ponytail-replaces-caveman.md)
Plan: [plan-20260620-1830-ponytail-replaces-caveman.md](../../plans/plan-20260620-1830-ponytail-replaces-caveman.md)

## Goal

Read-only post-mortem on the caveman → ponytail migration. Suggest improvements to the agent specs, the migration process, and the project's use of the ponytail plugin. Do NOT modify any source file.

## Context

The migration touched 6 agent specs, deleted the caveman skill, and removed the caveman entry from `skills-lock.json`. It also added new sections to the reviewer (Ponytail Review Pass), the closer-analyze itself (Ponytail lenses to recommend), and the builder (`ponytail:` comment convention).

This is a Mode ANALYZE post-mortem (read-only). The output is a report with 5 dimensions + Suggestions + Patterns Detected.

## Task Scope

- **Type**: extends-existing (post-mortem)
- **Pre-existing components**:
  - 6 modified agent specs
  - Builder report at `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md`
  - Reviewer report at `docs/tasks/task-20260620-1830-reviewer-ponytail-migration-report.md`
  - This analysis + plan
- **New deliverables**: a closer-analyze report at `docs/tasks/task-20260620-1830-closer-analyze-ponytail-migration-report.md`
- **Dependencies**: T2 (reviewer) must be complete

## Skills Required

- none

## Files Involved

Read only:
- `docs/analysis/analysis-20260620-1830-ponytail-replaces-caveman.md`
- `docs/plans/plan-20260620-1830-ponytail-replaces-caveman.md`
- `docs/tasks/task-20260620-1830-builder-ponytail-migration.md`
- `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md`
- `docs/tasks/task-20260620-1830-reviewer-ponytail-migration.md`
- `docs/tasks/task-20260620-1830-reviewer-ponytail-migration-report.md`
- All 6 modified agent specs
- `skills-lock.json`

Historical context (read AT MOST 2 most recent analysis reports if relevant):
- `docs/analysis/` — list newest 2, then read them if they overlap

## Files the Subagent May Create or Edit

**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file.

- [ ] `docs/tasks/task-20260620-1830-closer-analyze-ponytail-migration-report.md` — report (mandatory, always present)

## Technical Steps

### Step 1: Read all referenced files

1. Read the analysis report.
2. Read the plan.
3. Read the builder task file and report.
4. Read the reviewer task file and report.
5. Read all 6 modified agent specs (focus on the changed sections).
6. Read `skills-lock.json` to confirm the caveman entry is gone.
7. If the analysis/plan references past analyses for context, read up to 2 most recent — do not follow their cross-references.

### Step 2: Analyze in 5 dimensions

Per the closer-analyze role's "5 dimensions" pattern. Adapt to this migration:

1. **Spec compliance** — Did the builder match the analysis + plan? Are all acceptance criteria met? Any deviations in the builder report that weren't flagged by the reviewer?
2. **Pattern consistency** — Do the new ponytail sections follow the same style as the rest of the agent specs? Are the "Ponytail Review Pass" and "Ponytail lenses to recommend" sections consistent with how other "## …" sections in the specs are written?
3. **Process** — Was the workflow (analysis → plan → tasks → builder → reviewer → closer) followed? Any rework iterations? Were the guardrails respected?
4. **Risk** — Are there any follow-on risks now that the migration is in? E.g. is `/ponytail-debt` going to be invoked regularly? Is the reviewer going to use the new Ponytail Review Pass consistently? Are any agent specs missing a ponytail reference because they were overlooked?
5. **Suggestion quality** — Were the Suggestions in the reviewer report actionable, or vague? Did the reviewer cite specific lines?

### Step 3: Patterns Detected

Look for cross-cutting patterns. Examples (don't limit to these):
- Were there any "ponytail:" comments added in the agent specs? If so, are they justified?
- Is the per-agent variation (full ponytail for builder/explorer, output-only for reviewer/validator/closer-analyze) clean, or is the line between "writes code" and "reads code" blurry in any spec?
- Does the orchestrator's Skills Reference table correctly route the 3 ponytail-lens rows (review/audit/debt) to the right subagents?
- Is the caveman-skill deletion process (rm -rf directory + lock entry) repeatable, or did it leave any orphan reference?

### Step 4: Rework Documentation Audit

Per the closer-analyze role, audit the rework documentation. For this migration (no rework iterations expected), document:
- Was a rework iteration needed? (PASS = no, FAIL = yes)
- If yes, what triggered it and how was it resolved?

### Step 5: Suggestions

Suggest improvements to:
- **Agents** — e.g. is the "Ponytail Review Pass" section too generic? Should the orchestrator's Skills Reference table reference `/ponytail` (mode switch) explicitly so subagents know the plugin is active?
- **Skills** — should the project add a `ponytail` skill (not a command) that agents can `skill` load for additional context? Or is the auto-injection enough?
- **Process** — should the orchestrator have asked the user about historical docs upfront instead of proposing "live system only" in the analysis? Did the question add value?

Each suggestion must cite a specific observation (path:line if possible) and explain WHAT to change and WHY, not HOW.

## Expected Output

- **Code changes**: none (Mode ANALYZE is read-only)
- **Report**: `docs/tasks/task-20260620-1830-closer-analyze-ponytail-migration-report.md` with the 5 dimensions, Patterns Detected, Rework Documentation Audit, and Suggestions sections. End with `[Verdict: PASS | PARTIAL | FAIL]`.

## Guardrails

- Read-only. Do not modify any source file, agent spec, or skill definition.
- Do not propose implementations (WHAT and WHY only, not HOW).
- Do not follow cross-references in historical analyses beyond the 2 most recent.
- Do not touch historical docs.
- **IMMUTABLE**: Never modify source files, plans, task files, analysis reports, or agent specs.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list.
