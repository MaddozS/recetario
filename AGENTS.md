# AGENTS.md — KitchCalc (Recetario)

## Project overview

Astro 6 SSR app deployed to **Vercel**. Package manager: **pnpm** (v9+). Node >= 22.12.0.
Database: **PostgreSQL** via **Prisma ORM** (`@prisma/adapter-pg` + `pg.Pool`).

## Commands

| Command                    | Purpose                                      |
| -------------------------- | -------------------------------------------- |
| `pnpm dev`                 | Dev server at `localhost:4321`               |
| `pnpm build`               | Production build                             |
| `pnpm preview`             | Preview production build locally             |
| `pnpm format`              | Prettier formatting (astro + standard files) |
| `pnpm astro check`         | Type-check `.astro` and `.ts` files          |
| `pnpm eslint .`            | Lint all JS/TS/Astro files                   |
| `npx prisma migrate dev`   | Create/apply new migration                   |
| `npx prisma generate`      | Regenerate Prisma client                     |
| `npx prisma studio`        | Open Prisma Studio GUI                       |
| `npx tsx prisma/seed.ts`   | Run database seed manually                   |

No dedicated test infrastructure exists yet.

## Architecture

### Pages and routing

- `src/pages/` — file-based routing (Astro convention)
- `/` redirects to `/recipes` (`src/pages/index.astro:3`)
- **Protected pages** (require `Astro.locals.session`): `/recipes`, `/ingredients`, `/settings`, `/settings/billing`, `/produccion`
- **Public pages** (no auth): `/sign-in`, `/sign-up`, `/pricing`
- Protected pages redirect unauthenticated users to `/sign-in`
- `/produccion` also gated behind `production_planner` feature flag
- Pages use either `Layout` (app shell with sidebar) or `LandingLayout` (marketing pages)

| Page                           | Layout          | Auth | Feature gate       |
| ------------------------------ | --------------- | ---- | ------------------ |
| `/sign-in`                     | LandingLayout   | No   | —                  |
| `/sign-up`                     | LandingLayout   | No   | —                  |
| `/pricing`                     | LandingLayout   | No   | —                  |
| `/recipes`                     | Layout          | Yes  | —                  |
| `/recipes/[recipe]`            | Layout          | Yes  | —                  |
| `/ingredients`                 | Layout          | Yes  | —                  |
| `/settings`                    | Layout          | Yes  | —                  |
| `/settings/billing`            | Layout          | Yes  | —                  |
| `/produccion`                  | Layout          | Yes  | `production_planner` |

### Auth flow

- `src/middleware.ts` populates `Astro.locals.user`, `Astro.locals.session`, and `Astro.locals.subscription` on every request
- `src/lib/auth.ts` initializes Better Auth with a singleton `auth` instance
- `src/pages/api/auth/[...all].ts` exports `ALL` route handler for `better-auth` callbacks
- Client: `src/lib/auth-client.ts` creates the client; `sign-in.ts` / `sign-out.ts` handle Google sign-in with rate limiting and popup/open-in-tab logic
- Middleware also auto-seeds `SubscriptionPlan` rows on first authenticated request (`globals.__plansSeeded`)

### Data layer — Prisma ORM

- **Single datasource**: PostgreSQL via `DATABASE_URL` env var
- `src/lib/prisma.ts` — singleton `PrismaClient` initialized with `@prisma/adapter-pg` + `pg.Pool` (max 3 connections, 30s idle timeout)
- Schema at `prisma/schema.prisma`, generated client output at `generated/prisma/`
- `prisma.config.ts` — config for migration/seed tooling; uses `dotenv/config`
- `scripts/verify-prisma.ts` — verification script
- All CRUD functions are scoped by `ownerId` for multi-tenancy
- `src/lib/recipe-data.ts` is a compat re-export of `./db/index` — always import through there for DB access
- `src/lib/db/index.ts` barrel exports: `prisma`, all types, helpers, ingredients, recipes, presentations, preferences, billing

### Prisma schema (11 models)

