# Task: Apply ponytail migration (caveman → ponytail)

Agent: kitchcalc-builder
Date: 2026-06-20
Analysis: [analysis-20260620-1830-ponytail-replaces-caveman.md](../../analysis/analysis-20260620-1830-ponytail-replaces-caveman.md)
Plan: [plan-20260620-1830-ponytail-replaces-caveman.md](../../plans/plan-20260620-1830-ponytail-replaces-caveman.md)

## Goal

Replace every `caveman` reference in the live agent system with `ponytail`. Delete the caveman skill and its lock entry. Wire `/ponytail-review|/audit|/debt` into the agents whose job matches (reviewer, closer-analyze).

## Context

Caveman is a text-compression-only skill. Ponytail is a superset: text compression (lite/full/ultra) + code lens (YAGNI → stdlib → native → one-line → minimum) + a `ponytail:` comment convention + a command family (`/ponytail`, `/ponytail-help`, `/ponytail-review`, `/ponytail-audit`, `/ponytail-debt`, `/ponytail-gain`).

Ponytail is loaded automatically by the `ponytail.mjs` plugin (registered in `.opencode/opencode.json`) which injects the ruleset at every turn and registers `../ponytail/skills/` as a skills path. No `skill` tool load is required.

Per-agent role mapping (from analysis):
- orchestrator, builder, explorer — write or propose code → full ponytail (output + code ladder)
- reviewer, validator, closer-analyze — read or run code → output style only

## Task Scope

- **Type**: extends-existing + delete
- **Pre-existing components**:
  - 6 agent specs at `.opencode/agents/*.md` (orchestrator, builder, reviewer, validator, closer-analyze, explore) — already contain a `## Communication` section and `caveman` mentions in their Skill Priority headers, Start Here / Required Workflow sections, and Skills Reference table (orchestrator only)
  - `.agents/skills/caveman/SKILL.md` and `.agents/skills/caveman/README.md` — to delete
  - `skills-lock.json` entry for `caveman` — to remove
- **New deliverables**:
  - All `caveman` references replaced with `ponytail`
  - Caveman skill directory removed
  - `ponytail` row in the orchestrator's Skills Reference table
  - "Ponytail Review Pass" section in reviewer (with 🟣 Ponytail line in Output format)
  - `/ponytail-audit` and `/ponytail-debt` guidance added to closer-analyze's Suggestions
  - `ponytail:` comment convention documented in builder
- **Dependencies**: none

## Skills Required

- none (literal find/replace + bounded additive copy; no domain skills apply)

## Files Involved

- `.opencode/agents/kitchcalc-orchestrator.md` — modify
- `.opencode/agents/kitchcalc-builder.md` — modify
- `.opencode/agents/kitchcalc-reviewer.md` — modify
- `.opencode/agents/kitchcalc-validator.md` — modify
- `.opencode/agents/kitchcalc-closer-analyze.md` — modify
- `.opencode/agents/kitchcalc-explore.md` — modify
- `.agents/skills/caveman/SKILL.md` — delete
- `.agents/skills/caveman/README.md` — delete
- `skills-lock.json` — modify (remove `caveman` entry)
- `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md` — create (report)

## Files the Subagent May Create or Edit

**Only the files listed below are in scope for this task.** The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.

- [ ] `.opencode/agents/kitchcalc-orchestrator.md` — replace caveman with ponytail (see per-file instructions below)
- [ ] `.opencode/agents/kitchcalc-builder.md` — replace caveman with ponytail + add `ponytail:` comment convention
- [ ] `.opencode/agents/kitchcalc-reviewer.md` — replace caveman with ponytail + add "Ponytail Review Pass" section + add 🟣 Ponytail line to Output format; collapse the duplicated "Caveman Lite Mode" + "Communication" sections into one
- [ ] `.opencode/agents/kitchcalc-validator.md` — replace caveman with ponytail
- [ ] `.opencode/agents/kitchcalc-closer-analyze.md` — replace caveman with ponytail + add `/ponytail-audit` and `/ponytail-debt` guidance in the Suggestions section
- [ ] `.opencode/agents/kitchcalc-explore.md` — replace caveman with ponytail
- [ ] `.agents/skills/caveman/SKILL.md` — delete
- [ ] `.agents/skills/caveman/README.md` — delete
- [ ] `skills-lock.json` — remove the `caveman` entry (lines 10–15)
- [ ] `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md` — report (mandatory, always present)

## Technical Steps

### Step 1: Per-file edits

For each of the 6 agent specs, apply the following edits in order. Use `edit` with `oldString`/`newString` or `edits` for batch replacements. Verify with `grep` after each file that no `caveman` remains.

#### `.opencode/agents/kitchcalc-orchestrator.md`

Edit 1 — Skill & Instruction Priority header (around line 25):

