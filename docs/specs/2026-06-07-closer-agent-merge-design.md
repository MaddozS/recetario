# Spec: Closer Agent — Merge analyst + synthesizer

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

Created: 2026-06-07
Orchestrator: orchestrator
Status: approved
Analysis: docs/analysis/analysis-20260607-1630-closer-agent-merge.md

## Problem / Need
`analyst` and `synthesizer` subagents duplicate ~70% of their work: both read plans, task files, implementer and reviewer reports, audit rework documentation, detect historical patterns, and rank suggestions. The only true differentiator is `edit: allow` permission on synthesizer. This duplication caused a real failure on 2026-06-07: both agents ran before 4 post-PASS fix iterations and emitted factually incorrect "zero-fix" reports (see `task-20260607-analyst-session-process-report.md`).

## Context (from Phase 1 Analysis)
- Two agent specs with overlapping content: `.opencode/agents/analyst.md` (166 lines), `.opencode/agents/synthesizer.md` (97 lines).
- Orchestrator Hard Constraint #7 mandates "always dispatch synthesizer as the final step."
- Recent maintenance drift: rework audit logic was added to both specs on the same day with slightly different wording.

## Success Criteria
- [ ] `.opencode/agents/closer.md` exists with two clearly separated modes (ANALYZE, APPLY).
- [ ] `.opencode/agents/analyst.md` deleted.
- [ ] `.opencode/agents/synthesizer.md` deleted.
- [ ] Orchestrator spec references to old agents replaced with `closer`.
- [ ] No broken subagent references in active task files.
- [ ] Historical reports (`*-analyst-report.md`, `*-synthesizer-report.md`) preserved.

## User Stories
- As orchestrator, I want to dispatch a single closer agent in two modes so I don't waste tokens on duplicate file reads.
- As the project owner, I want agent specs to be DRY so adding new checks (like rework audit) happens in one place.
- As the analyst itself, I want my role to be re-usable for process changes (e.g., this one final analysis of its own deprecation).

## Approaches Considered

### Approach A: Single closer agent with two modes (selected)
- **Description**: One spec, two modes, dispatched twice per cycle.
- **Pros**: Eliminates duplication, centralizes maintenance, makes timing dependency explicit (APPLY depends on ANALYZE report).
- **Cons**: One spec describing two roles requires clear `## Mode A` / `## Mode B` separation.

### Approach B: Reduce synthesizer to a thin applier
- **Description**: Keep analyst, slim synthesizer to ~40 lines that only reads analyst's report and applies.
- **Pros**: Minimal change.
- **Cons**: Two specs still maintained; "synthesizer" name no longer matches behavior.

### Approach C: Single-pass closer (no gate)
- **Description**: One agent, one call, applies immediately.
- **Cons**: Loses user-approval gate. Rejected.

## Design

### Architecture
```
Orchestrator
  ├── Phase 7: dispatch closer ANALYZE (read-only) → closer-analysis.md
  ├── Phase 8: present to user, collect approval
  └── Phase 8b: dispatch closer APPLY (edit: allow) → closer-application.md
```

### Pages / Components
- **New**: `.opencode/agents/closer.md`
- **Modified**: `.opencode/agents/orchestrator.md` (Hard Constraint #7, subagent table, IMMUTABILITY RULE, Phase 6b/7 references, Phase 5 subagent list, template fields at lines 303, 321)
- **Deleted**: `.opencode/agents/analyst.md`, `.opencode/agents/synthesizer.md`

### Data Layer (Prisma)
N/A

### Auth
N/A

### Stripe / Billing
N/A

### UI / UX
N/A

### Error Handling
- If orchestrator dispatches APPLY before ANALYZE: closer spec mandates it aborts and reports "missing analysis input."
- If user did not approve any changes: APPLY produces a brief log "no changes applied" and exits.

### Verification
- `pnpm astro check` — confirm no product code touched.
- `pnpm eslint .` — confirm no lint issues.
- `grep "analyst\|synthesizer" .opencode/agents/orchestrator.md` — must return only the historical IMMUTABILITY note line (or no matches).
- `ls .opencode/agents/` — must show only closer.md, implementer.md, explorer.md, reviewer.md, orchestrator.md.

## Risks & Mitigations
| Risk | Impact | Mitigation |
|---|---|---|
| User forgets to restart opencode | New agent not loaded | Phase 8 output reminds user explicitly |
| Historical reports reference removed agents | None — historical, not loaded | Leave files untouched |
| Mode separation unclear | Confusion at dispatch | Distinct `## Mode A` and `## Mode B` sections; orchestrator template marks `agent: closer` and the mode in the task file |

## Out of Scope
- Renaming historical report files (analyst-report.md → closer-analysis.md). They are immutable history.
- Adding new analysis capabilities. The closer's analytical power equals the union of the previous two agents, not greater.
- Changing the orchestrator's other phases (1-6, 8-9).