| Model                | Table (`@@map`)     | Key fields                                              | Relationships                                    |
| -------------------- | ------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| `User`               | `user`              | `id`, `name`, `email`, `emailVerified`, `image`         | hasMany `Session`, `Account`                     |
| `Session`            | `session`           | `id`, `token` (unique), `expiresAt`, `userId`           | belongsTo `User`                                 |
| `Account`            | `account`           | `id`, `accountId`, `providerId`, `userId`               | belongsTo `User`                                 |
| `Verification`       | `verification`      | `id`, `identifier`, `value`, `expiresAt`                | standalone                                       |
| `Ingredient`         | `ingredients`       | `id`, `ownerId`, `name`, `unit`, `price`, `purchaseQuantity`, `brand?`, `supplier?` | hasMany `RecipeIngredient` |
| `Recipe`             | `recipes`           | `id`, `ownerId`, `name`, `category?`, `instructions?`, `desiredMargin`, `fixedCostsPercentage`, `updatedAt?` | hasMany `RecipeIngredient`, `RecipePresentation` |
| `RecipeIngredient`   | `recipe_ingredients` | `recipeId`, `ingredientId`, `quantity`, `unit`, `comment?` | composite PK `@@id([recipeId, ingredientId])`. belongsTo `Recipe` (Cascade), `Ingredient` (Restrict) |
| `RecipePresentation` | `recipe_presentations` | `id`, `recipeId`, `name`, `unitsPerBatch`, `salePrice?` | belongsTo `Recipe` (Cascade)                    |
| `UserPreferences`    | `user_preferences`  | `userId` (PK), `theme`, `accentColor`, `updatedAt?`     | standalone                                       |
| `SubscriptionPlan`   | `subscription_plans` | `id`, `stripePriceId`, `name`, `tier`, `billingInterval`, `priceCents`, `recipesLimit?`, `ingredientsLimit?`, `featuresJson` | hasMany `Subscription` |
| `Subscription`       | `subscriptions`     | `id`, `userId`, `stripeCustomerId?`, `stripeSubscriptionId?` (unique), `planId`, `status`, `currentPeriodStart?`, `currentPeriodEnd?`, `cancelAtPeriodEnd`, `trialEnd?` | belongsTo `SubscriptionPlan` |

- All tables use `@@map("snake_case_name")` for explicit table naming
- Better Auth manages `User`, `Session`, `Account`, `Verification` tables
- Ingredient/Recipe have `@@index([ownerId])` for multi-tenant queries; Subscription has `@@index([userId, status])`

### Multi-tenant data isolation

- Every ingredient/recipe has an `owner_id` column
- `RECIPES_STATIC_OWNER_ID` / `RECIPES_STATIC_OWNER_EMAIL` env vars map a specific user to the static seed dataset (pre-loaded ingredients/recipes)
- Users not matching those env vars get data isolated by their auth user ID

### Seed data

- JSON files in `data/ingredients.json` and `data/recipes.json`
- Loaded into the `__static_seed__` scope on first run via `seedIfNeeded()` (only when that scope has no recipes yet)
- Subscription plans auto-seeded in `middleware.ts` via `seedSubscriptionPlans()` on first auth request

### Stripe billing system

3 API routes in `src/pages/api/stripe/`:

| Route                          | File                        | Auth  | Purpose                                                       |
| ------------------------------ | --------------------------- | ----- | ------------------------------------------------------------- |
| `/api/stripe/checkout`         | `checkout.ts`               | Yes   | Creates Stripe Checkout Session (subscription mode, 14-day trial). Creates/looks up Stripe customer. Returns `{ url }`. |
| `/api/stripe/portal`           | `portal.ts`                 | Yes   | Creates Stripe Customer Portal session for managing subscription |
| `/api/stripe/webhook`          | `webhook.ts`                | No*   | Receives webhook events. Verifies `stripe-signature` header.  |

Webhook handles these event types:
- `checkout.session.completed` — creates/updates subscription record
- `invoice.paid` — updates subscription period dates
- `invoice.payment_failed` — marks subscription `past_due`
- `customer.subscription.deleted` — marks subscription `canceled`
- `customer.subscription.updated` — updates subscription dates and status

Stripe API version: `2026-04-22.dahlia` (set in each endpoint).

### Subscription & feature gating

`src/lib/subscription.ts` provides the subscription resolution and feature gate logic.

**3 tiers:**

| Tier    | Recipes limit | Ingredients limit | Price       |
| ------- | ------------- | ----------------- | ----------- |
| `free`  | 10            | 30                | Free        |
| `basic` | 75            | unlimited         | $5/mo       |
| `pro`   | unlimited     | unlimited         | $10/mo      |

