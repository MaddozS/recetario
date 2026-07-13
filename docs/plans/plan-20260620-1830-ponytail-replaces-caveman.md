# Plan: Replace caveman with ponytail across agent system

Created: 2026-06-20 18:30
Orchestrator: orchestrator
Analysis: [analysis-20260620-1830-ponytail-replaces-caveman.md](../analysis/analysis-20260620-1830-ponytail-replaces-caveman.md)
Spec: (n/a — ajuste)

## Goal

Migrate the agent system from `caveman` (text compression) to `ponytail` (text compression + code lens + audit commands). Remove the caveman skill and its lock entry. Wire `/ponytail-review|/audit|/debt` into the agents whose job matches.

## Acceptance Criteria

- [ ] Zero `caveman` references in `.opencode/agents/*.md` (6 files)
- [ ] Zero `caveman` references in `.agents/skills/` (directory removed)
- [ ] `skills-lock.json` has no `caveman` entry
- [ ] Each agent's Communication section references ponytail (full mode + code ladder for builder/explorer; output-only for validator)
- [ ] `kitchcalc-reviewer` includes a "Ponytail Review Pass" section + 🟣 Ponytail line in Output format
- [ ] `kitchcalc-closer-analyze` Suggestions section recommends `/ponytail-audit` and `/ponytail-debt` when applicable
- [ ] `kitchcalc-builder` documents the `ponytail:` comment convention
- [ ] Historical `docs/plans/*` and `docs/tasks/*-report.md` are NOT touched

## Analysis Summary

See [analysis-20260620-1830-ponytail-replaces-caveman.md](../analysis/analysis-20260620-1830-ponytail-replaces-caveman.md). Key findings: 6 agent specs + 2 skill files + 1 lock entry need updates. Three of six `/ponytail*` commands map cleanly to specific agents (reviewer/closer-analyze). The other three are either universal (auto-injected) or user-facing only.

## User Stories

- As the orchestrator, I want all my subagents to follow the ponytail code lens (YAGNI/stdlib/native/one-line) so the codebase stays lean.
- As the reviewer, I want a "Ponytail Review Pass" so over-engineering is caught on the first review, not in the closer-analyze post-mortem.
- As the closer-analyze, I want to recommend `/ponytail-audit` and `/ponytail-debt` so recurring over-engineering patterns surface in the Approved Improvements cycle.
- As the builder, I want a clear `ponytail:` comment convention so intentional simplifications are tracked and can be revisited later.

## Design Rationale

- **Replace, don't add**: Each agent's "Communication" section is a 1:1 swap from caveman to ponytail. No new sections at the top level of any spec.
- **Code lens is opt-in per role**: Builder and explorer get the full ladder. Reviewer and validator get the output style (they don't write code; they read/run). Closer-analyze gets output style + audit/debt wiring.
- **Comment convention from the source**: `// ponytail: <reason>` is what the ponytail plugin's `/ponytail-debt` command greps for. The convention is already standardized; agents just need to follow it.
- **Skip universal commands**: `/ponytail`, `/ponytail-help`, `/ponytail-gain` are user-facing or auto-injected. No per-agent wiring needed (ponytail lens: don't add what doesn't add work).

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reviewer output format change breaks downstream | Medium | New 🟣 Ponytail line is additive; existing 🔴🟡🔵 lines unchanged. |
| Ponytail plugin not active in subagent runtime | Low | Plugin auto-injects via system transform; not dependent on subagent skill loads. |
| `ponytail:` comments accumulate unharvested | Low | `/ponytail-debt` is wired into closer-analyze. |
| Builder applies ponytail too aggressively (YAGNI → no tests) | Low | Builder still follows AGENTS.md and the task file's acceptance criteria; ponytail supplements, not overrides. |

## Task Dependencies

| Task | Depends On | Parallel-Safe |
|------|------------|---------------|
| T1: builder — edit 6 agent specs + delete caveman skill + edit skills-lock | — | yes |
| T2: reviewer — verify edits match analysis + spec | T1 | no |
| T3: closer-analyze (Mode ANALYZE) — post-mortem on the migration | T2 | no |

## Tasks

### Task 1: Apply ponytail migration (builder)
- **Agent**: kitchcalc-builder
- **Skills**: none (literal find/replace + small additive copy; no domain skills needed)
- **Summary**: Edit the 6 agent specs to replace every `caveman` reference with the appropriate ponytail reference. Delete the `.agents/skills/caveman/` directory. Remove the `caveman` entry from `skills-lock.json`.
- **Scope**: extends-existing (live agent system) + delete (caveman skill)
- **Pre-existing**: 6 agent specs already exist with the caveman Communication section; caveman skill already exists at `.agents/skills/caveman/`.
- **Dependencies**: none
- **Files to edit** (all pre-listed in the task file the orchestrator creates):
  - `.opencode/agents/kitchcalc-orchestrator.md`
  - `.opencode/agents/kitchcalc-builder.md`
  - `.opencode/agents/kitchcalc-reviewer.md`
  - `.opencode/agents/kitchcalc-validator.md`
  - `.opencode/agents/kitchcalc-closer-analyze.md`
  - `.opencode/agents/kitchcalc-explore.md`
  - `.agents/skills/caveman/SKILL.md` (delete)
  - `.agents/skills/caveman/README.md` (delete)
  - `skills-lock.json`
  - `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md` (report)

### Task 2: Verify migration (reviewer)
- **Agent**: kitchcalc-reviewer
- **Skills**: none
- **Summary**: Read the builder report. Read all 6 agent specs. Verify: zero `caveman` remaining; each Communication section reads ponytail; reviewer has Ponytail Review Pass section; closer-analyze has audit/debt in Suggestions; builder has `ponytail:` comment convention; skills-lock.json has no `caveman` entry.
- **Scope**: extends-existing (verification)
- **Pre-existing**: builder's report from T1
- **Dependencies**: T1
- **Files to edit**: only `docs/tasks/task-20260620-1830-reviewer-ponytail-migration-report.md` (report)

### Task 3: Post-mortem (closer-analyze Mode ANALYZE)
- **Agent**: kitchcalc-closer-analyze
- **Skills**: none
- **Summary**: Read the plan, analysis, T1 + T2 reports, and the modified agent specs. Suggest improvements to the agent specs (e.g. is the Skills Reference table update clean? are the new sections consistent with project style?). Read-only.
- **Scope**: extends-existing (post-mortem)
- **Pre-existing**: T1 + T2 reports
- **Dependencies**: T2
- **Files to edit**: only `docs/tasks/task-20260620-1830-closer-analyze-ponytail-migration-report.md` (report)

## Retrospective

(To be filled after Phase 7)
