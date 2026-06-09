# Analysis Report: Closer Agent Merge (analyst + synthesizer → closer)

Created: 2026-06-07
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Replace `.opencode/agents/analyst.md` and `.opencode/agents/synthesizer.md` with a single `.opencode/agents/closer.md` that runs in two modes (ANALYZE read-only + APPLY edit:allow), eliminating duplicate file reads and overlapping analysis.

## Target Location
- **Primary anchor(s)**: `.opencode/agents/`, `.opencode/agents/orchestrator.md`
- **Layer**: agent (process/role definition)

## Surrounding Context
- Orchestrator (`.opencode/agents/orchestrator.md`) defines the master workflow: Phase 1-9 with branching for ajuste vs feature. Hard Constraint #7 mandates synthesizer as final step.
- Current agent roster: explorer, implementer, reviewer, analyst, synthesizer, orchestrator.
- Recent session-process analysis (`docs/tasks/task-20260607-analyst-session-process-report.md`) proved both analyst and synthesizer missed 4 post-PASS fix iterations because they ran too early. Both agents independently added rework audit logic on 2026-06-07 — evidence of duplicated maintenance.

## Detected Tech Debt / Potential Refactors
- Two specs with ~70% overlapping content (file reads, rework audit, historical analysis, ranked suggestions).
- Hard-coded subagent types list in orchestrator.md (line 30) needs to be updated to replace `analyst` and `synthesizer` with `closer`.
- IMMUTABILITY RULE (orchestrator.md line 506) lists both old agent names — must be updated.
- Phase 6b/7 references (orchestrator.md lines 404, 406) describe "analyst" and "synthesizer" as separate roles — must be updated.
- Subagent Reference table (orchestrator.md lines 475-476) lists both old agents — must be updated to single closer row.

## Graphify Findings
N/A — this is a process change, not a code change. Graph sync will be re-run after implementation (Phase 9).

## Codebase Patterns to Follow
- Agent file format: frontmatter with description, mode, model, color, permission; body with role, file protocol, workflow, constraints.
- Caveman lite mode in agent instructions.
- File-based communication protocol: input files, output files, return message format.

## Complexity Assessment
- **Decision**: ajuste
- **Rationale**: process/role merge with no product code change. No new pages, routes, models, auth, or Stripe changes. Touches only agent definitions and orchestrator spec.

## Dependencies & Prerequisites
- User must restart opencode after implementation to reload agent configs.
- Historical reports referencing old agent names (`*-analyst-report.md`, `*-synthesizer-report.md`) are NOT modified — they are historical record.

## Past Related Work
- `docs/tasks/task-20260607-analyst-session-process-report.md` — surfaced the timing problem that motivates this merge.
- `docs/tasks/task-20260607-update-analyst-report.md` and `task-20260607-update-synthesizer-report.md` — recent evidence of duplicated maintenance.
- `docs/tasks/task-20260607-synthesizer-header-layout-report.md` line 90 — recurring suggestion for `astro-icon-verify` skill, evidence of synthesizer pattern-detection overlap with analyst.