**9 feature flags:** `recipe_duplicate`, `recipe_photos`, `stock_tracking`, `production_planner`, `pdf_export`, `advanced_costs`, `change_history`, `data_import_export`, `nutrition_info`.

Key utility functions:
- `hasFeature(subscription, feature)` — checks if feature is enabled
- `canCreateRecipe(subscription, currentCount)` — checks recipe limit
- `canCreateIngredient(subscription, currentCount)` — checks ingredient limit
- `getRemainingRecipes(subscription, currentCount)` — returns remaining recipes
- `getRemainingIngredients(subscription, currentCount)` — returns remaining ingredients
- `isPaid(subscription)` — true if `basic` or `pro`
- `isPro(subscription)` — true if `pro`
- `resolveSubscription(dbSub)` — converts raw DB row to `UserSubscriptionInfo`
- `getDefaultSubscription()` — returns free tier defaults

Middleware populates `Astro.locals.subscription` on every request (cached for 60s).

### Production calculator

`/produccion` page with supporting logic at `src/lib/production-calculator.ts` and types at `src/lib/production-types.ts`.

Key types: `ProductionRecipeSelection`, `ConsolidatedIngredient`, `ProductionSummary`, `ProductionRecipeResult`.

`calculateProduction(selections, recipes)` — computes cost breakdown, consolidated ingredients, per-recipe financials, projected revenue/ profit/margin.

Gated behind the `production_planner` feature flag. Only visible in nav for pro users.

### Cache layer

`src/lib/cache.ts` — in-memory `Map<string, { value, expiresAt }>` (process-lifetime singleton).

Fast, simple, no TTL sweeping (entries expire lazily on read).

Functions: `cacheGet<T>(key)`, `cacheSet(key, value, ttlSeconds)`, `cacheClear()`, `cacheStats()`.

Used for: recipe summaries, individual recipes, ingredient lists, ingredient usage maps, user preferences, subscription data.

Cache invalidation on every mutation (write-through pattern).

### Database helpers

`src/lib/db/helpers.ts` — normalization utilities used by all CRUD modules:

| Function                       | Purpose                                       |
| ------------------------------ | --------------------------------------------- |
| `toNumber(value)`              | Safe numeric coercion                         |
| `normalizeOptionalText(value)` | Trims string, returns `undefined` if empty    |
| `normalizeDesiredMargin(v)`    | Clamps to 0–100, defaults to 25               |
| `normalizeFixedCostsPercentage(v)` | Clamps to 0–100, defaults to 0            |
| `normalizeRecipeComment(v)`    | Trims, returns `null` if empty                |
| `normalizeCategory(v)`         | Trims, returns `null` if empty                |

## Layout system

### Layout.astro (app shell — `src/layouts/Layout.astro`)

```
Props:
  currentPage: string           // "recipes" | "ingredients" | "settings" | "production"
  currentRecipe?: string        // recipe ID for sidebar highlighting
  showSideBar?: boolean         // show/hide recipe sidebar
  showHeader?: boolean          // show/hide header (default true)
  removeContentWrapper?: boolean  // skip padding wrapper
```

Structure: `<Header>` + sidebar (`<aside id="app-sidebar">`) + mobile overlay + `<main>` with view-transition wrapper + mobile bottom nav.

Sidebar uses `<RecipesSidebar>` component. Mobile nav is auto-generated in the layout.

Header renders `<Header>` component with desktop nav tabs. Mobile nav shows 3–4 tabs depending on feature flags.

Client JS: `applyTheme()` on load + `astro:after-swap`, sidebar open/close with `data-*-bound` guards.

### LandingLayout.astro (public — `src/layouts/LandingLayout.astro`)

Simpler layout for marketing pages. Uses `coral` accent, supports `landing_theme` cookie + localStorage for dark mode toggle. Has scroll-reveal intersection observer animations.

## Component catalog

### App components (`src/components/`)

