# Validation: Orchestrator Anti-Loop Guardrails

Date: 2026-06-07
Reviewer: reviewer
Analysis: `docs/analysis/analysis-20260607-1630-orchestrator-anti-loop.md`
Implementer Report: `docs/tasks/task-20260607-orchestrator-anti-loop-implementer-report.md`

## Context Understood

The orchestrator spec (`.opencode/agents/orchestrator.md`) had 9 identified loop vectors that could cause qwen (smaller model) to enter unbounded file-reading cycles. The implementer applied 5 surgical edits to add guardrails without restructuring the workflow.

## Scope

Validated 5 edits to `.opencode/agents/orchestrator.md`:
- Edit A: `doom_loop: deny` in frontmatter
- Edit B: New `## Anti-Loop Guardrails` section (36 lines)
- Edit C: Phase 1 step 1 analysis report cap
- Edit D: Phase 1 step 3 graphify budget cap
- Edit E: Phase 5 read-once rule

Also verified workflow integrity (9 phases intact) and build health.

## Expected vs Actual

| Expectation (from analysis/task) | Actual (from code) | Match? |
|---|---|---|
| `doom_loop: deny` in frontmatter permission block | Line 16: `doom_loop: deny` — present, correctly placed after `todowrite: allow` | ✅ |
| New `## Anti-Loop Guardrails` section with 3 subsections | Lines 36-60: section with Per-Phase Read Budgets (table, 8 data rows), Circuit Breakers (5 bullets), Phase-End Self-Check (1 paragraph) | ✅ |
| Section positioned between Hard Constraints and Workflow (Branching) | Hard Constraints ends line 34, Anti-Loop Guardrails lines 36-60, Workflow (Branching) starts line 62 | ✅ |
| Phase 1 step 1 capped to "AT MOST 2" analysis reports | Line 101: `read AT MOST 2 most recent analysis reports for contextual memory. If both are insufficient, ask the user. Do NOT follow cross-references in those reports.` | ✅ |
| Phase 1 step 3 graphify budget cap (max 3 queries) | Line 119: `**Budget**: max 3 graphify queries total per Phase 1 (across sub-steps a-f). If all return nothing relevant, fall back to 1 explorer dispatch and stop searching.` | ✅ |
| Phase 5 "Read the report file ONCE" rule with justification requirement | Line 397: `**Read the report file ONCE** after the subagent completes. Do NOT rely on the Task tool return value. If you re-read a subagent report, justify it explicitly (e.g., "first read missed X"). Do not re-read for "verification" alone.` | ✅ |
| Other frontmatter permissions unchanged | Lines 6-15: `edit: deny`, `bash: deny`, `task: allow`, `read: allow`, `glob: allow`, `grep: allow`, `skill: allow`, `question: allow`, `todowrite: allow` — all unchanged | ✅ |
| 9-phase workflow intact | All phases present: Phase 1 (line 93), Phase 2 (line 205), Phase 3 (line 298), Phase 4 (line 343), Phase 5 (line 384), Phase 6 (line 405), Phase 6b (line 415), Phase 7 (line 450), Phase 7b (line 462), Phase 8 (line 471), Phase 9 (line 489) | ✅ |

## Checks Executed

### Edit Verification (grep)
- `grep -n "doom_loop: deny"` → line 16 ✅
- `grep -n "## Anti-Loop Guardrails"` → line 36 ✅
- `grep -n "AT MOST 2"` → lines 57, 101 (2 matches: circuit breaker + Phase 1 step) ✅
- `grep -n "Budget.*max 3 graphify"` → line 119 ✅
- `grep -n "Read the report file ONCE"` → line 397 ✅

### Workflow Integrity
- `grep "Phase 1 — Analysis"` → lines 65, 93 ✅
- `grep "Phase 9 — Graph Sync"` → line 489 ✅
- All 9 phases (plus 6b and 7b sub-phases) present and correctly ordered ✅

### Astro Check
- `pnpm astro check`: **0 errors, 0 warnings**, 60 hints (all pre-existing from `dist/` build artifacts and known deprecated `document.execCommand` signatures) ✅

