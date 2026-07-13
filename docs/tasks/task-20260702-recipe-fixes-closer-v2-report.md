# Closer Analyze Report: task-20260702-recipe-fixes (v2 — Post-Rework Analysis)

## Cycle Reviewed

- **State**: `docs/tasks/task-20260702-recipe-fixes-state.json` — stale, only reflects v1
- **Summary**: 5-fix recipe page cycle with 3 rework loops (v2: user-reported redirect/tab/FC issues; v3: edit-mode Preparación; v4: restoration after v3 Python script regression), followed by first-ever review (v4-validate)
- **Reports**:
  - `docs/tasks/task-20260702-recipe-fixes-builder.md` (v1 task)
  - `docs/tasks/task-20260702-recipe-fixes-report.md` (v1 builder)
  - `docs/tasks/task-20260702-recipe-fixes-validate.md` (v1 validator)
  - `docs/tasks/task-20260702-recipe-fixes-v2-report.md` (v2 builder — process violation, no task file)
  - `docs/tasks/task-20260702-recipe-fixes-v3-report.md` (v3 builder — Python script regressed)
  - `docs/tasks/task-20260702-recipe-fixes-v4-report.md` (v4 builder — successful restoration)
  - `docs/tasks/task-20260702-recipe-fixes-v4-validate.md` (v4 reviewer — first review of cycle)
  - `docs/tasks/task-20260702-recipe-fixes-closer-report.md` (v1 closer — 3 process failures identified)

## Skills Used

Selected:
- `ponytail-review` — baseline audit lens for process complexity and over-engineering
- `ponytail` — baseline lazy approach for analysis writing

Discarded:
- `security-best-practices` — no auth/session changes in analyzed reports
- `ui-ux-pro-max` / `design-system-verify` — not performing UI audit
- `diagnose` — the cycle has ended and fixes are done; no active diagnosis needed

Added During Execution:
- none

## Protocol Assessment

**Partial** — improvements over v1 cycle but significant gaps remain.

### Progress since v1 closer

| v1 Recommendation | Status in v2-v4 | Evidence |
|---|---|---|
| P1: STOP-diagnose-then-act for tool failures | ❌ NOT implemented | v3 builder used Python script that corrupted the file instead of diagnosing the edit tool bracket-filename issue. v4 found the `edits` array workaround by trial, not diagnosis. |
| P1: Never dispatch non-KitchCalc agents | ❌ VIOLATED in v2 | The general agent dispatch happened again in v2 (sed-based edit). Though documented in state as "PROCESS VIOLATION", it wasn't prevented. After that, v3 and v4 correctly used kitchcalc-builder. |
| P2: State file update after every subagent dispatch | ❌ NOT implemented | State file was never updated after v2, v3, or v4. Still shows only v1 agent runs with the closer appended. No v2/v3/v4 validation records, no review records, no files_changed updates. |
| P2: Remove "accepted" phase gate from automation | ⚠️ PARTIAL | State now shows `accepted: false` and `phase: "ready-for-review"`. The premature acceptance bug is fixed. But the state needs user sign-off to flip to accepted. |
| P2: Mandatory code review step | ⚠️ PARTIAL | v4 finally had a review — the first in the entire cycle. It found 2 should-fix issues. But reviews should happen earlier in the process, not at the last possible moment after 3 rework loops. |
| P2: Builders must run eslint before declaring done | ❌ NOT implemented | v2 builder ran only astro check. v3 builder ran only astro check. v4 builder ran only astro check. No one re-ran eslint after v1, leaving 9 new ESLint errors unfixed. |
| P3: Visual QA fallback procedure | ❌ NOT implemented | No visual QA performed across any of the 4 build loops. Every builder deferred it. |

**Net**: The v1 closer's P1 and P2 recommendations were largely unimplemented. The v4 review was the only concrete improvement. The bracket-filename tool issue and ESLint blindness remain unresolved.

### Remaining process gaps