| Component                        | Props                                                             | Purpose                                              |
| -------------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------- |
| `Header.astro`                   | `currentPage`, `showMenuButton`, `isAuthenticated`, `recipeHref`, `subscription` | Top app bar with desktop nav tabs, sign-out button, tier badge |
| `RecipesSidebar.astro`           | `recipes`, `currentRecipe`, `isAuthenticated`, `userName`, `subscription` | Left sidebar with recipe list, user info, settings link |
| `IngredientFormFields.astro`     | `ingredient?`, `units`, `mode`                                    | Shared ingredient form fields (create/edit)          |
| `PresentationCard.astro`         | `presentation`, `canEdit?`, `canDelete?`                          | Single presentation display/edit card                |
| `UnitCostDisplay.astro`          | `unitCost`, `unit`                                                | Unit cost display with formatting                    |
| `FeedbackAlert.astro`            | `type`, `message`                                                 | Success/error alert banner (from URL search params)  |
| `EmptyState.astro`              | `icon`, `title`, `description`, `actionLabel`, `actionHref`       | Empty state placeholder with optional CTA            |
| `UpgradePrompt.astro`            | `feature`, `description?`, `tier`                                 | Locked feature upgrade prompt (used in `<dialog>`)   |
| `ProductionFinancialSummary.astro` | —                                                               | Production cost/revenue summary card                 |
| `ProductionIngredientsTable.astro` | —                                                               | Consolidated ingredient table for production         |
| `ProductionRecipeBreakdown.astro` | —                                                               | Per-recipe cost breakdown in production              |
| `ProductionRecipeSelector.astro`  | —                                                               | Multi-recipe selector for production sheet           |

### Landing components (`src/components/landing/`)

| Component                   | Purpose                                              |
| --------------------------- | ---------------------------------------------------- |
| `LandingNavbar.astro`       | Top navigation with logo + sign-in/up CTAs           |
| `HeroSection.astro`         | Hero with headline, subtitle, CTA                    |
| `FeaturesSection.astro`     | Feature grid                                         |
| `HowItWorksSection.astro`   | Steps/explanation section                            |
| `PricingSection.astro`      | Pricing cards (Free/Basic/Pro) with Stripe checkout   |
| `CTASection.astro`          | Bottom CTA banner                                    |
| `LandingFooter.astro`       | Footer with links                                    |

## Form handling patterns

Pages do **not** use Astro Actions. Forms post to the same page, which handles mutation in the frontmatter via `Astro.request.formData()`.

Pattern (from `[recipe].astro` and `ingredients.astro`):

```astro
---
// 1. Parse form data
if (Astro.request.method === "POST") {
  const form = await Astro.request.formData();
  const action = form.get("_action");

  if (action === "update-recipe") {
    const name = form.get("name");
    // ...
    await updateRecipe(recipeId, { name, ... }, ownerId);
    return Astro.redirect("/recipes");
  }
}

// 2. Render page (GET or after mutation redirect)
const ingredients = await listIngredients(ownerId);
---
```

- `src/lib/form-utils.ts` — `parseNumberInput(value)` handles comma-to-dot conversion (Spanish locale)
- Feedback is communicated via URL search params: `?type=success&message=...` displayed by `<FeedbackAlert>` component
- Recipe update uses `prisma.$transaction` — delete all recipe ingredients + re-create (simple replace pattern)
- Presentation CRUD is handled inline in `[recipe].astro` with input form fields, not a separate page
- Ingredient delete is blocked if ingredient is used in any recipe (returns `{ status: "blocked", recipes: [...] }`)

## Client-side JS patterns

- **Binding guards**: DOM-bound event listeners use `data-*-bound="1"` attributes (e.g. `data-sidebar-bound`, `data-backdrop-bound`, `data-sign-in-bound`, `data-sign-out-bound`) to prevent duplicate binding across SPA navigations
- **Lifecycle events**: Bind on both `astro:page-load` and `astro:after-swap` (and often call immediately for initial page)
- **Dialog utility**: `src/lib/dialog.ts` — `bindDialogBackdrop(dialog: HTMLDialogElement)` closes dialog on backdrop click
- **Sign-out flow**: `signOut()` from `src/lib/sign-out.ts` is called, then `window.location.assign("/sign-in")`. Shows loading overlay during the process.
- **Sidebar**: Opens via `#mobile-menu-btn`, closes via `#close-sidebar-btn` or `#mobile-sidebar-overlay` click. Uses `-translate-x-full` + `opacity` transitions. `document.body.style.overflow = 'hidden'` while open.
- **Theme**: `applyTheme()` reads `html.dataset.theme` / `html.dataset.accent`, applies `.dark` class and accent CSS vars. Called on page load and `astro:after-swap`.

## API routes