old:
```
2. **Agent-specific skills** — project skills (graphify, caveman, etc.)
```
new:
```
2. **Agent-specific skills** — project skills (graphify, ponytail, etc.)
```

Edit 2 — Load relevant skills list (around line 221):

old:
```
   - `caveman` — for concise communication
```
new:
```
   - `ponytail` — for concise communication + code lens (auto-injected by the ponytail plugin)
```

Edit 3 — Skills Reference table (around line 805):

old:
```
| `caveman` | all | Concise communication (lite mode) |
```
new:
```
| `ponytail` | all | Output style (lite/full/ultra) + code lens (YAGNI/stdlib/native/one-line/minimum). Auto-injected by the ponytail plugin. |
| `ponytail-review` lens | kitchcalc-reviewer | Over-engineering check (delete/stdlib/native/yagni/shrink tags). Complements expected-vs-actual review. |
| `ponytail-audit` lens | kitchcalc-closer-analyze | Whole-repo over-engineering audit. Fits the post-mortem's Patterns Detected stage. |
| `ponytail-debt` lens | kitchcalc-closer-analyze | Harvests `ponytail:` comments into a debt ledger. Fits the rework audit + Approved Improvements stages. |
```

Edit 4 — Communication section (around line 867):

old:
```
Use the `caveman` skill in **lite mode** for all output. Drop filler and hedging words. Keep articles and full sentences. Professional but tight.

**Clarity exceptions:** Auto-drop caveman for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume caveman lite after the clear part is done.
```
new:
```
Use **ponytail full mode** (auto-injected by the ponytail plugin at every turn) for both output style and the code ladder.

- **Output style**: drop filler and hedging words, keep articles and full sentences, professional but tight.
- **Code ladder** (applied when planning implementation work the builder will execute): YAGNI (does it need to exist at all) → stdlib (does the platform do it) → native (does the dependency do it) → one-line (can it be one line) → minimum (smallest thing that works).

**Clarity exceptions:** Auto-drop ponytail compression for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume ponytail full after the clear part is done.
```

#### `.opencode/agents/kitchcalc-builder.md`

Edit 1 — Skill & Instruction Priority header (line 22):

old:
```
2. **Agent-specific skills** — project skills (graphify, caveman, etc.)
```
new:
```
2. **Agent-specific skills** — project skills (graphify, ponytail, etc.)
```

Edit 2 — Start Here: Mandatory Skills (line 71):

old:
```
- `caveman` — lite mode for all output
```
new:
```
- `ponytail` — full mode (auto-injected). Output style + code lens (YAGNI → stdlib → native → one-line → minimum).
```

Edit 3 — Other constraints (line 271):

old:
```
2. **Use caveman lite** for all communication
```
new:
```
2. **Use ponytail full** for all communication — output style + code ladder; mark intentional simplifications with `// ponytail: <reason>` (TS/JS) or `<!-- ponytail: -->` (Astro/MD).
```

Edit 4 — Communication section (line 396):

old:
```
Use the `caveman` skill in **lite mode** for all output. Drop filler and hedging words. Keep articles and full sentences. Professional but tight.

**Clarity exceptions:** Auto-drop caveman for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume caveman lite after the clear part is done.
```
new:
```
Use **ponytail full mode** (auto-injected by the ponytail plugin at every turn) for both output style and the code ladder.

- **Output style**: drop filler and hedging words, keep articles and full sentences, professional but tight.
- **Code ladder** (apply before writing any new code): YAGNI (does it need to exist at all) → stdlib (does the platform do it) → native (does the dependency do it) → one-line (can it be one line) → minimum (smallest thing that works).
- **Mark intentional simplifications** with `// ponytail: <reason>` (TS/JS) or `<!-- ponytail: -->` (Astro/MD). The `/ponytail-debt` command harvests these.

**Clarity exceptions:** Auto-drop ponytail compression for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume ponytail full after the clear part is done.
```

#### `.opencode/agents/kitchcalc-reviewer.md`

Edit 1 — Skill & Instruction Priority header (line 33):

old:
```
2. **Agent-specific skills** — project skills (graphify, caveman, etc.)
```
new:
```
2. **Agent-specific skills** — project skills (graphify, ponytail, etc.)
```

Edit 2 — Replace the duplicated section. The reviewer has a "Caveman Lite Mode" section (line 333) and a "Communication" section (line 358) that say the same thing. Collapse them into a single "Communication" section that follows the ponytail pattern, and delete the duplicate.

Delete the "Caveman Lite Mode" block (lines 333–337, the section header and the 4 lines under it):
```
### Caveman Lite Mode

Use the `caveman` skill in **lite mode** for all output. Drop filler and hedging words. Keep articles and full sentences. Professional but tight.

