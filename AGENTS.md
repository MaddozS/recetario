# AGENTS.md — KitchCalc (Recetario)

## Stack

**Astro 6** SSR via `@astrojs/vercel`. **pnpm 11.1.2** (package-manager locked). **Node >= 22.12.0**.
No `.env.local` — use `.env`.

## Commands

| Command | Purpose |
|---|---|
| `pnpm dev` | Dev server at `localhost:4321` |
| `pnpm build` | Production build |
| `pnpm preview` | Preview build locally |
| `pnpm format` | Prettier whole project |
| `pnpm astro check` | Type-check `.astro` + `.ts` |
| `pnpm eslint .` | Lint JS/TS/Astro |
| `npx prisma migrate dev --name X` | Create migration |
| `npx prisma generate` | Regenerate client |
| `npx prisma studio` | Open Prisma Studio |
| `npx tsx prisma/seed.ts` | Run seed manually |

**postinstall** runs `npx prisma generate` automatically.
**vercel-build**: `npx prisma generate && npx prisma migrate deploy && astro build`.

No test infrastructure exists.

## Architecture

### Auth

Better Auth via `src/lib/auth.ts` (server singleton) + `src/lib/auth-client.ts` (client). Google OAuth. Middleware (`src/middleware.ts`) populates `Astro.locals.{user, session, subscription}` on every request. `SubscriptionPlan` rows auto-seeded on first authenticated request (`globals.__plansSeeded` guard).

### Pages & routing

- **Protected** (`Astro.locals.session` required): `/recipes`, `/recipes/[recipe]`, `/ingredients`, `/settings`, `/settings/billing`, `/produccion`
- **Public**: `/sign-in`, `/sign-up`, `/pricing`
- `/produccion` also gated behind `production_planner` feature flag
- Layout: `Layout` (app shell + sidebar) or `LandingLayout` (marketing). `currentPage` prop: `recipes | ingredients | settings | production`.

### Data layer

**PostgreSQL + Prisma ORM** with `@prisma/adapter-pg` + `pg.Pool` (max 3, 30s idle). Singleton in `src/lib/prisma.ts`.
- Output: `generated/prisma/` (non-standard — set in `schema.prisma:7`)
- Import via `@/lib/db/*` barrel (`index.ts`). Direct `@/lib/prisma` only for raw access.
- Multi-tenant: every record has `ownerId`. Scoped by `RECIPES_STATIC_OWNER_ID`/`EMAIL` env vars for seed users.
- Seed data: `data/ingredients.json`, `data/recipes.json`. Loaded on first run via `seedIfNeeded()`.

### Key gotchas

| Gotcha | Detail |
|---|---|
| **Import paths** | `@/lib/db/ingredients`, `@/lib/db/recipes`, `@/lib/db/billing`, etc. | |
| **Forms** | No Astro Actions. POST to same page, read `Astro.request.formData()`, redirect. Spanish locale: `parseNumberInput()` converts comma→dot. |
| **Recipe update** | Destructive: `$transaction` deletes all `RecipeIngredient` rows then re-creates. |
| **Ingredient delete** | Blocked if referenced by any recipe (returns `{ status: "blocked", recipes: [...] }`). |
| **RecipeIngredient** | Composite PK `@@id([recipeId, ingredientId])`. |
| **Feature flags** | 12 keys in `FREE_FEATURES` (all false). Basic enables 5; Pro enables all 12. |
| **Tsconfig exclude** | `["dist, .agent/**, .astro/**, node_modules/**, .vercel/**"]` — single comma string, likely buggy. |
| **Subscription cache** | Middleware caches subscription for 60s via `src/lib/cache.ts`. |
| **pnpm allowed builds** | Only `esbuild`, `sharp`, `@prisma/engines`, `prisma` (`pnpm-workspace.yaml`). |
| **Vercel ephemeral** | Always set `DATABASE_URL` for persistence. |

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
- `webhook` (POST, no auth*) — handles `checkout.session.completed`, `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted`, `customer.subscription.updated`

API version: `2026-04-22.dahlia`.

## Client-side patterns

- **Binding guards**: `data-*-bound="1"` attributes prevent duplicate listener binding across SPA navigations
- **Lifecycle**: Bind on both `astro:page-load` and `astro:after-swap`
- **Theme**: `applyTheme()` reads `html.dataset.theme` / `html.dataset.accent`. No `.dark` CSS overrides — semantic tokens auto-adapt.
- **Accent colors**: 7 families (`indigo`, `violet`, `blue`, `emerald`, `rose`, `amber`, `coral`) in `src/lib/accent-colors.ts`. Landing layout always uses `coral`.

## UI conventions

- **ALWAYS** use `Button`, `Input`, `Dialog`, `Icon` (astro-icon, lucide:*), `Badge`, `Card`, `FeedbackAlert`, `SectionHeading`, `FinancialSummary` from `@/components/ui` barrel.
- **ALWAYS** use semantic tokens (`bg-card`, `text-foreground`, `border-border`, `accent-*`). Never hardcoded colors.
- **Dialog backdrops**: use `backdrop:bg-backdrop/50`, never `backdrop:bg-slate-900/50`.

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

**Active Plan**: `specs/003-settings-feedback-ui/plan.md` — Settings Feedback UI (confirmation messages, error feedback, disabled buttons, loading spinners).

<!-- SPECKIT END -->