| Route                     | Method | Auth | Response type       | Purpose                                   |
| ------------------------- | ------ | ---- | ------------------- | ----------------------------------------- |
| `/api/auth/[...all]`      | ALL    | N/A  | Varies              | Better Auth catch-all (OAuth, sessions)  |
| `/api/stripe/checkout`    | POST   | Yes  | `{ url: string }`   | Creates Stripe Checkout Session           |
| `/api/stripe/portal`      | POST   | Yes  | `{ url: string }`   | Creates Stripe Customer Portal session    |
| `/api/stripe/webhook`     | POST   | No*  | 200/400             | Handles Stripe webhook events             |

API route pattern:
```ts
import type { APIRoute } from "astro";

export const POST: APIRoute = async ({ request, locals }) => {
  if (!locals.user) {
    return new Response(JSON.stringify({ error: "Authentication required" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Parse body
  const body = await request.json();
  // ... logic ...

  return new Response(JSON.stringify({ url: session.url }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
```

## Styling conventions

### Tailwind v4 + custom accent colors

- TailwindCSS 4 with `@tailwindcss/vite` plugin (no `tailwind.config.*`)
- `global.css` defines `--color-accent-*` through `--color-accent-700` mapped from CSS variables `--aw-accent-*`
- Layout.astro sets `--aw-accent-*` variables via `style` attribute on `<html>` from `getAccentCssVars()`
- **Always use `accent-*` semantic classes** (e.g. `bg-accent-600`, `text-accent-50`, `border-accent-200`), never raw indigo/violet/etc
- Accent families: `indigo`, `violet`, `blue`, `emerald`, `rose`, `amber`, `coral` (defined in `src/lib/accent-colors.ts`)
- Landing layout always uses `coral` accent

### Dark mode

- Toggled by `.dark` class on `<html>`, handled through **CSS variable tokens** (no manual `.dark` CSS overrides)
- Semantic color tokens auto-adapt between light and dark via `:root` / `.dark` CSS variable blocks in `global.css`
- Accent colors use `--aw-accent-*` CSS variables dynamically set on `<html>` via `getAccentCssVars()`
- `<html>` gets `data-theme="light|dark"` and `data-accent="indigo|..."` attributes for JS runtime
- Layout's client-side `<script>` block calls `applyTheme()` on page load and `astro:after-swap`

### Color system (semantic CSS variable tokens)

All grayscale and feedback colors use semantic tokens that auto-adapt to dark mode.
Tokens are defined in `@theme` in `global.css` as `var(--tw-*)` references.
The `:root` block sets light values, `.dark` block sets dark values.

| Token class                 | Light value | Dark value               | Replaces                    |
| --------------------------- | ----------- | ------------------------ | --------------------------- |
| **Surface**                 |             |                          |                             |
| `bg-background`             | `#f8fafc`   | `oklch(0.176 0.008 258)` | `bg-slate-50`               |
| `bg-card`                   | `#ffffff`   | `oklch(0.208 0.008 258)` | `bg-white`                  |
| `bg-muted`                  | `#f1f5f9`   | `oklch(0.208 0.008 258)` | `bg-slate-100`              |
| `bg-hover-muted`            | `#e2e8f0`   | `oklch(0.31 0.008 258)`  | `hover:bg-slate-50/100/200` |
| **Text**                    |             |                          |                             |
| `text-foreground`           | `#0f172a`   | `oklch(0.856 0.005 258)` | `text-slate-900/800`        |
| `text-secondary-foreground` | `#334155`   | `oklch(0.78 0.006 258)`  | `text-slate-700`            |
| `text-muted-foreground`     | `#64748b`   | `oklch(0.637 0.01 258)`  | `text-slate-600/500`        |
| `text-subtle-foreground`    | `#cbd5e1`   | `oklch(0.44 0.012 258)`  | `text-slate-400/300`        |
| **Border**                  |             |                          |                             |
| `border-border`             | `#e2e8f0`   | `oklch(0.31 0.008 258)`  | `border-slate-200`          |
| `border-border-light`       | `#f1f5f9`   | `#030712`                | `border-slate-100`          |
| **Feedback (danger)**       |             |                          |                             |
| `text-danger`               | `#be123c`   | `oklch(0.78 0.1 20)`     | `text-rose-7/6/500`         |
| `bg-danger-bg`              | `#fff1f2`   | `oklch(0.18 0.035 20)`   | `bg-rose-50`                |
| `bg-danger-solid`           | `#e11d48`   | `oklch(0.68 0.15 20)`    | `bg-rose-6/5/400`           |
| `border-danger-border`      | `#fecdd3`   | `oklch(0.30 0.06 20)`    | `border-rose-200`           |
| **Feedback (success)**      |             |                          |                             |
| `text-success`              | `#047857`   | `oklch(0.78 0.08 160)`   | `text-emerald-7/6/500`      |
| `bg-success-bg`             | `#ecfdf5`   | `oklch(0.18 0.03 160)`   | `bg-emerald-50`             |
| `bg-success-solid`          | `#10b981`   | `oklch(0.68 0.15 160)`   | `bg-emerald-500`            |
| `border-success-border`     | `#a7f3d0`   | `oklch(0.30 0.05 160)`   | `border-emerald-200`        |
| **Feedback (warning)**      |             |                          |                             |
| `text-warning`              | `#b45309`   | `oklch(0.82 0.08 85)`    | `text-amber-7/6/500`        |
| `bg-warning-bg`             | `#fffbeb`   | `oklch(0.18 0.03 85)`    | `bg-amber-50/100`           |
| `bg-warning-solid`          | `#f59e0b`   | `oklch(0.72 0.15 85)`    | `bg-amber-500`              |
| `border-warning-border`     | `#fde68a`   | `oklch(0.30 0.05 85)`    | `border-amber-200`          |

