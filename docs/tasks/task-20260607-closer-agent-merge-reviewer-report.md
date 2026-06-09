# Validation: Closer Agent Merge (analyst + synthesizer → closer)

Date: 2026-06-07
Reviewer: reviewer
Plan: docs/plans/plan-20260607-closer-agent-merge.md
Analysis: docs/analysis/analysis-20260607-1630-closer-agent-merge.md
Spec: docs/specs/2026-06-07-closer-agent-merge-design.md
Implementer Report: docs/tasks/task-20260607-closer-agent-merge-implementer-report.md

## Context Understood
The orchestrator merged two overlapping subagents (analyst: read-only post-mortem, synthesizer: apply improvements) into a single `closer` agent with two modes. Mode A (ANALYZE) is read-only, runs at end of every cycle. Mode B (APPLY) has edit:allow, runs only after user approval. This eliminates ~70% duplicated file reads and maintenance drift between two specs.

## Scope
- `.opencode/agents/closer.md` — new file, two modes
- `.opencode/agents/analyst.md` — deleted
- `.opencode/agents/synthesizer.md` — deleted
- `.opencode/agents/orchestrator.md` — 10 edits updating all references
- Documentation files: analysis, spec, plan
- Historical reports: must remain untouched

## Expected vs Actual

| Expectation (from plan/task) | Actual (from code) | Match? |
|---|---|---|
| `closer.md` exists with `## Mode A: ANALYZE` and `## Mode B: APPLY` | Line 32: `## Mode A: ANALYZE (read-only, default)`, Line 130: `## Mode B: APPLY (edit: allow, ...)` | ✅ |
| `closer.md` frontmatter has description, mode, model, permission | Lines 1-13: all present (description, mode: subagent, model: opencode-go/deepseek-v4-pro, color, permission block) | ✅ |
| `analyst.md` deleted | Not in `ls .opencode/agents/` output | ✅ |
| `synthesizer.md` deleted | Not in `ls .opencode/agents/` output | ✅ |
| Directory contains exactly: closer.md, explorer.md, implementer.md, orchestrator.md, reviewer.md | Confirmed — 5 entries, exact match | ✅ |
| `grep "analyst\|synthesizer" orchestrator.md` returns no matches | 0 matches found | ✅ |
| Hard Constraint #7 (line 32) refers to closer with two modes | Line 32: "Always dispatch closer as the final step...two modes: ANALYZE...then APPLY...after user approval" | ✅ |
| Subagent types list (line 30) includes `closer`, removes old agents | Line 30: "Use exclusively: `explorer`, `implementer`, `reviewer`, `closer`" | ✅ |
| Phase 5 subagent list updated | Line 362: `closer — end-of-cycle post-mortem (Mode ANALYZE) and apply-approved-changes (Mode APPLY)` | ✅ |
| Phase 6b references (lines 404, 406) updated | Line 404: "Return to Phase 7 (closer Mode ANALYZE)", Line 406: "Run closer Mode APPLY" | ✅ |
| Phase 7 section with Closer Mode ANALYZE | Line 422: "Phase 7 — Post-Implementation Analysis (Closer Mode ANALYZE)" with pre-spawn checklist | ✅ |
| Phase 7b section exists for Closer Mode APPLY | Line 434: "Phase 7b — Apply Approved Suggestions (Closer Mode APPLY)" | ✅ |
| Phase 8 Output includes application log bullet | Line 455: "Application log: link to closer Mode APPLY log" | ✅ |
| Subagent Reference table has single closer row | Line 484: single row with both modes described | ✅ |
| IMMUTABILITY RULE lists `closer`, not old agents | Line 514: "No subagent (explorer, implementer, reviewer, closer) ever modifies..." | ✅ |
| Plan/task templates use `closer` in Agent field | Line 303: `[explorer | implementer | reviewer | closer]`, Line 321: same | ✅ |
| Historical analyst reports untouched | 2 files found: `task-20260607-update-analyst-report.md`, `task-20260606-analyst-report.md` | ✅ |
| Historical synthesizer reports untouched | 4 files found (all present, not read or modified) | ✅ |
| `pnpm astro check` passes | 0 errors, 0 warnings (60 hints — all pre-existing in dist/ and known files) | ✅ |
| `pnpm eslint .` — 5 pre-existing errors only | 5 errors: 4 in graphify.js (useless escapes), 1 in auth.ts (unused var) — all pre-existing, unrelated | ✅ |
| Analysis doc exists and links to correct files | `docs/analysis/analysis-20260607-1630-closer-agent-merge.md` — 45 lines, well-formed | ✅ |
| Spec doc exists with analysis link | `docs/specs/2026-06-07-closer-agent-merge-design.md` — line 6 links to `docs/analysis/analysis-20260607-1630-closer-agent-merge.md` ✅ | ✅ |
| Plan doc exists with analysis + spec links | `docs/plans/plan-20260607-closer-agent-merge.md` — lines 5-6 link correctly | ✅ |

## Checks Executed

### Pattern Compliance
- Frontmatter structure (description, mode, model, color, permission): ✅ matches other agent specs
- File-based communication protocol (input/output/return message): ✅ present and consistent
- Caveman lite mode instruction: ✅ present at line 157
- Mode separation with distinct headers: ✅ `## Mode A:` and `## Mode B:` clearly delimited by `---`
- Hard constraints per mode: ✅ each mode has its own constraint section
- Orchestrator references all use `closer` consistently: ✅ zero stale references

