# Post-Mortem: Monorepo Refactor (T1-T12)

Date: 2026-06-20 19:30
Agent: kitchcalc-closer-analyze
Task File: docs/tasks/task-20260620-1718-closer-analyze-t13-post-mortem.md

## Metadata
- Files read: 15/15 (budget hit)
- Graphify queries: 0/3 (graph has 0 edges, skipped per historical precedent in T1-T12)
- Read discipline: obeyed

## Skills Used
- `caveman` (lite) — output compression
- (no other skills loaded — read-only analysis)

## Reports Read
1. `docs/tasks/task-20260620-1718-builder-t1-foundation-report.md`
2. `docs/tasks/task-20260620-1718-builder-t2-vercel-config-report.md`
3. `docs/tasks/task-20260620-1718-builder-t3-config-types-report.md`
4. `docs/tasks/task-20260620-1718-builder-t4-ui-spike-report.md`
5. `docs/tasks/task-20260620-1718-validator-t5-ui-spike-report.md`
6. `docs/tasks/task-20260620-1718-builder-t6-full-ui-extraction-report.md`
7. `docs/tasks/task-20260620-1718-builder-t7-db-package-report.md`
8. `docs/tasks/task-20260620-1718-builder-t8-auth-package-report.md`
9. `docs/tasks/task-20260620-1718-builder-t9-billing-package-report.md`
10. `docs/tasks/task-20260620-1718-builder-t10-middleware-final-report.md`
11. `docs/tasks/task-20260620-1718-reviewer-t11-semantic-report.md`
12. `docs/tasks/task-20260620-1718-validator-t12-operational-report.md`
13. `docs/analysis/analysis-20260620-1718-monorepo-refactor.md`
14. `docs/analysis/analysis-20260608-1200-agent-improvements.md`

## Scope
Read-only post-mortem of monorepo refactor (T1-T12, all PASS-with-caveats). Top-3 suggestions to improve agents, skills, code patterns, processes.

## Expected vs Actual

| Expectation (per analysis) | Actual | Match? |
|---|---|---|
| 6 packages created (db, auth, billing, ui, types, config) | All 6 created with content | ✅ |
| `apps/web/` holds Astro app | Yes, all source moved | ✅ |
| `db/billing.ts` cross-domain coupling split | Moved to `packages/billing/src/billing.ts` (T9) | ✅ |
| Prisma output path in `packages/db/` | Moved, `packages/db/generated/prisma/` | ✅ |
| Env var standardization (server: process.env, client: import.meta.env) | T11 verified — consistent | ✅ |
| No circular deps | T11 verified — strict layering (db → auth/billing) | ✅ |
| All 10 invariants preserved | T11 verified all 10 with evidence | ✅ |
| All tenant queries keep `ownerId` scoping | T11 audited 17+ queries, all scoped | ✅ |
| `.astro` components in workspace package | Validated by T4 spike, full extraction in T6 | ✅ |
| Pre-existing issues (Prisma SSR, ESLint, Prettier) NOT introduced by refactor | Confirmed pre-existing by T10 via `git show HEAD` | ✅ |
| All `@/lib/*` imports updated | T10 + T11 verified zero leftover for extracted modules | ✅ |
| Build works on Vercel | **Pre-existing Prisma SSR error blocks deploy** | ❌ |

## Checks Executed
### Pattern Detection
- Cross-cutting patterns: 4 found (single-quote imports, workspace dep wiring, missing READMEs, pre-existing issues repetition)
- Cross-session patterns: 2 found (graphify useless, agent spec debt)

### Report Quality
- All 12 reports have: Skills Used, Metadata (files read, graphify queries), Scope, Pre-Flight, Verification, Issues, Residual Risks, Conclusion
- T12 verdict format consistent with T10/T11: PASS-with-caveats + pre-existing table

## What Worked Well (Wins to Preserve)

1. **Spike-and-validate pattern (T4 → T5)**: Extract one component (Button.astro) first, validate end-to-end (build + type check + dev server + design system), then commit to full extraction. This de-risked the highest-risk operation (`.astro` in npm package). T6 then confidently moved 7 more components. This pattern should be the default for any new package extraction.

