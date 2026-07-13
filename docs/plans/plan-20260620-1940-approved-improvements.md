# Mini Plan: Approved Improvements (T13 Suggestions)

Created: 2026-06-20 19:40
Orchestrator: orchestrator
Mini Analysis: docs/analysis/analysis-20260620-1940-approved-improvements.md
Parent Refactor: docs/plans/plan-20260620-1718-monorepo-refactor.md

## Goal

Implement the 3 approved suggestions from the T13 closer-analyze post-mortem:
1. Fix Prisma SSR build error (unblocks Vercel deploy)
2. Add monorepo-practices skill (prevent knowledge rediscovery)
3. Add pre-flight task template to kitchcalc-builder spec (eliminate manual fix cycles)

## Acceptance Criteria

See mini analysis for detailed acceptance criteria per suggestion.

## Task Dependencies

| Task | Depends On | Parallel-Safe | Agent |
|------|------------|---------------|-------|
| S1: Pre-compile packages to JS (Suggestion 1) | — | yes (with S2) | kitchcalc-builder |
| S2: Add monorepo-practices skill (Suggestion 2) | — | yes (with S1) | kitchcalc-builder |
| S3: Add pre-flight template (Suggestion 3) | — | yes (with S1, S2) | kitchcalc-builder |
| S4: Verify all 3 changes (combined) | S1, S2, S3 | — | kitchcalc-reviewer + kitchcalc-validator |

S1, S2, S3 are all independent — different files, no overlap. Can run in parallel.

## Tasks

### Task S1: Pre-compile packages to JS (Suggestion 1)

- **Agent**: kitchcalc-builder
- **Skills**: `prisma-client-api` (for understanding the Prisma client generation that needs to work with compiled output)
- **Summary**: Add `tsc --build` to each package, update `package.json` `main`/`types`/`exports` to point to `dist/`, update Turborepo pipeline.
- **Scope**: new + extends-existing
- **Pre-existing**: T1-T12 monorepo structure
- **Files**: see Mini Analysis for full list

**Technical steps**:
1. For each of `packages/{db,auth,billing,ui,types,config}/`:
   - Add `tsconfig.json` extending `@recetario/config/tsconfig.base.json` with `composite: true`, `outDir: "./dist"`, `rootDir: "./src"`
   - Add `tsconfig.build.json` extending `tsconfig.json` with the same settings (or just reference `tsconfig.json`)
   - Add `build` script: `tsc --build tsconfig.build.json`
   - Update `package.json`: `main` → `./dist/index.js`, `types` → `./dist/index.d.ts`, `exports` → `./dist/*` (or granular)
2. Update `turbo.json` to include `build` task for packages: `dependsOn: ["^build"]`, outputs `dist/**`
3. Update `.gitignore` to add `packages/*/dist/`
4. Remove SSR workaround attempts from T10 in `apps/web/astro.config.mjs` (the `ssr.noExternal` additions)
5. Run `pnpm install` (to install `typescript` if not already)
6. Run `pnpm turbo run build` — should now pass
7. Verify `pnpm astro check` still passes
8. Verify dev server still boots

**Note**: `packages/config` doesn't have `src/` (it has `tsconfig.base.json`, `eslint.base.cjs`, `prettier.base.json` as files, not TS source). May not need compilation — but should still have a consistent package structure.

### Task S2: Add monorepo-practices skill (Suggestion 2)

- **Agent**: kitchcalc-builder
- **Skills**: none
- **Summary**: Create `.agents/skills/monorepo-practices/SKILL.md` with sections documenting monorepo gotchas.
- **Scope**: new
- **Pre-existing**: none
- **Files**: `.agents/skills/monorepo-practices/SKILL.md` (new)

**Technical steps**:
1. Create `.agents/skills/monorepo-practices/SKILL.md` with sections:
   - **Overview**: What this skill covers
   - **Shared tooling at root**: Why `@astrojs/check`, `typescript`, `eslint`, `prettier` must be at root for pnpm ESM resolution
   - **Workspace dep wiring**: 3-step pattern (add `workspace:^` to consumer's package.json, run pnpm install, verify symlink)
   - **Raw .ts exports + SSR**: Why this breaks Prisma/Vite, when to pre-compile
   - **Single-quote import check**: grep pattern `grep -rEn "from\s*'@/lib/" apps/web/src/` to catch sed misses
   - **README requirement**: every package needs README with usage + env vars + peerDeps
   - **Pre-compilation strategies**: `tsc --build`, `tsup`, `tshy` comparison
   - **Cross-references**: links to other skills (prisma-client-api, better-auth-best-practices, stripe-best-practices)
2. Make sure the SKILL.md is loadable (has frontmatter if needed)

### Task S3: Add pre-flight template (Suggestion 3)

- **Agent**: kitchcalc-builder
- **Skills**: none
- **Summary**: Add a "Pre-Flight Checklist (extraction tasks)" section to `.opencode/agents/kitchcalc-builder.md`.
- **Scope**: extends-existing
- **Pre-existing**: `.opencode/agents/kitchcalc-builder.md` (current spec)
- **Files**: `.opencode/agents/kitchcalc-builder.md` (modify)

**Technical steps**:
1. Read current `.opencode/agents/kitchcalc-builder.md` to understand structure
2. Add a "Pre-Flight Checklist (extraction tasks)" section with:
   - Add `workspace:^` dep to consumer's package.json
   - Run `pnpm install` to create symlink
   - Create or update package README (usage, env vars, peerDeps, exports)
   - grep -rEn "from\s*'@/lib/[module-name]'" apps/web/src/ — must return 0
   - Check Task Dependencies table for in-progress parallel fixes
   - grep for `apps/web/package.json` workspace dep is declared
3. Reference this section from the agent's main task template (if applicable)

### Task S4: Verify all 3 changes (combined)

- **Agent**: kitchcalc-reviewer + kitchcalc-validator
- **Skills**: `prisma-client-api` (for S1 verification)
- **Summary**: Verify S1 + S2 + S3 changes are correct, in scope, and don't break anything.
- **Scope**: validation
- **Files**: as listed in Mini Analysis

**Verification**:
- S1: `pnpm turbo run build` passes (no Prisma SSR error), all packages compile
- S1: Astro check still passes
- S1: Dev server still boots
- S2: SKILL.md exists with all required sections
- S3: kitchcalc-builder.md has the pre-flight section
- No NEW issues introduced
- Only allowed files were changed

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Pre-compile breaks runtime behavior | High | Test build, dev server, and key user flows |
| Package.json exports refactor breaks consumer imports | High | Run astro check, verify all consumers resolve |
| Skill file is hard to discover | Low | Reference from agent specs (kitchcalc-builder, kitchcalc-validator) |
| Pre-flight template is too rigid | Low | Make it a checklist, not a hard gate |

## Retrospective

To be filled by orchestrator after Phase 7b completes.
