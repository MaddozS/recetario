# AGENTS.md — KitchCalc (Recetario)

## Stack

**Astro 6** SSR via `@astrojs/vercel`. **pnpm 11.1.2** (package-manager locked). **Node >= 22.12.0**.
No `.env.local` — use `.env`.

## Commands

**For manual terminal/tool invocations, always use `pnpm exec` or `pnpm dlx`** to respect pinned pnpm/Node version. Do not introduce other package runners in new instructions, docs, or one-off commands.

| Command                                 | Purpose                        |
| --------------------------------------- | ------------------------------ |
| `pnpm dev`                              | Dev server at `localhost:4321` |
| `pnpm build`                            | Production build               |
| `pnpm preview`                          | Preview build locally          |
| `pnpm format`                           | Prettier whole project         |
| `pnpm astro check`                      | Type-check `.astro` + `.ts`    |
| `pnpm eslint .`                         | Lint JS/TS/Astro               |
| `pnpm exec prisma migrate dev --name X` | Create migration               |
| `pnpm exec prisma generate`             | Regenerate client              |
| `pnpm exec prisma studio`               | Open Prisma Studio             |
| `pnpm exec tsx prisma/seed.ts`          | Run seed manually              |

**Schema changes**: When modifying `prisma/schema.prisma`, always create a new migration with `pnpm exec prisma migrate dev --name <descriptive>`. Never edit existing migration files.
**postinstall** generates the Prisma client automatically; if you need to run the same step manually, use `pnpm exec prisma generate`.
**vercel-build** runs Prisma generate, `prisma/fix-failed-migration.ts`, migrate deploy, and Astro build; if you need to reproduce it manually, use `pnpm exec prisma generate && pnpm exec tsx prisma/fix-failed-migration.ts && pnpm exec prisma migrate deploy && pnpm exec astro build`.

No app test infrastructure is established.
If tests are requested, propose `Vitest + @testing-library` and confirm with the user before scaffolding. Do not silently add a test framework.

## Architecture

### Auth

Better Auth via `src/lib/auth.ts` (server singleton) + `src/lib/auth-client.ts` (client). Google OAuth. Middleware (`src/middleware.ts`) populates `Astro.locals.{user, session, subscription}` on every request. `SubscriptionPlan` rows auto-seeded on first authenticated request (`globals.__plansSeeded` guard).

### Pages & routing

- **Protected** (`Astro.locals.session` required): `/recipes`, `/recipes/[recipe]`, `/ingredients`, `/settings`, `/settings/billing`, `/produccion`
- On protected pages, if `Astro.locals.session` is null, return `Astro.redirect("/sign-in")` at the top of the frontmatter.
- **Public**: `/sign-in`, `/sign-up`, `/pricing`
- `/produccion` also gated behind `production_planner` feature flag
- If the `production_planner` flag is false, redirect to `/settings/billing` with an upgrade prompt.
- Layout: `Layout` (app shell + sidebar) or `LandingLayout` (marketing). `currentPage` prop: `recipes | ingredients | settings | production`.

### Data layer

**PostgreSQL + Prisma ORM** with `@prisma/adapter-pg` + `pg.Pool` (max 3, 30s idle). Singleton in `src/lib/prisma.ts`.

- Output: `generated/prisma/` (non-standard — set in `schema.prisma:7`)
- Import via `@/lib/db/*` barrel (`index.ts`). Direct `@/lib/prisma` only for raw access.
- Multi-tenant: every record has `ownerId`. Scoped by `RECIPES_STATIC_OWNER_ID`/`EMAIL` env vars for seed users.
- CRITICAL: Every Prisma query over tenant data (`findMany`, `findFirst`, `update`, `delete`, `upsert`, `count`) MUST include `where: { ownerId: Astro.locals.user.id }` plus any additional filters, or it is a security bug. Reject PRs that omit this. New tenant records must set `ownerId` on create. Seed/bootstrap flows are the only exception.
- Seed data: `data/ingredients.json`, `data/recipes.json`. Loaded on first run via `seedIfNeeded()`.

### Key gotchas

#### Data invariants