**Clarity exceptions:** Auto-drop caveman for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume caveman lite after the clear part is done.
```

Replace the "Communication" block (lines 357–360) with:
```
Use **ponytail full mode** (auto-injected by the ponytail plugin at every turn) for output style. Drop filler and hedging words, keep articles and full sentences, professional but tight. Reviewer does not write code, so the code ladder does not apply — but the **Ponytail Review Pass** below uses the `/ponytail-review` lens to flag over-engineering in the changes under review.

**Clarity exceptions:** Auto-drop ponytail compression for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume ponytail full after the clear part is done.
```

Edit 3 — Add a "Ponytail Review Pass" subsection under the existing review checklist. Find the "Astro-specific" subsection (around line 327) and append after it:

old (end of the Astro-specific checklist):
```
- [ ] Dialog backdrops use `backdrop:bg-backdrop/50`
- [ ] No Astro Actions (not used in this project)
```
new:
```
- [ ] Dialog backdrops use `backdrop:bg-backdrop/50`
- [ ] No Astro Actions (not used in this project)

### Ponytail Review Pass (over-engineering, not correctness)

Apply the `/ponytail-review` lens to the modified code. One finding per line, tagged with one of:

- `delete` — dead code or speculative feature
- `stdlib` — reinvented standard library
- `native` — dependency doing what the platform does
- `yagni` — abstraction with one implementation
- `shrink` — same logic, fewer lines

Use the format `L<line>: <tag> <what to cut>. <replacement>.` End with the net lines removable. If nothing to cut, write `Lean already. Ship.`
```

Edit 4 — Update the Output format template to include the new severity. Find the template (around line 339):

old:
```
### 🟡 Warning (should fix)
- `path/file.ts:N` — <issue> (suggested fix)

### 🔵 Info (nice to have)
- `path/file.ts:N` — <observation>
```
new:
```
### 🟡 Warning (should fix)
- `path/file.ts:N` — <issue> (suggested fix)

### 🔵 Info (nice to have)
- `path/file.ts:N` — <observation>

### 🟣 Ponytail (over-engineering)
- `L<line>: <tag> <what to cut>. <replacement>.` — derived from the `/ponytail-review` pass above
```

#### `.opencode/agents/kitchcalc-validator.md`

Edit 1 — Skill & Instruction Priority header (line 35):

old:
```
2. **Agent-specific skills** — project skills (graphify, caveman, etc.)
```
new:
```
2. **Agent-specific skills** — project skills (graphify, ponytail, etc.)
```

Edit 2 — Start Here: Mandatory Skills (line 60):

old:
```
- `caveman` — lite mode for all output.
```
new:
```
- `ponytail` — full mode (auto-injected). Output style only — validator runs commands, not code.
```

Edit 3 — Communication section (line 336):

old:
```
Use the `caveman` skill in **lite mode** for all output. Drop filler and hedging words. Keep articles and full sentences. Professional but tight.

**Clarity exceptions:** Auto-drop caveman for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume caveman lite after the clear part is done.
```
new:
```
Use **ponytail full mode** (auto-injected by the ponytail plugin at every turn) for output style. Drop filler and hedging words, keep articles and full sentences, professional but tight. Validator does not write code, so the code ladder does not apply.

**Clarity exceptions:** Auto-drop ponytail compression for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume ponytail full after the clear part is done.
```

#### `.opencode/agents/kitchcalc-closer-analyze.md`

Edit 1 — Skill & Instruction Priority header (line 33):

old:
```
2. **Agent-specific skills** — project skills (graphify, caveman, etc.)
```
new:
```
2. **Agent-specific skills** — project skills (graphify, ponytail, etc.)
```

Edit 2 — Start Here: Mandatory Skills (line 67):

old:
```
- `caveman` — lite mode.
```
new:
```
- `ponytail` — full mode (auto-injected). Output style + audit/debt lenses (see Suggestions).
```

Edit 3 — Communication section (line 300):

old:
```
Use the `caveman` skill in **lite mode** for all output. Drop filler and hedging words. Keep articles and full sentences. Professional but tight.

**Clarity exceptions:** Auto-drop caveman for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume caveman lite after the clear part is done.
```
new:
```
Use **ponytail full mode** (auto-injected by the ponytail plugin at every turn) for output style. Drop filler and hedging words, keep articles and full sentences, professional but tight. Closer-analyze does not write code, so the code ladder does not apply — but the **Suggestions** section below uses the `/ponytail-audit` and `/ponytail-debt` lenses to flag over-engineering patterns and `ponytail:` comment debt across cycles.

**Clarity exceptions:** Auto-drop ponytail compression for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume ponytail full after the clear part is done.
```

Edit 4 — Update the Suggestions section to recommend `/ponytail-audit` and `/ponytail-debt`. Find the Suggestions section (search for `## Suggestions` in the file). Add the following block as a new subsection under Suggestions, or after the existing Suggestions content:

```
### Ponytail lenses to recommend

When the cycle produced any of these signals, include the corresponding recommendation in the Approved Improvements section:

- **`ponytail:` comments present** in the modified code → recommend `/ponytail-debt` to harvest them into the debt ledger and add a follow-up to revisit each shortcut.
- **New abstractions, wrappers, or utilities** added without a second caller → recommend `/ponytail-audit` to surface other single-implementation abstractions repo-wide.
- **Speculative feature flags, helper modules, or config knobs** that no current call site uses → recommend a `/ponytail-review` of the diff and a deletion follow-up.
```

#### `.opencode/agents/kitchcalc-explore.md`

Edit 1 — Skill & Instruction Priority header (line 35):

old:
```
2. **Agent-specific skills** — project skills (graphify, caveman, etc.)
```
new:
```
2. **Agent-specific skills** — project skills (graphify, ponytail, etc.)
```

Edit 2 — Required Workflow skills list (line 63):

old:
```
   - `caveman` — concise communication
```
new:
```
   - `ponytail` — concise communication + code lens (auto-injected)
```

Edit 3 — Communication section (line 330):

old:
```
Use the `caveman` skill in **lite mode** for all output. Drop filler and hedging words. Keep articles and full sentences. Professional but tight.

**Clarity exceptions:** Auto-drop caveman for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume caveman lite after the clear part is done.
```
new:
```
Use **ponytail full mode** (auto-injected by the ponytail plugin at every turn) for both output style and the code ladder.

- **Output style**: drop filler and hedging words, keep articles and full sentences, professional but tight.
- **Code ladder** (apply when proposing new patterns or files in the explore report): YAGNI (does it need to exist at all) → stdlib (does the platform do it) → native (does the dependency do it) → one-line (can it be one line) → minimum (smallest thing that works). Challenge the spec before recommending a new file or pattern.

**Clarity exceptions:** Auto-drop ponytail compression for security warnings, irreversible action confirmations, and when compression creates technical ambiguity. Resume ponytail full after the clear part is done.
```

### Step 2: Delete the caveman skill

```
rm -rf .agents/skills/caveman
```

Verify: `ls -la .agents/skills/caveman 2>/dev/null` should return "No such file or directory".

### Step 3: Remove the `caveman` entry from `skills-lock.json`

Delete lines 10–15 (the `caveman` entry block, including the trailing comma on line 9 after the previous entry's closing brace). The resulting JSON should be valid (run `node -e "JSON.parse(require('fs').readFileSync('skills-lock.json','utf8'))"` to confirm).

Result: the file should start at the `business-analyst` entry and end at the `upgrade-stripe` entry, with no `caveman` block between them.

### Step 4: Verify

- `grep -rn caveman .opencode/agents/ .agents/skills/ skills-lock.json` should return zero matches.
- `grep -rn ponytail .opencode/agents/` should return matches in all 6 agent specs.
- `pnpm astro check` is NOT applicable here (no Astro/TS source changes). Skip.

## Expected Output

- **Code changes**: 6 agent specs modified + 1 skill directory deleted + 1 lock entry removed
  - `.opencode/agents/kitchcalc-orchestrator.md` (modified)
  - `.opencode/agents/kitchcalc-builder.md` (modified)
  - `.opencode/agents/kitchcalc-reviewer.md` (modified)
  - `.opencode/agents/kitchcalc-validator.md` (modified)
  - `.opencode/agents/kitchcalc-closer-analyze.md` (modified)
  - `.opencode/agents/kitchcalc-explore.md` (modified)
  - `.agents/skills/caveman/` (deleted)
  - `skills-lock.json` (modified, caveman entry removed)
- **Report**: `docs/tasks/task-20260620-1830-builder-ponytail-migration-report.md` with: each file changed (line ranges), each oldString/newString applied, the `grep` verification output, and any deviations from the instructions.

## Guardrails

- Do NOT touch historical docs: `docs/plans/*`, `docs/specs/*`, `docs/analysis/*`, `docs/tasks/*-report.md` (other than your own), `graphify-out/graph.json`.
- Do NOT touch source code under `src/`, `prisma/`, `package.json`, `.env`, `astro.config.mjs`, `pnpm-workspace.yaml`.
- Do NOT touch any other agent spec skill files (`.agents/skills/business-analyst/`, etc.).
- Do NOT modify `AGENTS.md`.
- Do NOT create new files outside the 10 files listed above.
- If any `oldString` doesn't match exactly (e.g. a comment, whitespace, or order difference), STOP and report the exact mismatch in the report file. Do not invent edits.
- If `skills-lock.json` JSON parsing fails after the edit, STOP and revert the file. Report the parse error.
- **IMMUTABLE**: Never modify spec files, plan files, analysis reports, or other task files.
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list.