#### Color rules

- **ALWAYS use semantic tokens** (`bg-card`, `text-foreground`, `border-border`) instead of raw Tailwind colors (`bg-white`, `text-slate-900`, `border-slate-200`).
- **NEVER write `.dark` CSS selector overrides** — the token system handles dark mode automatically.
- **NEVER override Tailwind internal variables** (`--tw-shadow-color`, `--tw-gradient-from`, etc.).
- **NEVER use hardcoded hex/oklch values** in `<style>` blocks — use `var()` references to tokens.
- Exceptions: accent colors (`bg-accent-600`, `text-accent-50`, `border-accent-200`) auto-adapt via `--aw-accent-*`. Inline `dark:*` variants are valid for non-color properties (e.g. `dark:shadow-none`, `dark:shadow-[...]`).
- `color-scheme: light dark` is set on `:root` for form controls and scrollbars.

### Component patterns

- **Buttons**: `rounded-xl`, `text-sm font-bold`, `inline-flex items-center justify-center gap-2`, `min-h-11`, `transition-colors`
- **Primary CTA**: `bg-accent-600 px-6 py-3 text-white hover:bg-accent-700`
- **Secondary**: `border border-border bg-card px-5 py-3 text-muted-foreground hover:bg-background`
- **Danger solid**: `bg-danger-solid px-5 py-3 text-white hover:bg-danger-solid`
- **Cards/sections**: `rounded-2xl` or `rounded-3xl`, `bg-card border border-border shadow-sm`
- **Icons**: `astro-icon` with `lucide:*` names, imported as `<Icon name="lucide:chef-hat" size={20} />`

### View transitions

- Astro's built-in `ClientRouter` used via `<ClientRouter />` in Layout
- Custom `::view-transition-group(app-content)` animations with blur + translate
- Component transitions use `transition:animate="none"` on static chrome (header, sidebar, mobile nav)
- JS event listeners bound on `astro:page-load` and `astro:after-swap` with `data-*-bound="1"` guards to prevent duplicate binding

### JS binding convention

- DOM bound event listeners use `data-*-bound="1"` (or similar) to avoid re-binding across SPA navigations
- Examples: `data-sidebar-bound`, `data-backdrop-bound`, `data-sign-in-bound`, `data-sign-out-bound`

## Import conventions

```astro
---
// Icons
import { Icon } from "astro-icon/components"

// DB access (always through recipe-data compat layer)
import { listRecipes, createRecipe, ... } from "../lib/recipe-data"
// or import types:
import type { Ingredient, ... } from "../lib/recipe-data"

// Raw Prisma access (only when recipe-data doesn't expose what you need)
import { prisma } from "../lib/prisma"

// Types for input/output (also re-exported from recipe-data)
import type { CreateRecipeInput, ... } from "../lib/db/types"

// Auth
import { auth } from "../lib/auth"           // server-side
import { authClient } from "../lib/auth-client"  // client-side

// Form utilities
import { parseNumberInput } from "../lib/form-utils"

// Constants
import { UNIT_OPTIONS, DEFAULT_UNIT } from "../lib/constants"

// Feature gating
import { hasFeature, isPaid, canCreateRecipe } from "../lib/subscription"

// Production calculator
import { calculateProduction } from "../lib/production-calculator"
import type { ProductionRecipeSelection } from "../lib/production-types"

// Formatting
import { formatCurrency, formatNumber } from "../lib/formatters"
```