2. **Phased approach**: Foundation (T1-T3) → spike (T4-T5) → full UI (T6) → data layer (T7-T9) → integration (T10) → semantic review (T11) → operational validation (T12). Each phase built confidence incrementally. Foundation first (workspaces, turbo, vercel config) meant every subsequent task had a working monorepo to deploy into.

3. **Cross-subagent consistency verification (T10)**: T10 explicitly re-verified T6's "fix Layout.astro accent-colors" claim after T8/T9 reported the build as broken. Found it was a parallel timing artifact. This cross-checking caught a false negative and is exactly the kind of verification closer-analyze should do.

4. **OwnerId audit depth (T11)**: 17+ tenant queries audited independently by T7 and T11, all 10 spec invariants preserved with file:line evidence. The invariant list (recipe update $transaction, ingredient delete blocked, composite PK, etc.) provided a clear contract.

5. **Pre-existing issues documentation discipline**: T1, T3, T10, T11, T12 all explicitly documented the same 4 pre-existing issues (Prisma SSR, ESLint, Prettier, hints) with evidence (`git show HEAD:astro.config.mjs`). Made the "PASS-with-caveats" verdict trustworthy.

## What Could Be Improved (by Category)

### A. Agent Specs

1. **No "check parallel task state" step**: T6 fixed Layout.astro accent-colors. T8 and T9 ran in parallel and reported "pre-existing build break". T10 had to clean up. Builder spec should include: "Before reporting X is broken, grep for known fixes from parallel tasks in the spec's Task Dependencies table."

2. **"Files the Subagent May Create or Edit" lists are too narrow for monorepo work**: T4, T7, T8, T9 each had to modify `apps/web/package.json` to add `workspace:^` deps. T4 report explicitly notes "modifying it was necessary to make the build work." Lists should pre-authorize `package.json` updates for workspace dep wiring.

3. **No README requirement in builder spec**: T7 (db) said it created README but T10 found missing. T6 (ui) didn't create one. T10 had to create 4 missing READMEs. Every extraction task should require README creation as a verification step.

4. **Inconsistent "Skills Used" reporting**: T12 said "caveman not loaded — skill execution error". T1, T3, T4, T5, T6, T7, T8, T9, T10, T11 reported skills used including "loaded but not needed" entries. Skill loader should report failures centrally.

5. **"Pre-existing issues" boilerplate repetition**: 5 reports restate the same 4 pre-existing issues. A single `docs/pre-existing-issues.md` referenced by all tasks would reduce noise.

### B. Skills

1. **graphify skill is not useful for code dependency analysis**: All 12 reports say "graph has 0 edges, used grep fallback". Graph was built from design tokens, not code. Skill description should detect this and recommend `--mode deep` rebuild on `src/`. **Action item** in analysis report: "Rebuild graphify with `--mode deep` on `src/` before any future dependency-aware analysis." Not done.

2. **No monorepo-practices skill**: T1 discovered "@astrojs/check needs to be at root" from a real failure. T10 tried 5 fixes for Prisma SSR. A `monorepo-practices` skill would document: ESM resolution from pnpm store, workspace dep wiring, raw `.ts` export issues, pre-compilation strategies. Would save 6+ hours of rediscovery.

3. **No astro-monorepo / prisma-ssr skill**: T10's 5 attempted fixes for Prisma SSR are documented but the actual fix (pre-compile packages to JS) is not in any skill. A skill with the known root cause + 3 fix patterns would unblock Vercel deploy.

4. **Skills loaded but not used**: T1, T3, T6, T7, T8, T9, T10 all report "loaded X but didn't need it". Loading without using wastes context budget. Builder spec should say "load skills only when needed for current step."

5. **Domain skills worked well where used**: `prisma-client-api` (T7, T11), `better-auth-best-practices` (T8), `stripe-best-practices` (T9), `design-system-verify` (T4, T5, T6, T11). Each provided concrete value (env var patterns, hardcoded color check, etc.). Pattern: domain-specific skills with grep commands are the highest-value skill type.

### C. Code Patterns

1. **Single-quoted imports caused 5+ manual fix cycles**: T4, T6, T7, T8, T9 all hit `from '@/lib/...'` (single quotes) missed by double-quote `sed` patterns. Each task added 1-5 manual fixes. A pre-merge grep check (or a lint rule) for `from\s*'@/lib/...'` would prevent this.