### ESLint
- `pnpm eslint .`: **5 pre-existing errors** (4 in `.opencode/plugins/graphify.js` — unnecessary escape chars; 1 in `src/lib/auth.ts` — unused `token` param). **Zero new errors introduced.** ✅

### Diff Inspection
- `git diff HEAD` shows 5 anti-loop edits plus additional changes from the closer-agent-merge task (subagent rename: `analyst`/`synthesizer` → `closer`, Phase 6b/7b additions). The anti-loop edits are exactly as specified — no unintended modifications within their scope.

## Completeness Assessment: 9 Loop Vectors Coverage

| # | Loop Vector (from analysis) | Coverage | Where |
|---|---|---|---|
| 1 | Phase 1 step 1: "2-3" not capped | ✅ Covered | Edit C (line 101) + Circuit breaker "Historical context budget" (line 57) |
| 2 | Phase 1 step 3: no graphify budget | ✅ Covered | Edit D (line 119) + Circuit breaker "Graphify budget" (line 56) |
| 3 | Phase 1 step 4: no re-dispatch guard | ✅ Covered | Circuit breaker "Re-dispatch guard" (line 55) |
| 4 | Phase 5: no "read once" rule | ✅ Covered | Edit E (line 397) |
| 5 | Phase 7: closer dispatch no iteration cap | ✅ Covered | Per-phase budget table (Phase 7: 2 reads / 1 closer; Phase 7b: 1 read / 1 closer) |
| 6 | Reference chain cascades | ✅ Covered | Circuit breaker "Reference chain loop" (line 54) + reinforced in Edit C ("Do NOT follow cross-references") |
| 7 | No `doom_loop: deny` | ✅ Covered | Edit A (line 16) |
| 8 | No phase-end self-check | ✅ Covered | Phase-End Self-Check subsection (lines 59-60) |
| 9 | No "stop and ask user" trigger | ✅ Covered | Multiple locations: all 5 circuit breakers end with "STOP and ask the user" / "ask the user" |

**All 9 loop vectors addressed.**

## Findings

### ✅ Passed
- All 5 edits present and correctly applied
- Frontmatter permissions intact (only `doom_loop: deny` added)
- New section well-structured, follows existing Hard Constraints style
- Per-phase budget table has 8 data rows covering Phases 1-7b
- Circuit breakers are specific and actionable (not vague)
- Phase-end self-check is a clear stop/ask trigger
- "AT MOST 2" appears in both the circuit breaker section AND Phase 1 step 1 (defense in depth)
- Graphify budget appears in both circuit breaker AND Phase 1 step 3 (defense in depth)
- Phase 5 read-once rule includes justification requirement for re-reads
- 9-phase workflow fully intact
- Zero new lint/type errors introduced

### 🔵 Info (nice to have)
- `.opencode/agents/orchestrator.md:40-50` — Per-phase budget table omits Phase 6b (Rework) and Phase 8 (Output). Phase 6b is implicitly bounded by Phase 6's budget and the re-dispatch guard. Phase 8 has no reads (just text output). Neither is a loop risk, but explicit rows would eliminate any ambiguity.
- `.opencode/agents/orchestrator.md:55` — Re-dispatch guard says "edit the task file with a focused follow-up question first" — this implies the orchestrator can edit task files, which slightly tensions with the IMMUTABILITY RULE (line 542). In practice, the orchestrator already creates task files, so minor edits to clarify follow-ups are reasonable. No action needed.

## Residual Risks
- **Phase 6b unbounded iterations**: The rework loop ("Dispatch implementer → reviewer — repeat until clean") has no explicit max iteration count. The per-phase budgets and re-dispatch guard provide implicit bounds, but a hard cap (e.g., "max 3 rework iterations") would be more defensive.
- **Enforcement is advisory**: These guardrails are instructions in a markdown spec. A sufficiently confused model could still ignore them. The `doom_loop: deny` platform-level config is the strongest backstop, but its exact behavior depends on the opencode runtime implementation.

## Conclusion

**PASS** — All 5 edits correctly applied. All 9 loop vectors covered. Workflow intact. Zero regressions in build/lint. Guardrails are specific, actionable, and layered (defense in depth via both inline caps and the centralized Anti-Loop Guardrails section).