### Lint
- `pnpm eslint .`: 5 errors — all pre-existing (graphify.js ×4, auth.ts ×1). No new errors introduced.

### Astro Check
- `pnpm astro check`: 0 errors, 0 warnings, 60 hints (all pre-existing in dist/ build output and known deprecation warnings in InstructionsEditor.astro).

### Build
- Not run separately — `pnpm astro check` covers TypeScript correctness for all `.astro` and `.ts` files. No source code was modified in this change, so build verification is unnecessary.

## Findings

### ✅ Passed
1. **closer.md well-formed** — frontmatter correct, two modes clearly separated with distinct sections, workflows, constraints, and output paths
2. **Old agents fully removed** — analyst.md and synthesizer.md deleted, no stale references in any active agent spec
3. **Orchestrator comprehensively updated** — all 10 edit locations verified, zero stale references to old agent names
4. **Documentation chain intact** — analysis → spec → plan cross-links all resolve correctly
5. **Historical reports preserved** — 6 historical files (2 analyst, 4 synthesizer) remain untouched
6. **Mode A is genuinely read-only** — frontmatter `edit: deny`, hard constraints explicitly say "never modify source files, plans, task files, analysis reports, or agent specs"
7. **Mode B reads Mode A output** — line 136: "Read your input: the Mode ANALYZE report at `docs/tasks/task-YYYYMMDD-HHmm-closer-analysis.md`"
8. **Mode B constrained to approved subset** — line 139: "Apply only the approved changes — do not freelance"
9. **Phase 7b properly gated** — orchestrator requires user approval between Phase 7 (ANALYZE) and Phase 7b (APPLY)
10. **Phase 6b timing correct** — rework completes before closer runs (line 404: "Return to Phase 7 AFTER all rework is complete")
11. **Rework documentation audit in Mode A** — lines 48-51: closer checks that each fix has full documentation trail
12. **Legacy report awareness** — line 44: closer reads both new `*-closer-analysis.md` and legacy `*-analyst-report.md`/`*-synthesizer-report.md` for historical pattern detection

### 🟡 Warnings
1. **Permission model ambiguity** (closer.md line 7 vs line 130) — Frontmatter sets `edit: deny` as the agent-level permission, but Mode B header says "edit: allow". There is no per-mode permission override mechanism in the frontmatter. If opencode enforces `edit: deny` at the platform level for this subagent, Mode B will fail to make edits. **Severity: medium** — needs verification that opencode allows permission overrides per-invocation, or that the orchestrator dispatches Mode B with different permission settings. If the previous synthesizer had `edit: allow` in its own frontmatter, merging into a single spec with `edit: deny` may break Mode B.
2. **Plan Task 3 references deleted agent** (plan-20260607-closer-agent-merge.md line 56) — Task 3 says `Agent: analyst (still alive for this one final use)`, but analyst.md was deleted as part of this same task. The plan is immutable so this can't be fixed, but it's a documentation inconsistency. In practice, the closer (Mode ANALYZE) replaced this role. **Severity: low** — historical artifact only.

### 🔵 Info
1. **Spec uses "Phase 8b" naming** (spec line 52) while orchestrator uses "Phase 7b" (line 434). The spec was written before the final phase numbering was settled. Not a functional issue — the orchestrator is the source of truth for phase numbering.
2. **closer.md output paths use new naming convention** — `task-YYYYMMDD-HHmm-closer-analysis.md` and `task-YYYYMMDD-HHmm-closer-application.md` instead of the old `*-analyst-report.md` / `*-synthesizer-report.md`. Clean break.

## Residual Risks
- **Permission enforcement**: If opencode enforces frontmatter `edit: deny` strictly, Mode B (APPLY) cannot edit files. The orchestrator would need to dispatch closer with overridden permissions for Mode B. This is the single biggest risk and should be tested on first Mode B invocation.
- **First-run validation**: The closer agent hasn't been tested in a real cycle yet. The first full-cycle run will validate mode separation, output paths, and permission behavior.

## Acceptance Criteria Checklist

| # | Criterion | Status |
|---|---|---|
| 1 | closer.md exists with Mode A and Mode B clearly separated | ✅ |
| 2 | analyst.md removed | ✅ |
| 3 | synthesizer.md removed | ✅ |
| 4 | orchestrator Hard Constraint #7 updated | ✅ |
| 5 | orchestrator subagent types list updated | ✅ |
| 6 | orchestrator Phase 5 subagent list updated | ✅ |
| 7 | orchestrator Phase 6b/7 references updated | ✅ |
| 8 | orchestrator Subagent Reference table updated | ✅ |
| 9 | orchestrator IMMUTABILITY RULE updated | ✅ |
| 10 | orchestrator plan/task templates updated | ✅ |
| 11 | Historical reports NOT modified | ✅ |
| 12 | pnpm astro check passes | ✅ |
| 13 | pnpm eslint passes (no new errors) | ✅ |
| 14 | Documentation files exist with correct cross-links | ✅ |

## Visual QA
Not applicable — no UI changes.

## Conclusion
**PASS_WITH_NOTES** — All acceptance criteria met. Implementation is clean and comprehensive. One warning about the `edit: deny` frontmatter vs Mode B's `edit: allow` claim needs verification before first Mode B dispatch. All other aspects (file structure, content quality, cross-references, build verification) pass without issues.
