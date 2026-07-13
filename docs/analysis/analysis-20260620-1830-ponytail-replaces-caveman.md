# Analysis Report: Replace caveman with ponytail across agent system

Created: 2026-06-20 18:30
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary

Replace all `caveman` references in the agent system with `ponytail` (the lazy senior-dev ruleset), and verify which `/ponytail*` commands are worth wiring into specific agents. Scope: live system only — historical `docs/plans/*` and `docs/tasks/*-report.md` stay untouched (immutable records).

## Target Location

- **Primary anchor(s)**: `.opencode/agents/*.md` (6 files), `.agents/skills/caveman/`, `skills-lock.json`
- **Layer**: agent specs + skill definitions + skill registry

## Surrounding Context

Ponytail is an OpenCode plugin installed via `../ponytail/.opencode/plugins/ponytail.mjs`. It auto-injects a ruleset into the system prompt at every turn (no `skill` tool load needed) and persists mode at `~/.config/opencode/.ponytail-active`. The plugin also registers `../ponytail/skills/` as a skills path, making the per-command skills discoverable.

`/ponytail*` is a **command family**, not a `skill` tool load. Commands are invoked via slash; the plugin persists mode; the ruleset is auto-injected.

Caveman is a pure text-compression skill. Ponytail is a **superset**: text compression (lite/full/ultra) + code lens (YAGNI → stdlib → native → one-line → minimum) + a `ponytail:` comment convention for intentional simplifications.

## Detected Caveman References (live system only)

| File | Line(s) | Context |
|------|---------|---------|
| `.opencode/agents/kitchcalc-orchestrator.md` | 25, 221, 805, 867, 869 | Skill priority header, skills list, Skills Reference table, Communication section + exceptions |
| `.opencode/agents/kitchcalc-builder.md` | 22, 71, 271, 396, 398 | Skill priority header, Start Here, Other constraints, Communication + exceptions |
| `.opencode/agents/kitchcalc-reviewer.md` | 33, 333, 335, 337, 358, 360 | Skill priority header, "Caveman Lite Mode" section header, Communication + exceptions (duplicated section) |
| `.opencode/agents/kitchcalc-validator.md` | 35, 60, 336, 338 | Skill priority header, Start Here, Communication + exceptions |
| `.opencode/agents/kitchcalc-closer-analyze.md` | 33, 67, 300, 302 | Skill priority header, Start Here, Communication + exceptions |
| `.opencode/agents/kitchcalc-explore.md` | 35, 63, 330, 332 | Skill priority header, Required Workflow, Communication + exceptions |
| `.agents/skills/caveman/SKILL.md` | (whole file) | Skill definition |
| `.agents/skills/caveman/README.md` | (whole file) | Skill README |
| `skills-lock.json` | 10–15 | `caveman` entry pointing to juliusbrussee/caveman |

Total: 6 agent specs, 2 skill files, 1 lock entry.

## Ponytail Command Evaluation

| Command | Worth wiring? | Maps to | Rationale |
|---------|---------------|---------|-----------|
| `/ponytail` (mode switch) | No (per-agent) | n/a | Plugin auto-injects; no per-agent wiring needed beyond the Communication section. |
| `/ponytail-help` | No | n/a | Reference card for the user. Subagents don't invoke. |
| `/ponytail-review` | **Yes — high value** | `kitchcalc-reviewer` | Lens = "over-engineering only, not correctness" (delete/stdlib/native/yagni/shrink tags). Adds a missing dimension to the current expected-vs-actual review. |
| `/ponytail-audit` | **Yes** | `kitchcalc-closer-analyze` | Whole-repo over-engineering audit. Fits the post-mortem "Patterns Detected" stage. |
| `/ponytail-debt` | **Yes** | `kitchcalc-closer-analyze` | Harvests `ponytail:` comments. Fits the "Approved Improvements" + rework audit stages. |
| `/ponytail-gain` | No | n/a | Scoreboard for the user. Subagents don't show this. |

Ponytail-lens verdict: skip `/ponytail-help` and `/ponytail-gain` — they don't add work to any subagent. The three `/ponytail-review|/audit|/debt` commands are the only ones with clear job-to-be-done.

