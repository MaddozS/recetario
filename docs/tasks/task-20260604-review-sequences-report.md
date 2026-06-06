# Validation: PostgreSQL sequence fix review

Date: 2026-06-04
Reviewer: reviewer
Plan: N/A (analysis-driven fix)
Analysis: docs/analysis/analysis-20260604-ingredient-id-sequence.md
Tasks: N/A (inline task per implementer report)
Implementer Report: docs/tasks/task-20260604-fix-sequences-report.md

## Context Understood

The seed script (`prisma/seed.ts`) inserts ingredients and recipes with explicit IDs (ingredients: 1–34, recipes: 101–214). PostgreSQL's `SERIAL` autoincrement sequence (`ingredients_id_seq`, `recipes_id_seq`, `recipe_presentations_id_seq`) is never advanced past these explicit IDs. When a user creates a new ingredient via `createIngredient()`, PostgreSQL calls `nextval()` on the sequence, which returns 1 — colliding with the seeded row — causing a unique constraint violation.

## Scope

- `prisma/seed.ts` lines 82–91 and 179–198 — sequence reset after ingredient and recipe upserts
- `prisma/fix-sequences.ts` — one-off fix script for existing databases
- Verification: `pnpm astro check`, `pnpm eslint` on both files, execution of fix-sequences.ts

## Expected vs Actual

| Expectation (from plan/task) | Actual (from code) | Match? |
|---|---|---|
| `setval` for `ingredients_id_seq` in seed.ts | Present at lines 87–90, uses `$1` parameterized query with `$executeRawUnsafe` | ✅ |
| `setval` for `recipes_id_seq` in seed.ts | Present at lines 183–188, uses `$1` parameterized query | ✅ |
| `setval` for `recipe_presentations_id_seq` in seed.ts | Present at lines 194–198, uses `$1` parameterized query | ✅ |
| fix-sequences.ts runs 3 `setval` with `COALESCE(MAX(id), 1)` | Lines 14–17: all 3 sequences listed with inline subquery + COALESCE | ✅ |
| Both files follow existing PrismaPg adapter pattern | Both use `PrismaPg` from `@prisma/adapter-pg`, `new PrismaPg(connectionString)`, `new PrismaClient({ adapter })` | ✅ |
| `pnpm astro check` passes (0 errors) | 0 errors, 0 warnings, 60 hints (all pre-existing) | ✅ |
| `pnpm eslint` on both files — no new issues | No output (clean) | ✅ |
| Script executes successfully | All 3 `OK:` lines printed | ✅ |

## Checks Executed

### Pattern Compliance
- `setval` calls use parameterized query (`$1` placeholder) with `$executeRawUnsafe` — ✅
- Sequence resets placed AFTER all upserts of each type — ✅
- `fix-sequences.ts` uses `COALESCE((SELECT MAX(id) FROM ...), 1)` — safe for empty tables — ✅
- `PrismaPg` adapter pattern matches existing seed.ts — ✅

### Lint
- `pnpm eslint prisma/seed.ts prisma/fix-sequences.ts`: ✅ clean (no output, no issues)

### Astro Check
- `pnpm astro check`: 0 errors, 0 warnings, 60 hints (all pre-existing, same as implementer report)

### Execution
- `pnpm exec tsx prisma/fix-sequences.ts`: ✅ ran successfully
  ```
  OK: SELECT setval('ingredients_id_seq', COALESCE((SELECT MAX(id) FROM ingredients), 1))
  OK: SELECT setval('recipes_id_seq', COALESCE((SELECT MAX(id) FROM recipes), 1))
  OK: SELECT setval('recipe_presentations_id_seq', COALESCE((SELECT MAX(id) FROM recipe_presentations), 1))
  Sequences fixed successfully.
  ```

### Diff Inspection
- `git diff HEAD -- prisma/seed.ts`: shows exactly 3 sequence reset blocks added (ingredients, recipes, presentations), no other modifications
- `git status --short prisma/fix-sequences.ts`: shows as untracked new file (`??`) — expected

## Findings

### ✅ Passed
1. **All three sequences addressed** — `ingredients_id_seq`, `recipes_id_seq`, `recipe_presentations_id_seq` both in seed.ts and fix-sequences.ts
2. **Parameterized queries** — All `setval` calls use `$1` placeholders with Prisma's `$executeRawUnsafe`, preventing SQL injection
3. **Safe for empty tables** — seed.ts uses `if (maxId._max.id)` guard; fix-sequences.ts uses `COALESCE(..., 1)` — both approaches safe
4. **Correct placement** — seed.ts resets sequences AFTER all upserts, so MAX(id) reflects seeded data
5. **Existing pattern followed** — Both files use `PrismaPg` adapter pattern exactly as existing seed.ts does
6. **All verification commands pass** — `pnpm astro check`, `pnpm eslint`, and script execution all clean

### ❌ Issues
None found.

### 🔵 Observations
- The seed.ts uses an `if (maxId._max.id)` guard (skips if table empty) while fix-sequences.ts uses `COALESCE(..., 1)` inline. Both are correct — different idioms for the same goal.
- The report mentions `fix-sequences.ts` was created as a new file (untracked, not yet committed). If this fix is meant to be deployed to production databases, it should be tracked and run as part of the deploy pipeline.

## Residual Risks
- **Minimal**: If a new autoincrement model is added to the schema and seeded with explicit IDs in the future, the same pattern will need to be repeated. This is a documentation/coding-standards concern, not a bug in the current fix.

## Review Summary
PASS — All verification criteria met. The fix correctly addresses the PostgreSQL sequence desync after explicit-ID seeding for all three affected sequences.
