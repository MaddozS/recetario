# Analysis: Approved improvements (ponytail migration follow-ups)

Created: 2026-06-20 18:55
Orchestrator: orchestrator
Complexity: ajuste

## Source

Approves the top-3 suggestions from [task-20260620-1830-closer-analyze-ponytail-migration-report.md](../tasks/task-20260620-1830-closer-analyze-ponytail-migration-report.md).

## Approved suggestions

1. **Resolve dual-description of ponytail in orchestrator** (kitchcalc-orchestrator.md:221)
   - Line 221 lists `ponytail` under "Load relevant skills" as if it requires a `skill` tool load.
   - Lines 25, 805, 868 say it's auto-injected.
   - Fix: annotate line 221 with "(no skill load needed — auto-injected by ponytail plugin)".

2. **Make "Ponytail Review Pass" an action prompt in reviewer** (kitchcalc-reviewer.md:333-343)
   - The new section reads like documentation. Add an action-prompt line at the top.

3. **Rename "Skills Reference" table in orchestrator** (kitchcalc-orchestrator.md:796)
   - Table contains both skills (ponytail) and slash-command lenses (review/audit/debt). Rename header to "Skills & Lenses Reference".

## Files allowed to change

- `.opencode/agents/kitchcalc-orchestrator.md` (suggestions 1 and 3)
- `.opencode/agents/kitchcalc-reviewer.md` (suggestion 2)

## Out of scope

- All other files (5 other agent specs, `skills-lock.json`, `.agents/skills/`, source code).
- Any of the other 8 closer-analyze suggestions (ponytail skill file, cross-references in closer-analyze, process improvements).

## Acceptance criteria

- [ ] `kitchcalc-orchestrator.md` line ~221 annotated with "(no skill load needed — auto-injected by ponytail plugin)"
- [ ] `kitchcalc-orchestrator.md` "Skills Reference" table header renamed to "Skills & Lenses Reference"
- [ ] `kitchcalc-reviewer.md` "Ponytail Review Pass" section has an action-prompt opening line ("When reviewing any code change: run `/ponytail-review` first...")
- [ ] No other lines changed
- [ ] `grep -rn caveman .opencode/agents/` still returns 0 matches