1. **Bracket-filename issue recurs every single builder run**: v2 → Node.js workaround (worked). v3 → Python script (FAILED, corrupted file). v4 → `edits` batch parameter (worked). Four encounters, four different workarounds. This needs a documented permanent solution, not a per-builder trial.

2. **ESLint never re-run after v1**: The v1 validator identified 9 new ESLint errors. Every subsequent builder ran only `pnpm astro check`. The errors are still present after 4 build loops.

3. **State file became permanently stale after v1**: The closer-recommended "state update after every subagent dispatch" was never implemented. No record of v2/v3/v4 changes exists in the state file.

4. **Review finally happened but too late**: The first (and only) review occurred at v4, after 3 rework loops consumed by user-reported bugs that a review could have caught earlier. The v2 loop in particular (tab UX, cache behavior, component visibility) was a review-amenable failure mode.

## Context Efficiency

**Good across all loops.** Each builder read only the files needed for their scope. The v4 reviewer read only `[recipe].astro` — optimal.

The v2 builder read 2 files (FixedCostCard.astro, [recipe].astro) — correctly scoped.
The v3 builder read 3 files (task + source + InstructionsEditor) — correctly scoped.
The v4 builder read 3 files (task + state + source) — correctly scoped.

No over-reading. No re-exploration of already-explored territory.

## Skill Routing Assessment

### Builder v2
- Selected: `ponytail` only
- **Missed**: `design-system-verify` — `[recipe].astro` was edited (UI component). Should have been loaded.
- Verdict: acceptable for a 2-line change scope, but technically underloaded.

### Builder v3
- Selected: `ponytail` only
- Discarded: `design-system-verify` (correct — wiring task, no new UI), `security-best-practices` (correct)
- Verdict: correct for a wiring-only task.

### Builder v4
- Selected: `ponytail` only
- Discarded: `design-system-verify` (correct — restoration task, no new UI)
- Verdict: correct for a restoration task.

### Reviewer v4
- Selected: `design-system-verify` + `ponytail-review`
- **Correct selection.** `design-system-verify` flagged the regional Spanish issue ("Hacé" → "Haz"), which is exactly its purpose. `ponytail-review` as baseline lens.
- Verdict: first correctly-loaded multi-skill configuration in the entire cycle.

### Pattern
- The cycle's only multi-skill load was the reviewer. All builders loaded `ponytail` only. The `design-system-verify` skill is being underused on builder runs — it should be loaded for every `[recipe].astro` edit since the file has UI copy and semantic token usage.

## State Accuracy

**Stale and incomplete.** The state file (`task-20260702-recipe-fixes-state.json`) was last updated for the v1 closer. Since then:

| Field | Current Value | Should Be |
|---|---|---|
| `agent_runs` | 8 entries (explore → v1 builder → v1 validator → v2 builder → general → v2 validator → closer) | +v3 builder, +v3b builder, +v4 builder, +v4 reviewer |
| `files_changed` | 5 files (v1 only) | +FixedCostCard.astro (v2 changes), +[recipe].astro (v2/v3/v4 changes) |
| `validation` | v1 records only | +v2 astro check (PASS), +v3 astro check (PASS), +v4 astro check (PASS), +v4 review findings (2 should-fix) |
| `reviews` | `[]` | +v4 reviewer result (accept with 2 should-fix) |
| `rework_loops` | 3 loops recorded | Correct — 3 loops captured |
| `next_actions` | "Visual QA", "Fix ESLint errors", "Await acceptance" | +Fix 2 reviewer findings (regional Spanish, hash handler) |
| `closer_findings` | v1 findings only | +v2 findings (this report) |

**Correction needed**: A full state file rewrite (or replacement) capturing the final state after v4 changes and the v4 review is essential before this cycle is truly closed.

## Validation And Review Coverage

