# Mini Analysis: Approved Improvements (T13 Suggestions)

Created: 2026-06-20 19:40
Orchestrator: orchestrator
Parent: docs/tasks/task-20260620-1718-closer-analyze-t13-post-mortem-report.md

## Approved Suggestions

The user approved all 3 top suggestions from the T13 closer-analyze post-mortem:

### Suggestion 1: Fix Prisma SSR build error (HIGH impact)
**What**: Pre-compile workspace packages to JS so Vite doesn't have to process raw `.ts` files during SSR bundling.
**Why**: Currently blocks Vercel deploy. T10 tried 5 config fixes (none worked). Root cause documented in T10's residual risks.
**Files allowed to change**:
- `packages/db/package.json` (add build script, update exports)
- `packages/auth/package.json` (add build script, update exports)
- `packages/billing/package.json` (add build script, update exports)
- `packages/ui/package.json` (add build script, update exports)
- `packages/types/package.json` (add build script, update exports)
- `packages/config/package.json` (add build script or mark as config-only)
- `packages/db/tsconfig.json` (new — package-specific config)
- `packages/auth/tsconfig.json` (new)
- `packages/billing/tsconfig.json` (new)
- `packages/ui/tsconfig.json` (new)
- `packages/types/tsconfig.json` (new)
- `packages/db/tsconfig.build.json` (new — extends base, outputs to dist/)
- `packages/auth/tsconfig.build.json` (new)
- `packages/billing/tsconfig.build.json` (new)
- `packages/ui/tsconfig.build.json` (new)
- `packages/types/tsconfig.build.json` (new)
- `turbo.json` (add package `build` task to pipeline)
- `.gitignore` (add `packages/*/dist/`)
- `apps/web/package.json` (may need to add `prepare` or similar)
- `apps/web/astro.config.mjs` (may need to remove SSR workaround attempts from T10)

### Suggestion 2: Add monorepo-practices skill (HIGH impact)
**What**: Create `.agents/skills/monorepo-practices/SKILL.md` documenting monorepo gotchas.
**Why**: T1, T10 had to discover things the hard way. Future refactors should benefit from this knowledge.
**Files allowed to change**:
- `.agents/skills/monorepo-practices/SKILL.md` (new)
- `.agents/skills/monorepo-practices/` directory (new — for skill subfiles if needed)

### Suggestion 3: Add pre-flight task template for extraction tasks (MEDIUM-HIGH impact)
**What**: Add a Pre-Flight Checklist section to `kitchcalc-builder` agent spec. Make it standard for extraction tasks.
**Why**: T4, T6, T7, T8, T9 each had to add 1-5 manual fixes during their tasks. Standardizing as pre-flight prevents this.
**Files allowed to change**:
- `.opencode/agents/kitchcalc-builder.md` (modify — add pre-flight checklist section)

## Acceptance Criteria

### For Suggestion 1 (Prisma SSR fix):
- [ ] `pnpm turbo run build` completes without the `"webcrypto" is not exported` error
- [ ] All packages have a `build` script that compiles `src/` to `dist/`
- [ ] All package `package.json` files have `main`/`types`/`exports` pointing to `dist/`
- [ ] `apps/web` imports from `@recetario/*` resolve to compiled JS, not raw TS
- [ ] Astro check still passes (0 errors)
- [ ] Dev server still boots
- [ ] No regression: pre-compiled output is functionally equivalent to raw TS

### For Suggestion 2 (monorepo-practices skill):
- [ ] `.agents/skills/monorepo-practices/SKILL.md` exists
- [ ] Has sections: Shared tooling at root, Workspace dep wiring, Raw .ts exports + SSR, Single-quote import check, README requirement, Pre-compilation strategies
- [ ] Cross-references to other skills (prisma-client-api, better-auth-best-practices, stripe-best-practices)
- [ ] Practical examples for each section

### For Suggestion 3 (pre-flight task template):
- [ ] `.opencode/agents/kitchcalc-builder.md` has a "Pre-Flight Checklist (extraction tasks)" section
- [ ] Checklist includes: workspace dep wiring, pnpm install, README creation, single-quote grep, parallel state check
- [ ] Section is referenced from the agent's main task template

## Out of Scope

Explicitly NOT part of this mini cycle:

1. **ESLint/Prettier root config cleanup** — pre-existing T1 residual, separate effort
2. **`getPresentationById` hardening** (ownerId param) — pre-existing pattern, separate hardening pass
3. **Internal helpers ownerId audit** (ingredients.ts:183, presentations.ts:194) — pre-existing design smell
4. **11 astro check hints cleanup** — pre-existing
5. **No Zod schemas / No Vitest setup** — long-term debt, separate efforts
6. **`docker-compose.yml` for local Postgres** — T13 process recommendation, not approved
7. **`docs/pre-existing-issues.md`** — T13 process recommendation, not approved
8. **Rebuilding graphify with `--mode deep`** — handled in separate Phase 9 task
9. **Physical API split (Option B from refactor analysis)** — explicitly rejected
10. **Second frontend** (admin/mobile) — explicitly rejected
11. **Better Auth / Prisma / Stripe version upgrades** — not part of refactor
12. **Test infrastructure** (Vitest) — not part of refactor
13. **Vercel deploy testing** — requires user action (deploy credentials, etc.)

## Verification

After implementation, verify with:
- `pnpm install` — workspace packages resolve
- `pnpm turbo run build` — should pass without Prisma SSR error
- `pnpm --filter @recetario/web astro check` — should still pass
- `pnpm --filter @recetario/web dev` — should still boot
- Check `.agents/skills/monorepo-practices/SKILL.md` is loadable
- Check `.opencode/agents/kitchcalc-builder.md` has the pre-flight section

## Estimated Time

- Suggestion 1 (Prisma SSR): 3-4 hours (build setup + testing)
- Suggestion 2 (skill): 1-2 hours (documentation)
- Suggestion 3 (template): 30 min (small spec change)
- Total: 4-6 hours

## Status

Ready for builder dispatch.