- **MUST NOT VIOLATE** Recipe updates are destructive: the `$transaction` deletes all `RecipeIngredient` rows, then re-creates them.
- **MUST NOT VIOLATE** Ingredient deletes are blocked when the ingredient is referenced by any recipe (returns `{ status: "blocked", recipes: [...] }`).
- **MUST NOT VIOLATE** `RecipeIngredient` uses the composite PK `@@id([recipeId, ingredientId])`.
- **Feature flags**: 12 keys live in `FREE_FEATURES` (all false). Basic enables 5; Pro enables all 12.

#### Operational gotchas

- **Import paths**: use `@/lib/db/ingredients`, `@/lib/db/recipes`, `@/lib/db/billing`, etc.
- **Forms**: no Astro Actions. POST to the same page, read `Astro.request.formData()`, then redirect. Spanish locale: `parseNumberInput()` converts comma to dot.
- **Subscription cache**: middleware caches subscription state for 60s via `src/lib/cache.ts`.
- **pnpm allowed builds**: only `esbuild`, `sharp`, `@prisma/engines`, `prisma` are allowed in `pnpm-workspace.yaml`.
- **Vercel ephemeral**: always set `DATABASE_URL` for persistence.
- **Feedback + reload**: `showFeedback()` is client-side DOM; `window.location.reload()` after it erases feedback, so prefer DOM updates for in-page state.

#### Known bugs

- **Tsconfig exclude**: this is a known bug. Do NOT modify it unless explicitly asked. If asked, split it into separate array entries: `["dist", ".agent/**", ".astro/**", "node_modules/**", ".vercel/**"]`.

### Modules you might miss

- `src/lib/instructions-parser.ts` — markdown→HTML rendering for recipe instructions (parses headings, steps, `@ingredient` refs)
- `src/lib/html-sanitizer.ts` — DOMPurify wrapper for recipe instructions (limited tag/attr allowlist)
- `src/lib/formatters.ts` — exports `formatCurrency` and `timeAgo` (no `formatNumber`)
- `src/lib/form-utils.ts` — `parseNumberInput(value)` for Spanish-format decimals
- `src/lib/auth-client.ts` — client-side Better Auth (used for sign-in popup)
- `src/lib/sign-in.ts` / `src/lib/sign-out.ts` — Google sign-in with popup/open-in-tab + rate limiting
- `src/lib/dialog.ts` — `bindDialogBackdrop()` utility

### Stripe billing

3 routes in `src/pages/api/stripe/`:

- `checkout` (POST, auth) — creates Checkout Session, returns `{ url }`
- `portal` (POST, auth) — creates Customer Portal session
- `webhook` (POST, no session auth — verified via Stripe signature header using `STRIPE_WEBHOOK_SECRET`) — handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

API version: `2026-04-22.dahlia`.

## Client-side patterns

- **Binding guards**: `data-*-bound="1"` attributes prevent duplicate listener binding across SPA navigations
- **Lifecycle**: Bind on both `astro:page-load` and `astro:after-swap`
- **Theme**: `applyTheme()` reads `html.dataset.theme` / `html.dataset.accent`. No `.dark` CSS overrides — semantic tokens auto-adapt.
- **Accent colors**: 7 families (`indigo`, `violet`, `blue`, `emerald`, `rose`, `amber`, `coral`) in `src/lib/accent-colors.ts`. Landing layout always uses `coral`.

## UI conventions

