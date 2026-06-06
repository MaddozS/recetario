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

<!-- SPECKIT START -->

**Active Plan**: `specs/006-password-reset-flow/plan.md` — Password Reset Flow (10-min expiry, branded Resend email templates, countdown timer, rate limiting).

<!-- SPECKIT END -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, invoke the `skill` tool with `skill: "graphify"` before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