2. **Workspace packages export raw `.ts` files**: T10's root cause analysis: "Every workspace package exports raw `.ts` files via 'main: ./src/index.ts'. This means Vite must process them, which conflicts with SSR bundling of Node.js-native deps." This is the Prisma SSR error's true cause. Resolution: compile packages to JS (`tsc --build` or `tsup`) and point `main`/`types`/`exports` to `dist/`.

3. **ESLint/Prettier root configs broken at T1**: `eslint.config.mjs` (flat config) and `.prettierrc` (JSON5) were left over from pre-monorepo. T3 created `.eslintrc.cjs` and `.prettierrc.json` per task spec, but old configs take precedence. T3 explicitly noted "inert — follow-up needed." Cleanup never happened. Lesson: when refactoring config, delete old configs in the same task.

4. **`apps/web/package.json` workspace dep wiring is manual and error-prone**: T4, T7, T8, T9 each had to add `workspace:^` dep + run `pnpm install` for the build to resolve the new package. The orchestrator should have added placeholder entries for all 6 packages in T1.

5. **`getPresentationById` public API without `ownerId`** (T11 flag): Pre-existing pattern, not introduced by refactor. Now lives in `packages/db` with a more visible public surface. Hardening pass should add `ownerId` param. Cross-references: `packages/db/src/presentations.ts:211`.

6. **`@astrojs/check` and `typescript` needed at root** (T1 fix): pnpm ESM resolution from store can't find these if only in `apps/web/`. Standard monorepo pattern, but T1 had to discover from a real failure. Documented in T1's issues section.

7. **No automated check for "no leftover `@/lib/*` for extracted modules"**: T7, T8, T9 each manually grep'd 18-20 files. T10 did final verification. A pre-merge check (CI hook or task verification step) would prevent misses.

### D. Process

1. **Parallel task race conditions** (T6 fix vs T8/T9 stale reports): T6 fixed accent-colors. T8 and T9 ran in parallel and saw pre-fix state. T10 cleaned up. Orchestrator should either: (a) run all extractions sequentially, (b) require parallel tasks to re-verify state at end, or (c) add a final consistency pass.

2. **Active work merge timing** (analysis recommendation): Analysis recommended merging `006-password-reset-flow` first. Refactor proceeded. Branch state not verified post-refactor. Should confirm branch was merged before T1.

3. **Visual QA deferred due to no `DATABASE_URL`** (T5, T12): Both validators report 500 errors on page render. They correctly defer visual QA to human. But there's no `docker-compose.yml` for local Postgres. Adding one would unblock visual validation for future refactors.

4. **Dev server "boot" test is weak**: All 12 reports only verify server starts, not that it serves HTML. A stronger gate: "server returns 2xx or 5xx with HTML body" (proves middleware ran, even if DB is unavailable).

5. **Spec quality gate (Phase 2) was effective**: T1 followed spec, T11 verified all 10 invariants. Spec-driven approach worked. The 10 invariants list (recipe update $transaction, ingredient delete blocked, composite PK, ownerId, etc.) provided a clear contract for validator and reviewer.

6. **Task dependency table was useful**: T12 had "Depends on: T11 PASS (verified)". Clear handoff gate. Pattern should be standard for every task file.

7. **`production_planner` feature flag not verified post-refactor**: Analysis recommended verifying during refactor validation. T11 verified all 12 `FREE_FEATURES` keys but didn't explicitly check `production_planner` (which gates `/produccion`).

## Cross-Session Patterns

1. **graphify useless for code dep analysis** (recurring): Monorepo analysis + T1-T12 all confirm. The graph was built from design tokens (10,650 nodes, 0 edges) and not from code. This is a project-level tech debt: rebuild graphify with `--mode deep` on `src/`. Recurs in: 2026-06-20 monorepo analysis, T1, T3, T6, T7, T8, T9, T10.

2. **Agent spec debt** (recurring from 2026-06-08 analysis): The earlier `agent-improvements` analysis identified 11 items. Monorepo refactor addressed: split reviewer into reviewer + validator. Did NOT address: orchestrator permissions too permissive, lack of spec quality gate before user, lack of circuit breaker manual, lack of skill location rule, lack of parallel code paths identification. **Recurring theme: agent spec debt accumulates faster than it's resolved.**

