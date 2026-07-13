# Task: Graph sync (Phase 9)
Agent: kitchcalc-builder
Date: 2026-06-20
Plan: docs/plans/plan-20260620-1718-monorepo-refactor.md
Current branch: dev

## Goal

Rebuild the graphify knowledge graph with `--update` to reflect the new monorepo structure (apps/web + 6 packages). This is the Phase 9 graph sync, the final step of the orchestrator workflow.

## Context

The graphify graph at `graphify-out/graph.json` was built BEFORE the monorepo refactor. It contains design token information (10,650 nodes, 0 edges) and is not useful for code dependency analysis (per T1-T13 reports, all 12 builders reported "graph has 0 edges, used grep fallback").

The closer-analyze (T13) recommended: "Rebuild graphify with `--mode deep` on `src/` before any future dependency-aware analysis. Recurring issue: graphify useless for code deps."

This task does the rebuild with `--update` (incremental — only updates changed files, doesn't re-extract everything).

## Task Scope

- **Type**: operational (graph sync)
- **Pre-existing components**: graphify-out/ directory, graph.json
- **New deliverables**: updated graph.json, updated GRAPH_REPORT.md
- **Dependencies**: monorepo refactor (T1-T12) + approved improvements (S1-S3) committed

## Skills Required

- `graphify`: For the `--update` command (the skill provides the command syntax)

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `docs/tasks/task-20260620-1940-builder-graph-sync-report.md` — the report file (mandatory)

Note: The graphify command itself will update `graphify-out/graph.json`, `graphify-out/GRAPH_REPORT.md`, and other graphify-out/ files. These are auto-generated and not in our scope list, but they're necessary side effects of the command.

## Technical Steps

1. **Load skill**: `graphify`

2. **Verify graphify is available**:
   ```bash
   which graphify
   ls graphify-out/
   ```
   - If graphify is not installed, follow the graphify skill's install instructions

3. **Run the graph sync command** (single operational command per Phase 9 spec):
   ```bash
   /graphify . --update
   ```
   - This is incremental — only re-extracts changed files
   - Will update `graphify-out/graph.json` with new structure (apps/web + packages/*)
   - Will update `graphify-out/GRAPH_REPORT.md` with the new graph

4. **Verify the sync worked**:
   ```bash
   ls -la graphify-out/
   wc -l graphify-out/GRAPH_REPORT.md
   head -30 graphify-out/GRAPH_REPORT.md
   ```

5. **Verify the graph reflects the new structure**:
   - Should have nodes for: apps/web, packages/db, packages/auth, packages/billing, packages/ui, packages/types, packages/config
   - Should have edges showing dependencies: auth → db, billing → db, ui → ui (self)
   - Cross-check with: `grep -i "@recetario" graphify-out/GRAPH_REPORT.md | head -20`

6. **Write report** to `docs/tasks/task-20260620-1940-builder-graph-sync-report.md` with:
   - **Skills Used**: list (likely `graphify`)
   - **Command executed**: `/graphify . --update`
   - **Output summary**: what changed
   - **New graph structure**: apps/web + 6 packages visible
   - **Edges detected**: any new dependency edges from the monorepo structure
   - **Issues encountered**: any + how resolved
   - **Graph stats**: node count, edge count (if improved from 0)

## Expected Output

- Updated `graphify-out/graph.json` (new structure)
- Updated `graphify-out/GRAPH_REPORT.md` (new report)
- **Report**: `docs/tasks/task-20260620-1940-builder-graph-sync-report.md`

## Guardrails

- **DO NOT** run source edits, config edits, lint, build, or test commands
- **DO NOT** modify any file outside graphify-out/ and the report file
- **DO NOT** commit the graphify-out/ changes (they're regeneratable)
- **DO NOT** add graphify-out/ to git (it's gitignored)
- **DO NOT** run `/graphify` without `--update` (that would be a full rebuild, not incremental)
- **DO** only run the single command `/graphify . --update` plus the verification commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. Note that graphify-out/ updates are an expected side effect of the command.