## Environment variables (.env)

| Variable                                                 | Purpose                                            |
| -------------------------------------------------------- | -------------------------------------------------- |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`              | Google OAuth credentials                           |
| `BETTER_AUTH_SECRET`                                     | Session encryption secret                          |
| `BETTER_AUTH_URL`                                        | Public base URL (e.g. `http://localhost:4321`)     |
| `BETTER_AUTH_USE_DB`                                     | Set to `true` to use DB-backed sessions            |
| `DATABASE_URL`                                           | PostgreSQL connection string                       |
| `RECIPES_STATIC_OWNER_ID` / `RECIPES_STATIC_OWNER_EMAIL` | Map a user to seed dataset                         |
| `STRIPE_SECRET_KEY`                                      | Stripe secret key                                  |
| `STRIPE_WEBHOOK_SECRET`                                  | Stripe webhook signing secret                      |
| `STRIPE_PRICE_ID_BASIC_MONTHLY`                          | Stripe Price ID for Basic monthly                  |
| `STRIPE_PRICE_ID_BASIC_YEARLY`                           | Stripe Price ID for Basic yearly                   |
| `STRIPE_PRICE_ID_PRO_MONTHLY`                            | Stripe Price ID for Pro monthly                    |
| `STRIPE_PRICE_ID_PRO_YEARLY`                             | Stripe Price ID for Pro yearly                     |
| `POSTGRES_SSL_CA` / `POSTGRES_SSL_INSECURE`              | SSL config for Postgres                            |

## Feature Development Guide

### Adding a new page

1. Create file at `src/pages/my-page.astro`
2. Choose layout: `Layout` (app with sidebar) or `LandingLayout` (marketing)
3. Auth guard (if needed):
   ```astro
   if (!Astro.locals.session || !Astro.locals.user) {
     return Astro.redirect('/sign-in');
   }
   ```
4. Feature gate (if needed):
   ```astro
   import { hasFeature } from "../lib/subscription";
   if (!hasFeature(Astro.locals.subscription, 'feature_name')) {
     return Astro.redirect('/pricing');
   }
   ```
5. Register navigation in `Header.astro` (desktop) and `Layout.astro` (mobile nav)
6. Add route to `currentPage` matching in header/layout

### Adding a new DB model

1. Add model to `prisma/schema.prisma` with `@@map("table_name")`
2. Run `npx prisma migrate dev --name add_my_model`
3. Run `npx prisma generate`
4. Create `src/lib/db/my-model.ts` with CRUD functions
5. Add types to `src/lib/db/types.ts` (or inline)
6. Export from `src/lib/db/index.ts`
7. Re-export is automatic through `src/lib/recipe-data.ts`

### Adding a new API route

1. Create file at `src/pages/api/my-endpoint.ts`
2. Export `POST` / `GET` / `ALL` as `APIRoute`
3. Auth check:
   ```ts
   if (!locals.user) {
     return new Response(JSON.stringify({ error: "..." }), {
       status: 401,
       headers: { "Content-Type": "application/json" },
     });
   }
   ```
4. Parse body with `request.json()` (POST) or URL params (GET)
5. Return `new Response(JSON.stringify(...), { headers: { "Content-Type": "application/json" } })`

### Adding a new component

1. Create file at `src/components/MyComponent.astro`
2. Define `interface Props` in frontmatter
3. Use semantic color tokens throughout
4. Follow existing button/card patterns (see Component patterns above)
5. If client JS needed: use `data-*-bound="1"` guard, bind on `astro:page-load` + `astro:after-swap`
6. If using icons: `import { Icon } from "astro-icon/components"`

### Adding a new feature flag

1. Add key to `FREE_FEATURES` in `src/lib/subscription.ts` (default `false`)
2. Add key to `BASIC_FEATURES` / `PRO_FEATURES` in `src/lib/db/billing.ts`
3. Generate new DB migration to add any new columns if needed
4. Use gate: `hasFeature(Astro.locals.subscription, 'feature_name')`

