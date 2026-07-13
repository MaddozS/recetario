# Task S1+S2+S3: Approved Improvements (T13 Suggestions)
Agent: kitchcalc-builder
Date: 2026-06-20
Mini Analysis: docs/analysis/analysis-20260620-1940-approved-improvements.md
Mini Plan: docs/plans/plan-20260620-1940-approved-improvements.md
Current branch: dev

## Goal

Implement the 3 approved suggestions from the T13 closer-analyze post-mortem:
- **S1**: Pre-compile workspace packages to JS (fixes Prisma SSR build error, unblocks Vercel deploy)
- **S2**: Add `.agents/skills/monorepo-practices/SKILL.md` (documents monorepo gotchas)
- **S3**: Add pre-flight checklist section to `.opencode/agents/kitchcalc-builder.md`

This is a focused implementation task. After completing, the monorepo will:
- Build successfully (Vercel deploy unblocked)
- Have documented monorepo best practices
- Have pre-flight checks for extraction tasks

## Context

The monorepo refactor (T1-T12) is committed to dev (`f4a87bd`). The T13 closer-analyze identified 3 high-impact improvements. The user approved all 3.

**Pre-existing issues from refactor**:
- Prisma SSR build error blocks Vercel deploy
- ESLint/Prettier root configs broken (T1 residual, NOT in scope for this task)
- 11 astro check hints (NOT in scope)