### What was checked
| Gate | v2 | v3 | v4 | Notes |
|---|---|---|---|---|
| `pnpm astro check` | ✅ PASS | ✅ PASS | ✅ PASS | Consistent across all loops |
| `pnpm eslint .` | ❌ Not run | ❌ Not run | ❌ Not run | Not run once after v1 — 9 v1-introduced errors persist |
| `pnpm build` | ❌ Not run | ❌ Not run | ❌ Not run | Pre-existing Prisma 7 failure, but should verify it doesn't regress |
| Visual QA | ❌ | ❌ | ❌ | Never performed in the entire 4-loop cycle |
| Code review | ❌ | ❌ | ✅ v4 | First review at v4, found 2 issues |

### Review effectiveness (v4)
The v4 reviewer found:
1. **Regional Spanish "Hacé"** (line 1358): A UI copy policy violation that no automated check would catch. Demonstrates the value of a human review pass.
2. **Hash handler missing 'preparacion'** (line 1543): A functional bug — navigating to `#preparacion` directly wouldn't activate the tab. A subtle routing gap the builder missed.

These are both real findings. The review was effective.

However, the review was **limited in scope**:
- Only checked v4 changes (not the full cumulative state)
- Did not run commands (tooling constraint)
- Did not re-check ESLint or visual rendering

### What was missed
- The 9 ESLint errors from v1 are still present after 4 loops
- No visual verification that the 5 original fixes + all rework actually render correctly
- The reviewer's "should-fix" items may or may not have been applied — no follow-up record exists

## Recommendations

| Priority | Recommendation | Reason |
|---|---|---|
| **P0** | Document the permanent workaround for `[bracket].astro` in edit tool — use the `edits` array parameter | Every single builder in this cycle (4/4) encountered this issue. Each found a different workaround. The `edits` array parameter is the correct one (proven in v4). Document in AGENTS.md or as a builder-prompt instruction: "When editing `[bracket].astro` files, use the `edits` batch parameter array instead of `filePath`+`oldString`+`newString` to avoid glob matching on brackets." |
| **P0** | Require `pnpm eslint . --no-ignore apps/web/src/pages/recipes/[recipe].astro` as a mandatory builder gate, not a deferrable | ESLint was never re-run after v1. 9 new errors introduced in v1 persist after 4 build loops. Builders should run eslint on every changed file and report the result. Remove the "pre-existing" vs "new" classification ambiguity by running eslint before AND after changes. |
| **P1** | State file updates must be automated as part of the agent-completion protocol | The state file was updated only once (v1) and became the single source of truth for the cycle's final state even though it only reflects v1. Every builder/validator/reviewer completion should trigger a state file update with their results. This can be a minimal post-run step. |
| **P1** | Require review early in the cycle — at minimum on v1, not deferred to v4 | The v1 closer recommended "mandatory code review for any non-trivial rework loop." But review should happen even on the initial implementation, not only on rework loops. A review on v1 would have caught: (a) preparación tab hidden in edit mode, (b) conditional tab UX issue, (c) stale PresentationFixedCosts. Cost: 3 rework loops avoided. |
| **P2** | Add a pre-build eslint CI check to prevent ESLint-regressing changes from being accepted | The only reason 9 ESLint errors persist is that no automated gate blocks ESLint failures. Until CI is set up, the builder should be required to run eslint on changed files and either fix or explicitly justify each error. |
| **P2** | Create a builder prompt rule: "When a tool fails, run the fallback procedure from the task file, not an ad-hoc script" | The v3 Python script regression is the exact failure mode the v1 closer warned about. Builders should have a documented tool-failure escalation path: (1) re-read the task file for fallback instructions, (2) try the `edits` batch parameter, (3) try `sed`/Node.js inline, (4) last resort: create a temp file and rename. Never a Python script on the main source file. |
| **P2** | Record reviewer findings as resolved or not before closing a cycle | The v4 reviewer found 2 should-fix issues. The state file has no record of whether they were fixed. The final closer should verify or at minimum document the disposition. |
| **P3** | Remove the 4 false "pre-existing" claims from builder reports across the cycle | v2 builder claimed `fixedCostCardHtml` hints and ESLint errors were "pre-existing" — they were new. This misclassification propagates uncertainty. Builders should run eslint on the unchanged file first to establish a baseline, then report diffs. |