3. **Single-quote vs double-quote import pattern** (recurring across T4, T6, T7, T8, T9): Project uses both inconsistently. `sed` patterns only match one. This is a codebase-wide issue that will recur in every refactor. Fix: Prettier rule `singleQuote: true` (or a lint rule).

4. **Pre-existing issues table** (recurring): 5 reports restate the same 4 issues. Single source of truth would help.

5. **`@/lib/*` import pattern** (recurring): 18-20 consumer files per extraction. Manual grep each time. Automate.

## Top 3 Suggestions (Most Impactful)

### Suggestion 1: Fix the Prisma SSR build error (Vercel deploy blocker)
**What**: Pre-compile workspace packages to JS. Currently `packages/{db,auth,billing,ui}` export raw `.ts` files, which Vite must process through its TypeScript pipeline, which conflicts with SSR bundling of Node.js-native deps (Prisma runtime). This is the documented root cause of the `"webcrypto" is not exported by "__vite-browser-external"` error that blocks Vercel deploy.

**Why matters**: The refactor is structurally complete but operationally broken for production. T10 tried 5 config fixes (all unsuccessful) and documented the real cause. Every future deploy attempt will fail until this is fixed. This is the single biggest blocker.

**How to implement**:
1. Add `tsc --build` to each package's `build` script (or use `tsup` / `tshy` for simpler config).
2. Update each `package.json` to point `main`, `types`, `exports` to `dist/` instead of `src/`.
3. Add `dist/` to `.gitignore` for each package.
4. Add `"build": "tsc"` to Turborepo pipeline (currently packages have no build step, only `apps/web` does).
5. Verify: `pnpm turbo run build` should complete without the Prisma SSR error.

**Impact**: HIGH. Unblocks Vercel deploy. Resolves the only "FAIL" item in the T12 verdict.

---

### Suggestion 2: Add monorepo-practices skill (prevent rediscovery)
**What**: Create a `monorepo-practices` skill (and/or add to existing project skills) that documents known monorepo gotchas and standard patterns for pnpm workspaces + Turborepo + Astro + Prisma.

**Why matters**: T1 spent time discovering "@astrojs/check needs at root for ESM resolution". T10 spent extensive time on Prisma SSR (5 attempted fixes, none worked). T4, T7, T8, T9 each had to figure out workspace dep wiring. A skill would save 6+ hours of rediscovery per refactor.

