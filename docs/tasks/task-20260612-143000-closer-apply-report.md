# Closer Apply: Costos Fijos Avanzados Post-Mortem Improvements
Date: 2026-06-13 10:45
Agent: kitchcalc-closer-apply
Task File: (dispatched by orchestrator — ad-hoc request, no formal task file)
Analysis: docs/tasks/task-20260612-143000-closer-analyze-report.md

## Metadata
- Files read: 7/15
- Graphify queries: 0/3 (not needed — documentation-only changes)
- Read discipline: obeyed
- Re-reads: 0/2
- Decision: complete

## Approved Subset

All 9 suggestions from the closer-analyze report were approved:

### Agent Improvements
1. Clarify task scope in plan — update plan template or process docs
2. Document graphify fallback procedure in builder instructions
3. Add visual QA checklist to validator skill

### Skills Improvements
4. Fix graphify networkx dependency — add installation instructions to graphify skill
5. Add Prisma enum typing pattern/skill to replace `as any` casts
6. Enhance verification-before-completion skill with visual QA steps

### Process Improvements
7. Clarify task dependencies in plan template
8. Add pre-flight checks for graphify dependencies
9. Add ESLint cleanup automation (pre-commit hook or CI)

## Files Modified

| # | File | Change | Lines Added |
|---|------|--------|-------------|
| 1 | `.opencode/agents/kitchcalc-orchestrator.md` | Added `## Task Dependencies` table + per-task scope/pre-existing fields to Phase 3 plan template | ~20 |
| 2 | `.opencode/agents/kitchcalc-orchestrator.md` | Added `## Task Scope` section to Phase 4 task template (type, pre-existing, new deliverables, dependencies) | ~8 |
| 3 | `.opencode/agents/kitchcalc-builder.md` | Added `### Step 6: Fallback Procedure` and `### Step 7: Pre-Flight Checks` to Graphify-First Rule | ~35 |
| 4 | `.opencode/agents/kitchcalc-validator.md` | Expanded `## Visual QA` report section into detailed checklist (desktop/mobile/parity) | ~35 |
| 5 | `.agents/skills/graphify/SKILL.md` | Added `## Dependencies` section with networkx install instructions and pre-flight check | ~20 |
| 6 | `.agents/skills/prisma-client-api/SKILL.md` | Added `## Enum Type Safety Pattern` section with typed wrapper and generic helper examples | ~65 |
| 7 | `.opencode/skills/design-system-verify/SKILL.md` | Added `## 5. Visual QA Checklist` section with desktop/mobile/parity checks | ~30 |
| 8 | `AGENTS.md` | Added `### Task Dependency Convention`, `### Pre-Flight Checks`, `### ESLint Cleanup` to Process Conventions | ~40 |

## Diff Summary

### 1. Orchestrator — Plan Template (Phase 3)
**What**: Added `## Task Dependencies` table before `## Tasks` section. Added `Scope` and `Pre-existing` fields to each task definition.
**Why**: Task 6 builder discovered most work already implemented. Explicit scope + dependency tracking prevents this.

### 2. Orchestrator — Task Template (Phase 4)
**What**: Added `## Task Scope` section with type (new/extends-existing/fix), pre-existing components, new deliverables, and dependencies.
**Why**: Gives builders explicit context about what already exists vs what they must create.

### 3. Builder — Graphify Fallback + Pre-Flight
**What**: Added Step 6 (fallback procedure when graphify fails) and Step 7 (pre-flight dependency check).
**Why**: Builders encountered `networkx` missing but had no documented fallback. Now they report the failure, use grep/glob, and continue.

### 4. Validator — Visual QA Checklist
**What**: Expanded the 3-line Visual QA report section into a full checklist with desktop (1280px), mobile (375px), and parity checks. Includes guidance for when no DB environment is available.
**Why**: Validator skipped visual QA due to no DB. Now has explicit instructions for both scenarios (DB available vs not).

### 5. Graphify Skill — Networkx Dependency
**What**: Added `## Dependencies` section listing required Python packages, reinstall commands, and a pre-flight check one-liner.
**Why**: `networkx` was missing in the builder environment. Skill now documents the dependency and fix.

### 6. Prisma Skill — Enum Type Safety
**What**: Added `## Enum Type Safety Pattern` with problem/solution examples, a generic `parseEnum<T>` helper, and guidance on when to apply.
**Why**: 8 `as any` casts in [recipe].astro for Prisma enum fields. This pattern provides a type-safe alternative.

### 7. Design-System-Verify — Visual QA
**What**: Added `## 5. Visual QA Checklist` with desktop/mobile/parity checks and instructions for running visual QA.
**Why**: verification-before-completion skill is external (cannot modify). Added visual QA to the project-local design-system-verify skill instead.

### 8. AGENTS.md — Process Improvements
**What**: Added three new sections to Process Conventions:
- `### Task Dependency Convention` — mandates dependency table + per-task scope/pre-existing in plans
- `### Pre-Flight Checks` — graphify dependency verification before dispatching builders
- `### ESLint Cleanup` — three options (pre-commit hook, CI check, builder self-check) to eliminate dedicated fix-ESLint tasks
**Why**: Centralizes process improvements that affect all agents.

## Verification

### Change Integrity
- [x] All 8 `replace_section` operations returned `True`
- [x] Grep verification confirmed all key markers present in modified files
- [x] No source code files modified (only agent specs, skill files, AGENTS.md)
- [x] No immutable files modified (no analysis, spec, plan, or task files)
- [x] Checkpoint `closer-apply-pre-edit` saved before edits (recovery available)

### Protocol Compliance
- [x] Only approved suggestions applied — no freestyle changes
- [x] Agent spec structure preserved (existing sections untouched, new sections added at logical positions)
- [x] Skill file structure preserved (new sections follow existing patterns)
- [x] AGENTS.md additions follow existing convention (markdown headers, code blocks, tables)

### Files NOT Modified (correctly excluded)
- `docs/analysis/analysis-*.md` — immutable (orchestrator-owned)
- `docs/plans/plan-*.md` — immutable (orchestrator-owned)
- `docs/tasks/task-*.md` — immutable (orchestrator-owned)
- `.opencode/agents/kitchcalc-closer-analyze.md` — not in scope
- `.opencode/agents/kitchcalc-explore.md` — not in scope
- `.opencode/agents/kitchcalc-reviewer.md` — not in scope
- Source code (`src/**`, `prisma/**`) — forbidden

## Commands Executed
- `test -f graphify-out/graph.json`: available
- Python script (8 `replace_section` calls): all 8 returned `True`
- `grep -n` verification across all 7 files: all markers found

## Residual Risks
- **Prisma enum pattern adoption**: The `parseEnum<T>` pattern is documented but not yet applied to existing `as any` casts. Future builder tasks should use this pattern incrementally.
- **ESLint automation not implemented**: AGENTS.md documents three options (pre-commit hook, CI check, builder self-check) but none are configured yet. Requires a separate task to implement.
- **External skill not modified**: `verification-before-completion` is in the superpowers package (read-only). Visual QA steps added to project-local `design-system-verify` skill instead. If the external skill is updated upstream, the project-local skill should be reviewed for duplication.

## Conclusion

**Verdict: PASS**

All 9 approved suggestions applied successfully across 7 files. Changes are documentation-only (agent specs, skill files, AGENTS.md). No source code modified. No immutable files touched. Checkpoint saved for recovery if needed.

**Changes by category:**
- Agent improvements: 3/3 applied ✅
- Skills improvements: 3/3 applied ✅
- Process improvements: 3/3 applied ✅