- **ALWAYS** use `Button`, `Input`, `Dialog`, `Icon` (astro-icon, lucide:\*), `Badge`, `Card`, `FeedbackAlert`, `SectionHeading`, `FinancialSummary` from `@/components/ui` barrel.
- **ALWAYS** use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`). Never hardcoded colors.
- **Dialog backdrops**: use `backdrop:bg-backdrop/50`, never `backdrop:bg-slate-900/50`.

### astro-icon whitelist

`astro-icon` uses an **explicit allowlist** in `astro.config.mjs` → `integrations[].include.lucide` array. Icons NOT in this array will fail at build time with: `Unable to locate "lucide:<name>" icon!`

**Before using any `lucide:*` icon:**

1. Verify the icon name exists at https://lucide.dev/icons (names are exact — `chevrons-right` ≠ `chevron-right`)
2. Check if the icon is already in `astro.config.mjs` → `include.lucide` array
3. If missing, add it **alphabetically** to the array
4. Report any new icon additions in your task output so the reviewer can verify

Current whitelist location: `astro.config.mjs` lines 28-90.

### Responsive state enumeration

When a UI component behaves differently across breakpoints or page states, analysis reports and task files **must enumerate each discrete state** explicitly. Never describe responsive behavior as a single case.

**Required format** (use in analysis reports and task files):

| Condition | Mobile (< md) | Desktop (≥ md) |
|-----------|---------------|-----------------|
| [state 1] | [what renders] | [what renders] |
| [state 2] | [what renders] | [what renders] |

**Mobile/desktop parity rule**: Mobile and desktop must provide equivalent semantic information. Mobile may rearrange or compact, but must never omit information that desktop shows. Reviewers must verify parity by mentally rendering each state at each breakpoint.

### Visual QA for UI changes

Any task that modifies visible UI components requires visual verification before declaring completion:

- **Implementer**: After code changes, run `pnpm dev` and visually inspect the result at both desktop (1280px) and mobile (375px) viewports. Note any visual issues in the report.
- **Reviewer**: Include a "Visual QA" checklist section that verifies:
  - Desktop rendering looks intentional and complete
  - Mobile rendering matches expectations
  - Mobile and desktop provide equivalent information (parity check)
  - No broken icons, missing elements, or layout issues

This goes beyond `pnpm astro check` — that only verifies types, not visual correctness.

## Process Conventions

### Task File Convention
Plans reference task files — they don't embed them. Each subagent task gets its own file at `docs/tasks/task-YYYYMMDD-HHmm-<agent>.md`. The plan's Tasks section lists summaries; the task file has full technical steps.

### Task Dependency Convention
Plans MUST include a `## Task Dependencies` table before the `## Tasks` section:

```markdown
## Task Dependencies
| Task | Depends On | Parallel-Safe |
|------|------------|---------------|
| Task 1 | — | yes |
| Task 2 | Task 1 | no |
```

Each task in the plan MUST specify:
- **Scope**: `new` | `extends-existing` | `fix` — what type of work
- **Pre-existing**: list components/files already implemented that this task builds on
- **Dependencies**: which tasks must complete first

This prevents task scope ambiguity where a builder discovers work already done.

### Pre-Flight Checks
Before dispatching builder tasks, the orchestrator should verify tool dependencies:

```bash
# Graphify dependencies
$(cat graphify-out/.graphify_python 2>/dev/null || echo python3) -c "import networkx" 2>/dev/null && echo "graphify: ok" || echo "graphify: networkx MISSING"
```

If dependencies are missing, document the gap in the task file's guardrails so the builder knows to use the fallback procedure (grep/glob instead of graphify).

### ESLint Cleanup
Unused imports and variables should be cleaned before validation, not after. Options:

1. **Pre-commit hook** (recommended): Add `pnpm eslint . --fix` to a pre-commit hook via `husky` + `lint-staged` to auto-remove unused imports on commit.
2. **CI check**: Add `pnpm eslint .` as a required CI check that blocks merge on lint errors.
3. **Builder self-check**: Builders already run `pnpm eslint .` as part of their verification checklist. Unused imports should be fixed in the same task, not deferred to a separate fix-ESLint task.

The goal is to eliminate the need for a dedicated fix-ESLint task after validation.

### Agent Report Template
All agent reports (kitchcalc-builder, kitchcalc-reviewer, kitchcalc-explore) must include a `## Skills Used` section listing which skills were loaded during execution, or `none` if no skills were used. This closes the feedback loop for skill effectiveness evaluation.

### Parallel Execution Notes
When a plan dispatches 2+ tasks in parallel, include a "Parallel Execution Notes" section listing any files touched by multiple tasks. State whether the overlap is expected conflict-free (different sections of the same file) or needs coordination.

## Troubleshooting

### `exports is not defined` at startup (cookie package)

pnpm version mismatch with `cookie@1.1.1` (CJS-only). Fix:

```bash
corepack enable
corepack prepare pnpm@11.1.2 --activate
rm -rf node_modules pnpm-lock.yaml
pnpm install
pnpm dev
```

## Agent skills

### Issue tracker

GitHub Issues for MaddozS/recetario. See `docs/agents/issue-tracker.md`.

### Triage labels

Default canonical labels: `needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.

<!-- SPECKIT START -->

**Active Plan**: `specs/006-password-reset-flow/plan.md` — Password Reset Flow (10-min expiry, branded Resend email templates, countdown timer, rate limiting).

<!-- SPECKIT END -->
