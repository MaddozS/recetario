# Analysis Report: Orchestrator Anti-Loop Guardrails

Created: 2026-06-07
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Add anti-loop guardrails to the orchestrator spec to prevent file-reading loops in qwen (and other smaller models), bound the exploration space per phase, and configure `doom_loop: deny` at the platform level.

## Target Location
- **Primary anchor(s)**: `.opencode/agents/orchestrator.md`
- **Layer**: agent (process/role definition)

## Surrounding Context
- Orchestrator uses `opencode-go/qwen3.7-plus` — smaller model, more prone to re-reading to "verify"
- The current spec has 9 identified loop vectors: unbounded historical context reads, no graphify budget, no re-dispatch guard, no per-phase read caps, no `doom_loop` config, no "stop and ask" trigger, reference-chain cascades
- Recent merge (closer agent) updated 10 locations in this spec — the file is fresh and stable

## Detected Tech Debt / Potential Refactors
- Phase 1 step 1 says "read the most recent 2-3 analysis reports" without a hard cap
- Graphify-first section (Phase 1 step 3) has 6 sub-steps with no max-queries rule
- No `doom_loop` permission configured on any agent
- No explicit "stop and ask user" trigger anywhere in the workflow

## Graphify Findings
N/A — process change, not code change.

## Codebase Patterns to Follow
- Spec edits use targeted `edit` calls, not full rewrites
- Hard Constraints section structure (lines 24-34) — new section follows the same style
- Frontmatter YAML format (lines 1-15)

## Complexity Assessment
- **Decision**: ajuste
- **Rationale**: no product code change, no schema, no auth, no Stripe. Single-file spec edit.

## Dependencies & Prerequisites
- User must restart opencode after implementation (customize-opencode skill: config not hot-reloaded)

## Past Related Work
- `docs/tasks/task-20260607-closer-agent-merge-*` — recent edit to this same file (10 changes)
- `docs/tasks/task-20260607-update-orchestrator-report.md` — prior targeted orchestrator update

## Identified Loop Vectors (from prior analysis)
1. Phase 1 step 1 (line 74): "2-3" not capped absolutely
2. Phase 1 step 3 (lines 84-91): graphify has no query budget
3. Phase 1 step 4 (lines 93-98): explorer dispatch has no re-dispatch guard
4. Phase 5 (line 503): "Read the report file" without "read once" rule
5. Phase 7 (line 429): closer dispatch with no iteration cap
6. Reference chain cascades when reading historical reports
7. No `doom_loop: deny` in any agent frontmatter
8. No phase-end self-check signal
9. No "stop and ask user" trigger

## Proposed Fix (Option 1)
- Add `doom_loop: deny` to orchestrator frontmatter
- Add new `## Anti-Loop Guardrails` section after Hard Constraints
- Modify Phase 1 step 1: "2-3" → "AT MOST 2"
- Modify Phase 1 step 3: add graphify budget cap
- Add "read once" rule to Phase 5
