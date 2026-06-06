# Synthesis: Fix fire-and-forget cache invalidation across all DB modules
**Date**: 2026-06-04
**File**: docs/tasks/task-20260604-cache-invalidation-synthesis.md
**Prior syntheses**:
- `docs/tasks/task-20260604-ingredient-csrf-synthesis.md` (CSRF missing field fix)
- `docs/tasks/task-20260604-sequence-fix-synthesis.md` (PostgreSQL sequence fix)

## Accomplished

### Cache invalidation fix (this synthesis)
- **Explorer diagnosis** (`docs/analysis/analysis-20260604-table-not-updating.md`): Identified root cause of stale data after ingredient save — fire-and-forget cache invalidation (`cacheSet(key, undefined, 0)` without `await`), compounded by `JSON.stringify(undefined)` silently skipping the `value` field in Prisma upserts. Catalogued the same broken pattern across all 4 DB modules (`ingredients.ts`, `recipes.ts`, `presentations.ts`, `billing.ts`). Recommended replacing `cacheSet(key, undefined, 0)` with `cacheDelete()` and making all invalidation functions async.
- **Implementer** (`task-20260604-fix-cache-invalidation-report.md`): Fixed all 4 modules — made each invalidation function `async`, replaced `cacheSet(key, undefined, 0)` with `await cacheDelete(key)`, added `await` at every call site (12 sites total across 4 modules). Verified with `pnpm astro check` (0 errors) and `pnpm eslint .` (0 new errors).
- **Reviewer** (`task-20260604-review-cache-invalidation-report.md`): Confirmed all changes, grepped every `cacheDelete`/`cacheSet` call — zero fire-and-forget calls remain. Passed verification. Noted residual risk: future contributors must follow the async pattern.

### Prior rounds in this session
1. **CSRF missing field fix** — desktop ingredient form was missing `_csrf` hidden input (one-line fix)
2. **PostgreSQL sequence fix** — `ingredients_id_seq` never advanced past explicit seed IDs; fixed in `seed.ts` and created `prisma/fix-sequences.ts` (one-off repair script)

## Gaps

### 1. No formal plan for any of the 3 bugfixes
All three fixes (CSRF, sequences, cache invalidation) were executed from inline instructions without plan files in `plans/`. The sequence fix and cache invalidation fix both spanned multiple files and modules — they would benefit from tracked plans. This was already flagged in both prior syntheses and remains unaddressed.

### 2. Cache invalidation pattern not documented in AGENTS.md
There is no documentation in AGENTS.md about the cache invalidation convention:
- "Always `await` cache operations" — not stated
- "Use `cacheDelete()` for invalidation, not `cacheSet(key, undefined, 0)`" — not stated
- The residual risk flagged by the reviewer ("future contributors must follow the async pattern") is a documentation gap

### 3. Vercel serverless freeze-after-response not documented
The analysis (`analysis-20260604-table-not-updating.md:70`) calls out: Vercel may freeze the function after sending a response, making fire-and-forget promises unreliable. This is an operational invariant that should be in AGENTS.md under "Operational gotchas" but is absent.

### 4. Implementer verification is inconsistent
The CSRF implementer skipped verification (`pnpm astro check`, `pnpm eslint .` not run). The sequence fix implementer and cache invalidation implementer both ran it. The implementer.md already mandates verification (Step 5, verification checklist), but compliance is not enforced — the agent chose to skip it for a "trivial" change. The agent file should emphasize: **ALWAYS** run verification, regardless of perceived triviality.

### 5. No cross-reference to cache module in AGENTS.md "Modules you might miss"
`src/lib/cache.ts` is not listed in the "Modules you might miss" section despite being a critical shared module used across 4 DB files.

## Improvements

### Agent files
- **`.opencode/agents/implementer.md`** — Two recommendations from the CSRF synthesis that remain unapplied:
  1. Strengthen the verification step: replace "Verify" with "**ALWAYS verify** — run `pnpm astro check` and `pnpm eslint .` after every change. No exceptions for trivial edits."
  2. For inline tasks without formal task files, create a minimal tracking doc in `docs/tasks/`.

- **`.opencode/agents/reviewer.md`** — One recommendation from the sequence fix synthesis that remains unapplied:
  1. Add to the review checklist: "Deploy pipeline integration — if the change creates a new script or data migration, verify it's called from `vercel-build` in AGENTS.md or integrated into `seed.ts`/`fix-failed-migration.ts`."

### Project docs
- **`AGENTS.md`** — Under "Operational gotchas", add:
  > **Cache invalidation**: All cache operations (`cacheSet`, `cacheDelete`) must be `await`ed. Never fire-and-forget. In Vercel's serverless environment, the function may be frozen after sending the response. Use `cacheDelete()` for invalidation (not `cacheSet(key, undefined, 0)` — the `undefined` value is silently ignored by Prisma).

- **`AGENTS.md`** — Add `src/lib/cache.ts` to "Modules you might miss" section.

- **`AGENTS.md`** — From the sequence fix synthesis (still unapplied):
  1. Under `vercel-build`, add `fix-sequences.ts`: `pnpm exec tsx prisma/fix-sequences.ts` after `fix-failed-migration.ts`.
  2. Document the sequence-reset-after-seed pattern under a new "Database" or "Seed data" subsection.

## Orchestrator notes

### Unremediated recommendations from prior syntheses

Three syntheses have been written in this session. Every recommendation from the first two (CSRF and sequence fix) remains unapplied:

| Recommendation | Source | Status |
|---|---|---|
| Add verification-after-edit to implementer.md | CSRF synthesis | Not applied |
| Lightweight task template for ad-hoc fixes | CSRF synthesis | Not applied |
| Commit `fix-sequences.ts` to git | Sequence fix synthesis | Not applied |
| Add `fix-sequences.ts` to `vercel-build` in AGENTS.md | Sequence fix synthesis | Not applied |
| Document sequence-reset-after-seed in AGENTS.md | Sequence fix synthesis | Not applied |
| Add "deploy pipeline integration" to reviewer checklist | Sequence fix synthesis | Not applied |
| Merge `fix-sequences.ts` into `fix-failed-migration.ts` | Sequence fix synthesis | Not applied |
| Document cache invalidation pattern in AGENTS.md | This synthesis | New |
| Document Vercel freeze-after-response in AGENTS.md | This synthesis | New |
| Add `src/lib/cache.ts` to "Modules you might miss" | This synthesis | New |

None of these are implemented yet. The synthesis process produces recommendations but lacks a mechanism to ensure they are actioned.

### Process improvement: synthesis follow-through
Consider adding a step to the orchestrator's cycle: after each synthesis is produced, the orchestrator creates a lightweight follow-up task to apply the recommended changes to agent files and documentation. Without this, the synthesis is purely archival.

## Recommended actions

1. **Apply implementer.md improvements** — strengthen verification wording ("ALWAYS verify, no exceptions"), add guidance for inline task tracking.
2. **Apply reviewer.md improvement** — add "deploy pipeline integration" to review checklist.
3. **Update AGENTS.md** — document cache invalidation pattern, Vercel freeze caveat, add `src/lib/cache.ts` to modules list.
4. **Commit `fix-sequences.ts`** and add to `vercel-build` in AGENTS.md.
5. **Document sequence-reset-after-seed** in AGENTS.md.
6. **Create a process for synthesis follow-through** — either via orchestrator follow-up tasks or by giving the synthesizer implementation power for doc/agent changes (as stated in the synthesizer role: "Implement on approval").