**How to implement**:
1. Create `.agents/skills/monorepo-practices/SKILL.md` with sections:
   - **Shared tooling at root**: `@astrojs/check`, `typescript`, `eslint`, `prettier` must be at root for pnpm ESM resolution
   - **Workspace dep wiring**: 3-step pattern (add `workspace:^` to consumer's `package.json`, run `pnpm install`, verify symlink)
   - **Raw `.ts` exports + SSR**: Why this breaks Prisma/Vite, when to pre-compile
   - **Single-quote import check**: grep pattern `grep -rEn "from\s*'@/lib/" apps/web/src/` to catch sed misses
   - **README requirement**: every package needs README with usage + env vars + peerDeps
   - **Pre-compilation strategies**: `tsc --build`, `tsup`, `tshy` comparison
2. Cross-reference from `kitchcalc-builder` and `kitchcalc-validator` specs.
3. Update `AGENTS.md` stack section to note the monorepo structure.

**Impact**: HIGH. Prevents 5+ known issues from recurring. Knowledge transfer to future refactors.

---

### Suggestion 3: Add pre-flight task template for extraction tasks (prevent manual fix cycles)
**What**: Standardize a "Pre-Flight Checklist" section in builder task files for any task that creates a new workspace package or extracts modules. Each checklist item is verified before the task marks PASS.

**Why matters**: T4, T6, T7, T8, T9 each had to add 1-5 manual fixes during their tasks. The fixes followed the same 4 patterns: (1) add workspace dep to consumer's `package.json`, (2) create/update package README, (3) grep for single-quote import misses, (4) check parallel task state for known fixes. Standardizing these as pre-flight steps would eliminate the back-and-forth.

**How to implement**:
1. Add to `kitchcalc-builder` spec:
   ```
   ## Pre-Flight Checklist (extraction tasks)
   - [ ] Add `workspace:^` dep to consumer's package.json (e.g., apps/web/package.json)
   - [ ] Run `pnpm install` to create symlink
   - [ ] Create or update package README (usage, env vars, peerDeps, exports)
   - [ ] grep -rEn "from\s*'@/lib/[module-name]'" apps/web/src/ — must return 0
   - [ ] Check Task Dependencies table for in-progress parallel fixes
   - [ ] grep for `apps/web/package.json` workspace dep is declared
   ```
2. Update task file template (in orchestrator's task creation script) to auto-include this section when `Task Type = extraction`.
3. Each checklist item is required; missing item = task fails verification.

**Impact**: MEDIUM-HIGH. Eliminates ~5-10 manual fix cycles per extraction. Makes parallel tasks more reliable (T6 vs T8/T9 race condition prevented).

## Process Recommendations for Future Refactors

1. **Add `docker-compose.yml` with Postgres** — unblocks visual QA for future refactors (T5, T12 both deferred).
2. **Create `docs/pre-existing-issues.md`** — single source of truth, referenced by all tasks. Avoid 5x restating.
3. **Add `pnpm check:imports` script** — grep for `@/lib/[module]` patterns + `from\s*'@/lib/`, returns non-zero if found.
4. **Add CI step for "no leftover imports"** — runs after every refactor extraction.
5. **Run extractions sequentially OR add cross-task consistency pass** — prevents T6 vs T8/T9 race conditions.
6. **Strengthen dev server gate** — "server returns HTML body" not just "boots".
7. **Rebuild graphify with `--mode deep`** — before next dependency-aware refactor. Code graph would catch cycles, find consumers, validate extraction.
8. **Pre-authorize `package.json` modifications in task allowlists** — for workspace dep wiring, every extraction will need it.
9. **Verify `production_planner` feature flag in any auth/billing refactor** — analysis recommended, T11 didn't explicitly check.
10. **Document `db/billing.ts` → `packages/billing/` history in billing package README** — context for future maintainers.

## Long-Term Tech Debt (Out of Scope for This Refactor)

1. **`getPresentationById` public API without `ownerId`** (`packages/db/src/presentations.ts:211`): Pre-existing. Hardening pass needed.
2. **Internal helpers without ownerId** (`packages/db/src/ingredients.ts:183`, `packages/db/src/presentations.ts:194`): Pre-existing. Design smell but safe (called only from scoped functions).
3. **ESLint/Prettier root config cleanup**: Old `eslint.config.mjs` and `.prettierrc` still take precedence over T3's `.eslintrc.cjs`/`.prettierrc.json`. Not blocking development (apps/web has its own working config) but messy.
4. **11 astro check hints**: Deprecated `document.execCommand` (8), unused variables (3). Pre-existing.
5. **`production_planner` feature flag not explicitly verified post-refactor**.
6. **No Zod schemas**: Validation scattered across `helpers.ts`, inline in db modules, client-side. `packages/types/` is empty placeholder. Future work: add schemas incrementally.
7. **No Vitest setup**: AGENTS.md says "If tests are requested, propose Vitest". No tests in any package. Each package extraction is a chance to add basic tests.
8. **No automated check for `@recetario/*` import consistency**: e.g., some files may still use `@/lib/db/billing` patterns. T10 verified manually.

## Commands Executed
- (none — read-only analysis)

## Conclusion

**Verdict**: PASS for the closer-analyze task. The monorepo refactor itself was a PASS-with-caveats operationally (T12), and the closer-analyze successfully identified patterns and improvements.

**Top 3 suggestions ordered by impact**:
1. **Fix Prisma SSR build error** (HIGH) — unblocks Vercel deploy
2. **Add monorepo-practices skill** (HIGH) — prevents rediscovery
3. **Add pre-flight task template** (MEDIUM-HIGH) — eliminates manual fix cycles

**Wins to preserve**: spike-and-validate pattern (T4→T5), phased approach (foundation → spike → iteration), cross-subagent consistency verification (T10), ownerId audit depth (T11), pre-existing issues documentation discipline.

**Cross-session patterns**: graphify useless for code deps (recurring), agent spec debt (recurring from 2026-06-08), single-quote imports (recurring across 5+ reports), pre-existing issues boilerplate (5x repetition).

**Long-term tech debt** documented above — 8 items out of scope for this refactor.

Recommendation: Approve the top 3 suggestions and schedule them in the next approved-improvements mini cycle.