## Future-Run Memory

### Reusable facts
- The `edit` tool's `edits` batch parameter (array of `{ oldString, newString }` objects) bypasses the glob-matching issue with bracket filenames like `[recipe].astro` — use this instead of `filePath`+`oldString`+`newString` syntax for such files. (Source: v4 builder report, line 65-66.)
- A Python script was used in v3 to edit `[recipe].astro` and reverted/corrupted file contents. Python file-processing can silently mangle Astro/TSX template syntax. Use Node.js or sed for text replacement in .astro files, never Python. (Source: v4 task description, line 5.)
- The recipe page hash-change handler at line ~1543 has a hardcoded array `['ingredientes', 'costos-fijos', 'presentaciones']` that omits `'preparacion'` — any new tab must update both `tabIds` (line ~1520) AND the hash-change listener. (Source: v4 reviewer, finding 2.)
- "Hacé" (vos-form imperative) violates the UI copy policy. Use "Haz" for standard imperative. The empty state copy on the Preparación tab line ~1358 was flagged. (Source: v4 reviewer, finding 1.)
- `design-system-verify` skill was successfully used for the first time in the cycle by the v4 reviewer and correctly detected the regional Spanish violation. This confirms the skill works for UI copy policy enforcement.

### Reusable risks
- **ESLint errors become permanent once deferred**: 9 errors introduced in v1 were never fixed across 4 subsequent build loops. Every new builder inherited them from the previous one. Without a mandatory eslint gate, builders naturally skip it. Once deferred, ESLint errors are effectively permanent.
- **State file becomes single point of truth decay**: The state file was last updated at v1. Subsequent agent runs have no record. If a future task reads this state file as context, it will get an incomplete picture.
- **Bracket-filename issue is guaranteed to recur**: Every single builder in this cycle hit the same problem. The workaround is known (`edits` batch parameter) but undocumented — the next task on `[recipe].astro` will rediscover it from scratch.

### Do not reuse
- The v3 builder's claim that "No blockers — edits applied via Python script" was incorrect. The script corrupted the file. Do not trust "Python script worked" claims without verification.
- The v2 builder's claim that `fixedCostCardHtml` hints were "pre-existing" — the v1 validator correctly reclassified them as new.
- The state file's `validation` section — it only covers v1 and is misleading if interpreted as the cycle's final validation status.

### Suggested memory lookup keys
- `edit-tool-bracket-filename-workaround` — permanent workaround for `[bracket].astro` in edit tool
- `eslint-gate-missing` — ESLint regressions become permanent when deferred
- `state-file-update-protocol` — state must be updated after every agent run
- `review-timing-early-vs-late` — first review should be on v1, not v4
- `python-script-regression` — Python text processing on .astro files is risky
- `design-system-verify-copy-policy` — skill detects regional Spanish violations

## Final Verdict

**needs-process-fix** — The cycle shows incremental improvement (review finally happened) but the core issues from the v1 closer were not fixed:

1. **Bracket-filename pattern still unaddressed**: 4/4 builders hit it, 3 different workarounds were tried (Node.js, Python, `edits` array). The working workaround (`edits` array parameter) needs to be documented and made the default procedure. This is now **P0** because it creates a recurring tool-failure escalation path that has already caused a file corruption (v3).

2. **ESLint gate is systematically skipped**: After v1, no builder ran eslint. 9 errors persist across 4 build loops. This is a protocol gap: builders should not complete without running eslint on changed files.

3. **State file decay after first update**: The state file became permanently stale after v1. A structural fix is needed — either automate state updates on agent completion, or enforce it as a step in the builder/reviewer protocol.

The v4 review was a genuine improvement — it caught real issues, used the correct skills (`design-system-verify` + `ponytail-review`), and provided actionable findings. This shows the process CAN work when followed. The gap is that the review happened last instead of first.
