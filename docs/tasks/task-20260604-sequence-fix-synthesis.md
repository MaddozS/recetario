# Synthesis: PostgreSQL sequence fix (second round of ingredient-creation bug)
**Date**: 2026-06-04
**File**: docs/tasks/task-20260604-sequence-fix-synthesis.md
**Prior synthesis**: docs/tasks/task-20260604-ingredient-csrf-synthesis.md (first round — CSRF fix)

## Accomplished

### Round 1 — CSRF fix (prior synthesis covers in detail)
- Missing `_csrf` hidden field added to desktop ingredient create form at `src/pages/ingredients.astro:287`
- Matches project-wide pattern (`value={Astro.locals.csrfToken || ""}`)
- Reported in `task-20260604-fix-ingredient-csrf-report.md`, reviewed in `task-20260604-review-ingredient-csrf-report.md`

### Round 2 — PostgreSQL sequence fix (this synthesis)
- **Explorer diagnosis** (`docs/analysis/analysis-20260604-ingredient-id-sequence.md`): Identified root cause — `ingredients_id_seq` never advanced past explicit seed IDs (1–34). After seed, `nextval()` returns 1, colliding with seeded ingredient. Also identified same vulnerability for `recipes_id_seq` and `recipe_presentations_id_seq`.
- **Seed script fix** (`prisma/seed.ts:82-91, 179-198`): Added `setval()` calls after ingredient and recipe upserts using `$executeRawUnsafe` with parameterized queries. Uses `if (maxId._max.id)` guard for empty-table safety.
- **One-off repair script** (`prisma/fix-sequences.ts`): Created and executed to fix existing database state. All three sequences advanced past their MAX(id).
- **Verification**: `pnpm astro check` (0 errors), `pnpm eslint .` (no new errors), script execution (all 3 `OK:` lines printed).
- Reported in `task-20260604-fix-sequences-report.md`, reviewed in `task-20260604-review-sequences-report.md`.

### Cross-round observation
Both fixes address the same symptom ("can't create ingredients"). The CSRF fix was necessary but insufficient — the deeper PostgreSQL sequence bug was the actual blocker. The CSRF block would have surfaced after the sequence fix in a fresh DB, or independently in different environments.

## Gaps

### 1. No plan file created for either fix
Neither the CSRF fix nor the sequence fix has a plan file in `plans/`. Both were executed from inline instructions. The CSRF synthesis already flagged this. For the sequence fix (multi-file, multi-script), the absence of a plan makes it harder for the orchestrator to trace intent vs. outcome.

### 2. `fix-sequences.ts` is untracked and not integrated into deploy pipeline
`docs/tasks/task-20260604-review-sequences-report.md:75` flags this: *"If this fix is meant to be deployed to production databases, it should be tracked and run as part of the deploy pipeline."*
- `fix-sequences.ts` is not in `git` tracking
- `AGENTS.md` `vercel-build` command does not include `pnpm exec tsx prisma/fix-sequences.ts`
- Without this, a fresh production database deploy (or a database restore) will still have broken sequences

### 3. Sequence-reset-after-seed pattern is undocumented in AGENTS.md
The pattern of calling `setval()` after explicit-ID inserts in seed scripts is not documented anywhere in AGENTS.md. A future developer adding a new autoincrement model with seed data will likely miss this step (as noted in `review-sequences-report.md:78`).

### 4. `fix-failed-migration.ts` exists but `fix-sequences.ts` was not co-located
Oddly, `prisma/fix-failed-migration.ts` already existed for running one-off SQL fixes during deploy, yet `fix-sequences.ts` was created as a standalone sibling rather than integrated. Either it should be merged into `fix-failed-migration.ts` (renamed to something more generic like `fix-database.ts`) or `fix-sequences.ts` should be tracked and called separately during `vercel-build`.

### 5. Explorer analysis not referenced in any task or plan
The analysis file (`analysis-20260604-ingredient-id-sequence.md`) is thorough but exists in isolation — no plan file references it, and the implementer was told about it via inline instruction. This is the same gap as #1.

## Improvements

### Agent files
- **`.opencode/agents/explorer.md`** — Already identified in CSRF synthesis as needing a "trace chain" step, but the explorer here did an excellent job and the analysis file is self-contained. No new improvement needed for this agent.

- **`.opencode/agents/implementer.md`** — Two improvements from the CSRF synthesis remain unapplied:
  1. Add mandatory verification step after edits (`pnpm astro check`, `pnpm eslint .`)
  2. For inline tasks without formal plans, create a minimal task tracking file in `docs/tasks/`

- **`.opencode/agents/reviewer.md`** — Add a "deploy pipeline integration" check to the review checklist: when reviewing a fix that creates a new script (like `fix-sequences.ts`), verify whether it needs to be added to `vercel-build` in AGENTS.md. The reviewer flagged the gap in the report but didn't have it in the checklist.

### Project docs
- **`AGENTS.md`** — Under the "Data invariants" or "Schema changes" section, add:
  > **Sequence reset after explicit-ID seed**: Any `prisma/seed.ts` upsert that passes an explicit `id` must call `SELECT setval('<table>_id_seq', $1, true)` after all upserts of that model, using `prisma.$executeRawUnsafe` with the max ID. The models currently affected are `Ingredient`, `Recipe`, and `RecipePresentation`.

- **`AGENTS.md`** — Under `vercel-build`, add `fix-sequences.ts` to the command:
  > After `prisma/fix-failed-migration.ts`, run `pnpm exec tsx prisma/fix-sequences.ts`

### Process
- **Inline bugfix procedure**: Consider adopting a standard: for any bugfix that spans more than one file or involves a new script, create a minimal plan file in `plans/` even if brief. The CSRF fix was one-line (acceptable without plan). The sequence fix modified 2 files and created 1 new file — it benefits from a plan.

## Orchestrator notes
- The CSRF synthesis (`task-20260604-ingredient-csrf-synthesis.md`) recommended adding "verification-after-edit" to `implementer.md`. The sequence fix's implementer **did** run verification — so the implementer can do it when instructed. The guidance still needs to be codified.
- The prior CSRF synthesis also recommended a lightweight task template for ad-hoc bug fixes. This is still open.
- No deferred suggestions from the settings-feedback-outcome plan are relevant here.

## Additional observations
- **Race with production deploy**: If a production database is restored from backup or provisioned fresh, the sequences will be desynced again. The `fix-sequences.ts` script needs to be run. This should be a deploy step, not an afterthought.
- **The explorer diagnosis was thorough** and correctly identified all three affected models. The analysis file could serve as a reference for future sequence-related debugging.

## Recommended actions
1. **Commit `fix-sequences.ts`** and add it to the `vercel-build` command in AGENTS.md (after `fix-failed-migration.ts`).
2. **Document the sequence-reset-after-seed pattern** in AGENTS.md under a new "Seed data" or "Database" subsection.
3. **Review and apply CSRF synthesis recommendations** to `.opencode/agents/implementer.md` (verification steps + task tracking for inline fixes).
4. **Add "deploy pipeline integration" to the reviewer checklist** — new scripts that fix database state must be called from `vercel-build` or `seed.ts`.
5. **Consider merging `fix-sequences.ts` into `fix-failed-migration.ts`** (renaming it to `fix-database.ts` or similar) so there's a single "database repair on deploy" script.
