# Plan: Approved improvements (ponytail migration follow-ups)

Created: 2026-06-20 18:55
Orchestrator: orchestrator
Analysis: [analysis-20260620-1830-approved-improvements.md](../analysis/analysis-20260620-1830-approved-improvements.md)

## Goal

Apply 3 closer-analyze suggestions to the agent specs: clarify the dual-description of ponytail in the orchestrator, add an action prompt to the reviewer's Ponytail Review Pass, and rename the Skills Reference table.

## Acceptance criteria

See [analysis-20260620-1830-approved-improvements.md](../analysis/analysis-20260620-1830-approved-improvements.md) for the full list. Verifier will check each.

## Implementation

Two files, three small edits. Builder does all edits, reviewer reads and verifies.

### Edit 1: orchestrator line ~221 — annotate ponytail in the skills list

old (approximate — read the file first to get the exact line):
```
   - `ponytail` — for concise communication + code lens (auto-injected by the ponytail plugin)
```
new:
```
   - `ponytail` — concise communication + code lens (no skill load needed — auto-injected by the ponytail plugin at every turn)
```

### Edit 2: orchestrator line ~796 — rename the table header

old (approximate):
```
## Skills Reference
```
new:
```
## Skills & Lenses Reference
```

The table rows underneath stay the same.

### Edit 3: reviewer line ~333 — add an action-prompt opening to "Ponytail Review Pass"

old (approximate, current first paragraph of the section):
```
### Ponytail Review Pass (over-engineering, not correctness)

Apply the `/ponytail-review` lens to the modified code. One finding per line, tagged with one of:
```
new:
```
### Ponytail Review Pass (over-engineering, not correctness)

When reviewing any code change: run `/ponytail-review` first, then map results to the 5 tags below and add findings to the `🟣 Ponytail` block in the report. Apply the `/ponytail-review` lens to the modified code. One finding per line, tagged with one of:
```

## Task Dependencies

| Task | Depends On | Parallel-Safe |
|------|------------|---------------|
| T1: builder — 3 edits | — | yes |
| T2: reviewer — verify | T1 | no |

## Tasks

### Task 1: Apply 3 edits
- **Agent**: kitchcalc-builder
- **Skills**: none
- **Scope**: extends-existing
- **Pre-existing**: 2 modified agent specs (orchestrator, reviewer)
- **Files**: `.opencode/agents/kitchcalc-orchestrator.md`, `.opencode/agents/kitchcalc-reviewer.md`, plus the builder report

### Task 2: Verify
- **Agent**: kitchcalc-reviewer
- **Skills**: none
- **Scope**: extends-existing (verification)
- **Pre-existing**: builder's report from T1
- **Files**: builder + reviewer reports only

## Retrospective

- **Rework iterations**: 0
- **Outcome**: PASS. All 3 approved improvements applied across 2 files; reviewer APPROVED with no 🔴 findings.
- **Builder deviation**: None.
- **Reviewer 🟡 warning**: `git diff` baseline is contaminated with prior uncommitted ponytail migration work. The 3 edits themselves are clean (grep + line-level inspection confirm). The baseline artifact is a process gap, not a regression. Recommend committing the prior migration work as a separate commit before future cycles that need a clean diff baseline.
- **Total time**: ~10 min from analysis write to reviewer APPROVED.
- **Files touched**: 2 (kitchcalc-orchestrator.md, kitchcalc-reviewer.md) + 2 task reports.
- **Cross-cycle impact**: the dual-description fix in orchestrator line 221 + the renamed table header line 796 + the reviewer action-prompt line 335 should be picked up automatically by future cycles that read agent specs.