## Per-Agent Wiring Plan

### `kitchcalc-orchestrator` (planning + dispatch)
- Communication section: replace caveman-lite with ponytail full mode + reference the ruleset
- Skills Reference table: drop `caveman` row, add a single `ponytail` row covering all agents
- Add a "Ponytail Mode" pointer to `/ponytail-review|/audit|/debt` for the three subagents that use them

### `kitchcalc-builder` (implementation)
- Communication section: replace caveman-lite with ponytail full + the code ladder (YAGNI → stdlib → native → one-line → minimum)
- Add: "Mark intentional simplifications with `// ponytail: <reason>` comments" (TS/JS) or `<!-- ponytail: -->` (Astro/MD)
- Add: "When the spec asks for a custom abstraction, first check if `Map`/`Set`/the platform does it"

### `kitchcalc-reviewer` (semantic review)
- Communication section: replace caveman-lite
- Add a "Ponytail Review Pass" section to the review checklist: scan modified code for the 5 ponytail-review tags (delete/stdlib/native/yagni/shrink) using `/ponytail-review` lens. Add findings under a "🟣 Ponytail" section in the Output format.
- Update the Output format template to include the new severity

### `kitchcalc-validator` (operational validation)
- Communication section: replace caveman-lite only. No new commands — this agent runs checks, not design review.

### `kitchcalc-closer-analyze` (post-mortem)
- Communication section: replace caveman-lite
- In the "Suggestions" section: add explicit guidance to recommend `/ponytail-audit` and `/ponytail-debt` runs when the cycle produced `ponytail:` comments, new abstractions, or speculative features
- Add a "Ponytail Patterns" subsection under "Patterns Detected" for over-engineering signals across cycles

### `kitchcalc-explore` (codebase research)
- Communication section: replace caveman-lite
- Add: "When exploring, challenge the spec with the ponytail ladder before recommending a new file/pattern"

## Codebase Patterns to Follow

- **Agent spec style**: All 6 agents follow the same skeleton (Skill & Instruction Priority → File-Based Communication → Required Workflow → Hard Constraints → Communication → Project Stack). Edits slot into existing sections, no new sections at the top level.
- **Skill reference table**: Lives only in the orchestrator spec at line 800–805. Other agents list skills inline.
- **Communication section**: Identical wording in 5 of 6 agents (orchestrator, builder, reviewer ×2, validator, closer-analyze, explore). The reviewer has a duplicated section ("Caveman Lite Mode" + "Communication") that should be collapsed to a single section.
- **Skill removal**: `.agents/skills/caveman/` has both `SKILL.md` and `README.md`. The directory should be removed entirely; the lock entry goes separately.
- **ponytail comment convention**: The plugin's source says `// ponytail: <reason>` is the marker. Astro/HTML uses `<!-- ponytail: -->`.

## Complexity Assessment

- **Decision**: ajuste
- **Rationale**: Mechanical replacement + bounded design additions. No new pages, routes, API, Prisma, or contracts. Touches only agent specs, one skill, and one lock entry.

## Dependencies & Prerequisites

- None. Ponytail plugin is already installed (`../ponytail/.opencode/plugins/ponytail.mjs`) and registered in `.opencode/opencode.json`. No env changes.

## Past Related Work

None. This is a first-time migration from caveman to ponytail.

## Out of Scope (explicit)

- `docs/plans/*.md` historical plans — immutable per orchestrator rules
- `docs/tasks/*-report.md` historical reports — subagent's authoritative output, immutable
- `docs/specs/*.md` historical specs — immutable
- `docs/analysis/*.md` historical analyses — immutable
- `graphify-out/graph.json` — generated artifact, regenerating has no value
- `.opencode/opencode.json` — does not reference caveman
- `AGENTS.md` — does not reference caveman

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Reviewer Output format change breaks downstream consumers | Medium | Update only the template; existing reports keep working. Reviewer is read-only. |
| Removing caveman skill before all subagents confirm they don't `skill` load it | Low | Grep verified: only 6 agent specs reference it; no source code or runtime code calls it. |
| `ponytail:` comments accumulate without debt tracking | Low | `/ponytail-debt` is wired into closer-analyze to harvest them. |
