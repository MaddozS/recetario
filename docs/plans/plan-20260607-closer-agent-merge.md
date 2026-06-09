# Plan: Merge analyst and synthesizer into closer agent

Created: 2026-06-07
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20260607-1630-closer-agent-merge.md
Spec: docs/specs/2026-06-07-closer-agent-merge-design.md

## Goal
Replace `.opencode/agents/analyst.md` and `.opencode/agents/synthesizer.md` with a single `.opencode/agents/closer.md` that runs in two modes (ANALYZE read-only, APPLY edit:allow). Update orchestrator Hard Constraint #7 and all related references accordingly.

## Acceptance Criteria
- [ ] `.opencode/agents/closer.md` exists with `## Mode A: ANALYZE` and `## Mode B: APPLY` clearly separated
- [ ] `.opencode/agents/analyst.md` removed
- [ ] `.opencode/agents/synthesizer.md` removed
- [ ] `.opencode/agents/orchestrator.md` updated:
  - Hard Constraint #7 (line 32) refers to "closer (Mode ANALYZE) as the final step" and "closer (Mode APPLY) after user approval"
  - Subagent types list (line 30) includes `closer` and removes `analyst` and `synthesizer`
  - Phase 5 subagent list (line 358-363) updated
  - Phase 6b/7 references (lines 404, 406) updated
  - Subagent Reference table (lines 475-476) updated to single closer row
  - IMMUTABILITY RULE (line 506) updated
  - Plan template (line 303) and task template (line 321) `Agent:` field examples include `closer`
- [ ] Historical reports (`*-analyst-report.md`, `*-synthesizer-report.md`) NOT modified
- [ ] `pnpm astro check` still passes
- [ ] `pnpm eslint .` still passes

## Analysis Summary
Both agents duplicate ~70% of work. Only synthesizer has `edit: allow`. Recent session process analyst report proved they can both miss the same critical event. Recent rework-audit logic was added to both specs on the same day with diverging wording — evidence of maintenance drift.

## User Stories
- As orchestrator, I want one closer agent to handle both analysis and application so I don't dispatch two redundant subagents.
- As the project, I want agent specs to be DRY so adding new checks (like the recent rework audit) happens once.

## Design Rationale
Single spec with two clearly demarcated modes preserves the unique value (deep analysis + apply-on-approval gate) while eliminating duplicate file reads and the maintenance drift between two specs. The dependency between modes is structural (APPLY reads ANALYZE output), making timing problems self-correcting.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| User forgets to restart opencode | New agent not loaded | Phase 8 output reminds user |
| One spec covers two roles | Confusing at first | Distinct `## Mode A` / `## Mode B` sections; orchestrator specifies mode in task file |
| Historical references to old agents | None | Leave reports untouched |

## Tasks
### Task 1: Write closer spec + delete old agents + update orchestrator
- **Agent**: implementer
- **Skills**: customize-opencode
- **Summary**: Create `.opencode/agents/closer.md` with two modes, delete `analyst.md` and `synthesizer.md`, update orchestrator.md.

### Task 2: Verify the migration
- **Agent**: reviewer
- **Skills**: customize-opencode
- **Summary**: Verify closer.md has both modes, both old files gone, orchestrator spec updated, no broken references.

### Task 3: Post-implementation analysis
- **Agent**: analyst (still alive for this one final use)
- **Skills**: caveman
- **Summary**: Analyze the migration for process improvement.

## Retrospective
[To be filled by orchestrator after Phase 7]