**This task addresses**:
- S1: Prisma SSR error (root cause: raw .ts exports force Vite SSR processing of Prisma)
- S2: Knowledge gap (future refactors won't rediscover T1, T10, T7-9 lessons)
- S3: Process gap (no standardized pre-flight for extraction tasks)

## Task Scope

- **Type**: new + extends-existing
- **Pre-existing components**:
  - T1-T12 monorepo structure (committed)
  - `.opencode/agents/kitchcalc-builder.md` (current spec)
- **New deliverables**:
  - 6 packages with `tsconfig.json` + `tsconfig.build.json` + `dist/` output
  - Updated `package.json` for all 6 packages (main/types/exports)
  - Updated `turbo.json` (build task for packages)
  - Updated `.gitignore` (packages/*/dist/)
  - New `.agents/skills/monorepo-practices/SKILL.md`
  - Updated `.opencode/agents/kitchcalc-builder.md` (pre-flight section)

## Skills Required

- **prisma-client-api**: For understanding the Prisma client generation that needs to work with compiled output
- **ui-ux-pro-max** (optional): For skill file layout best practices

## Files the Subagent May Create or Edit

**Only the files listed below are in scope. The subagent MUST NOT create or edit any other file. If new files are needed, STOP and report back to the orchestrator.**

- [ ] `packages/db/package.json` — modify (add build script, update exports to dist/)
- [ ] `packages/db/tsconfig.json` — new (package-specific config)
- [ ] `packages/db/tsconfig.build.json` — new (build-specific config)
- [ ] `packages/auth/package.json` — modify
- [ ] `packages/auth/tsconfig.json` — new
- [ ] `packages/auth/tsconfig.build.json` — new
- [ ] `packages/billing/package.json` — modify
- [ ] `packages/billing/tsconfig.json` — new
- [ ] `packages/billing/tsconfig.build.json` — new
- [ ] `packages/ui/package.json` — modify
- [ ] `packages/ui/tsconfig.json` — new
- [ ] `packages/ui/tsconfig.build.json` — new
- [ ] `packages/types/package.json` — modify
- [ ] `packages/types/tsconfig.json` — new
- [ ] `packages/types/tsconfig.build.json` — new
- [ ] `packages/config/package.json` — modify (may stay config-only, no build)
- [ ] `turbo.json` — modify (add package build task)
- [ ] `.gitignore` — modify (add `packages/*/dist/`)
- [ ] `apps/web/astro.config.mjs` — modify (remove T10's ssr.noExternal workaround attempts)
- [ ] `apps/web/package.json` — modify (if needed for workspace dep wiring)
- [ ] `.agents/skills/monorepo-practices/SKILL.md` — new
- [ ] `.opencode/agents/kitchcalc-builder.md` — modify (add pre-flight section)
- [ ] `docs/tasks/task-20260620-1940-builder-s123-approved-report.md` — the report file (mandatory)

## Technical Steps

### Phase A: S1 — Pre-compile packages to JS

1. **Load skill**: `prisma-client-api`

2. **Read current package.json files** for all 6 packages to understand current exports/main/types config.

3. **Add tsconfig.json to each TS package** (db, auth, billing, ui, types):
   - Extend `@recetario/config/tsconfig.base.json`
   - Set `composite: true` (for project references)
   - Set `outDir: "./dist"`
   - Set `rootDir: "./src"`
   - Set `declaration: true` (generate .d.ts files)
   - Set `declarationMap: true` (for go-to-source)

4. **Add tsconfig.build.json to each TS package**:
   - Extend `./tsconfig.json`
   - Same settings (or just use tsconfig.json directly)

5. **Update each TS package's package.json**:
   - Add `"build": "tsc --build tsconfig.build.json"` script
   - Change `main` from `./src/index.ts` to `./dist/index.js`
   - Change `types` from `./src/index.ts` to `./dist/index.d.ts`
   - Update `exports`:
     - `"."`: `"./dist/index.js"` (with `types: "./dist/index.d.ts"`)
     - Individual component paths: update to `"./dist/Button.js"` etc.
   - Add `"files": ["dist"]` (instead of `["src"]`)

6. **Special case for `packages/db`**:
   - Prisma client is generated to `packages/db/generated/prisma/` (raw TS, set in T7)
   - This is a problem: compiled output needs to point to generated client
   - Option A: Compile prisma generated to JS too (add `prisma generate --no-engine` then compile)
   - Option B: Keep prisma generated as raw TS, point exports to generated/* (but then dist/index.js imports from generated/client.ts which is TS — won't work in production JS)
   - **Decision**: For now, the db package will be special — it has the Prisma client, which is special. The compiled output of `dist/` will import from `../generated/prisma/client.js` which is what Prisma generates. Need to verify that Prisma client output is `client.js` (not just `client.ts`).
   - Run `pnpm --filter @recetario/db exec prisma generate` and check what's in `generated/prisma/`. If it generates both `.ts` and `.js`, use `.js`. If only `.ts`, we need to compile those too.

7. **Special case for `packages/config`**:
   - This package has no TS source — just config files (tsconfig.base.json, eslint.base.cjs, prettier.base.json)
   - These are JSON/CJS, not TS — no compilation needed
   - But package.json should still expose them
   - May keep `main` as `.` (directory index) or update to point to nothing TS-related

8. **Update `turbo.json`** to add package build task:
   ```json
   {
     "tasks": {
       "build": {
         "dependsOn": ["^build"],
         "outputs": [".vercel/**", "dist/**", ".astro/**"]
       }
     }
   }
   ```
   - Already has `dependsOn: ["^build"]`
   - Already has `outputs: [".vercel/**", "dist/**", ".astro/**"]` (added `dist/**` in T1)
   - May need to also add `inputs` for caching

9. **Update `.gitignore`**:
   ```
   packages/*/dist/
   ```

10. **Update `apps/web/astro.config.mjs`**:
    - Remove any `ssr.noExternal` additions from T10 (T10 tried 5 different SSR configs, none worked; the pre-compile is the real fix)
    - Restore the original Astro config (or near-original)

11. **Install `typescript` at root** (if not already):
    ```bash
    pnpm add -Dw typescript
    ```
    - Already in apps/web/devDependencies, but root also needs it for `pnpm turbo run build` from the root

12. **Run `pnpm install`**:
    - Should pick up new package.json changes
    - Workspace symlinks should still resolve

13. **Run `pnpm turbo run build`**:
    - Should now:
      - Build each package (db, auth, billing, ui, types) in dependency order
      - Build apps/web last
      - Output goes to packages/*/dist/ and apps/web/.vercel/output/
    - **This should now PASS** (no more Prisma SSR error)

14. **Verify astro check**:
    ```bash
    pnpm --filter @recetario/web astro check
    ```
    - Should pass

15. **Verify dev server**:
    ```bash
    cd apps/web && timeout 15 pnpm dev
    ```
    - Should boot

### Phase B: S2 — Add monorepo-practices skill

16. **Create `.agents/skills/monorepo-practices/SKILL.md`** with these sections:
    - **Overview**: What this skill covers, when to load it
    - **Shared tooling at root**: Why `@astrojs/check`, `typescript`, `eslint`, `prettier` must be at root for pnpm ESM resolution
    - **Workspace dep wiring**: 3-step pattern
    - **Raw .ts exports + SSR**: Why this breaks, when to pre-compile
    - **Single-quote import check**: grep pattern
    - **README requirement**: every package needs README
    - **Pre-compilation strategies**: tsc, tsup, tshy comparison
    - **Cross-references**: links to prisma-client-api, better-auth-best-practices, stripe-best-practices
    - **Examples**: practical code samples for each section

17. **Verify the skill file** is loadable (has frontmatter if needed for the agent system to discover it).

### Phase C: S3 — Add pre-flight template

18. **Read current `.opencode/agents/kitchcalc-builder.md`** to understand structure.

19. **Add a "Pre-Flight Checklist (extraction tasks)" section** to the agent spec:
    - Add `workspace:^` dep to consumer's package.json
    - Run `pnpm install` to create symlink
    - Create or update package README (usage, env vars, peerDeps, exports)
    - grep -rEn "from\s*'@/lib/[module-name]'" apps/web/src/ — must return 0
    - Check Task Dependencies table for in-progress parallel fixes
    - grep for `apps/web/package.json` workspace dep is declared

20. **Reference the pre-flight section** from the agent's main task template (if there's one).

### Phase D: Verification

21. **Run full operational suite**:
    ```bash
    pnpm install
    pnpm turbo run build
    pnpm --filter @recetario/web astro check
    pnpm --filter @recetario/web dev (boot only)
    ```
    - Build should now pass (no Prisma SSR error)
    - Astro check should still pass
    - Dev server should still boot

22. **Verify the skill file is loadable**:
    - Check `.agents/skills/monorepo-practices/SKILL.md` exists
    - Check it has appropriate frontmatter (if the agent system requires it)

23. **Verify the agent spec has the pre-flight section**:
    - Open `.opencode/agents/kitchcalc-builder.md`
    - Confirm the "Pre-Flight Checklist (extraction tasks)" section exists

24. **Write report** to `docs/tasks/task-20260620-1940-builder-s123-approved-report.md` with:
    - **Skills Used**: list
    - **S1 result**: build pass/fail, dist/ outputs, exports working
    - **S2 result**: SKILL.md created with all sections
    - **S3 result**: agent spec updated with pre-flight section
    - **Verification**: all 4 checks pass
    - **Issues encountered**: any + how resolved
    - **Files modified**: list
    - **Files created**: list

## Expected Output

- **S1** (Prisma SSR fix): All 6 packages compile to dist/. `pnpm turbo run build` passes (no more webcrypto error).
- **S2** (monorepo-practices skill): `.agents/skills/monorepo-practices/SKILL.md` exists with all sections.
- **S3** (pre-flight template): `.opencode/agents/kitchcalc-builder.md` has pre-flight section.
- **Report**: `docs/tasks/task-20260620-1940-builder-s123-approved-report.md` with detailed results.

## Guardrails

- **DO NOT** commit changes (orchestrator/user will commit)
- **DO NOT** modify any other file outside the "Files the Subagent May Create or Edit" list
- **DO NOT** run `pnpm eslint .` or `pnpm format` (still broken pre-existing T1 residual)
- **DO NOT** fix the ESLint/Prettier issue (out of scope)
- **DO NOT** make changes to the Prisma schema or migrations
- **MUST** verify `pnpm turbo run build` passes after S1
- **MUST** verify `pnpm astro check` still passes
- **MUST** verify dev server boots
- **MUST** use `pnpm exec` or `pnpm dlx` for terminal commands
- **IMMUTABLE**: Never modify `docs/specs/`, `docs/plans/`, `docs/analysis/`, or other task files
- **SCOPE**: Never create files outside the "Files the Subagent May Create or Edit" list. If additional files are needed, STOP and report.
- **Read discipline**: Max 15 file reads. Should be ~12 reads (6 package.jsons + 1 turbo + 1 gitignore + 1 astro config + 1 agent spec + 1 skill file lookup).