### CRUD pattern (reproducible example)

Every DB module follows this structure:

```ts
import { prisma } from "../prisma";
import type { MyType } from "./types";
import { normalizeOptionalText, toNumber } from "./helpers";
import { cacheGet, cacheSet } from "../cache";

function invalidateCache(ownerId: string) {
  cacheSet(`mykey:${ownerId}`, undefined, 0);
}

export async function listMyModel(ownerId: string): Promise<MyType[]> {
  const cached = cacheGet<MyType[]>(`mykey:${ownerId}`);
  if (cached) return cached;

  const rows = await prisma.myModel.findMany({
    where: { ownerId },
    orderBy: { id: "asc" },
  });

  const result = rows.map(normalizeRow);
  cacheSet(`mykey:${ownerId}`, result, 60);
  return result;
}

export async function createMyModel(input: CreateInput, ownerId: string): Promise<MyType> {
  const data = await prisma.myModel.create({ data: { ownerId, ...normalizeInput(input) } });
  invalidateCache(ownerId);
  return normalizeRow(data);
}
```

### Form handling pattern (reproducible example)

```astro
---
// Page frontmatter handles both GET and POST
if (Astro.request.method === "POST") {
  const form = await Astro.request.formData();
  const action = form.get("_action");

  if (action === "create") {
    try {
      await createIngredient({
        name: String(form.get("name") ?? ""),
        unit: String(form.get("unit") ?? ""),
        price: parseNumberInput(form.get("price")),
      }, ownerId);
      return Astro.redirect(`/ingredients?type=success&message=Creado`);
    } catch {
      return Astro.redirect(`/ingredients?type=error&message=Error`);
    }
  }
}

const ingredients = await listIngredients(ownerId);
---
<FeedbackAlert type={Astro.url.searchParams.get('type')} message={Astro.url.searchParams.get('message')} />
<form method="POST">
  <input type="hidden" name="_action" value="create" />
  <!-- form fields -->
</form>
```

## Key gotchas

- **No `.env.local`** support — use `.env`
- Prisma client output path is `generated/prisma/` (non-standard; set in `schema.prisma:7`)
- After schema changes: always run `npx prisma generate` AND `npx prisma migrate dev`
- Stripe webhook must be configured in Stripe Dashboard pointing to your route: `/api/stripe/webhook`
- Subscription plans are auto-seeded on first authenticated request (in middleware), not at startup
- Feature flags are stored as JSON in `featuresJson` column, parsed at runtime via `parseFeaturesJson()`
- `RecipeIngredient` uses composite PK `@@id([recipeId, ingredientId])` — no auto-increment ID
- `Ingredient` delete is blocked if any recipe references it (returns `{ status: "blocked", recipes: [...] }`)
- Recipe update is destructive: deletes all existing `RecipeIngredient` rows and re-creates them in a transaction
- The `.prettierrc` uses `prettier-plugin-astro`
- `pnpm-workspace.yaml` only allows native builds of `esbuild` and `sharp`
- On Vercel, temp storage is ephemeral — always set `DATABASE_URL` for persistence
- `run_migration.mjs` is a legacy one-off Postgres migration script — not part of the normal flow

## Reference docs

`docs/planes/` contains planning documents for implemented and upcoming features:

| File                              | Topic                                                 |
| --------------------------------- | ----------------------------------------------------- |
| `roadmap.md`                      | Overall project roadmap                               |
| `monetizacion-suscripciones.md`   | Subscription monetization strategy                    |
| `orquestador-monetizacion.md`     | Monetization orchestration plan                       |
| `planificador-produccion.md`      | Production planner feature spec                       |
| `modulo-1-db-billing.md`          | Billing DB schema design                              |
| `modulo-2-stripe-routes.md`       | Stripe API route implementation                       |
| `modulo-3-middleware-gates.md`    | Middleware feature gating                             |
| `modulo-4-pagina-pricing.md`      | Pricing page design                                   |
| `modulo-5-pagina-billing.md`      | Billing/settings page design                          |
| `modulo-6-limites.md`             | Rate limits and tier constraints                       |
| `modulo-7-upgrade-prompt.md`      | Upgrade prompt component spec                         |
| `categorias-recetas.md`           | Recipe categories feature                             |
| `instrucciones-receta.md`         | Recipe instructions/notes feature                     |

Note: these are planning docs and may not always reflect current implementation.
