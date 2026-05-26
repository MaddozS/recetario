<!--
Sync Impact Report — v1.0.0 → v1.1.0

Version change: 1.0.0 → 1.1.0 (MINOR)
Modified principles:
  - V. Technology Lock-in: expanded auth (email/password + Google OAuth),
    added subscription/billing detail, added icon system, added layout system
Added sections:
  - Additional Constraints: expanded Security (CSP, CSRF, audit logging, rate limiter),
    added Subscription & Billing, added Feature Flags, added Data Layer, added Pages & Routing
  - Development Workflow: expanded with forms pattern, recipe update pattern,
    seed data, client-side patterns
Removed sections: (none)
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ reviewed — no changes needed
  - .specify/templates/spec-template.md: ✅ reviewed — compatible
  - .specify/templates/tasks-template.md: ✅ reviewed — compatible
Follow-up TODOs: (none)
-->

# KitchCalc Constitution

## Core Principles

### I. Clean Code (NON-NEGOTIABLE)

Every piece of code MUST be clean: readable, maintainable, and
self-documenting. This is not aspirational — it is enforced.

- No commented-out code. No dead code paths. No `console.log` in committed code.
- Functions do one thing. Components are single-responsibility. A file exceeding
  300 lines MUST be refactored.
- Names reveal intent: variables, functions, components, and files use
  meaningful, unabbreviated names (well-known domain abbreviations excepted).
- No duplication. If a pattern appears twice, extract it.
- Imports are organized: external → internal, absolute over relative (`@/`).
- Commits are atomic and descriptive (conventional commits).

### II. Simple UX, Clear UI

Every screen answers one question. Every interaction has one purpose.
Information is concise — never decorative, never redundant.

- Numbers own the page: costs, quantities, and margins render in JetBrains Mono
  with `font-variant-numeric: tabular-nums`. The font shift signals "this is
  data, not prose."
- Forms minimize friction: sensible defaults, keyboard-friendly tab order,
  inline validation, Spanish decimal format via `parseNumberInput()`.
- Empty states are instructive, never decorative. Show the user what to do next.
- Never display raw IDs, timestamps, or internal application state to users.
- UI copy is Spanish-first, kitchen-familiar. No jargon, no English holdovers.
- POST forms to the same page, read `Astro.request.formData()`, redirect.
  No Astro Actions.

### III. Design by Constitution (DESIGN.md + PRODUCT.md)

All UI MUST follow DESIGN.md — "La Cocina Ordenada". All UX decisions MUST
align with PRODUCT.md. The impeccable skill principles serve as the design
review standard for all UI work.

- The One Voice Rule: accent color on primary actions and selection only.
  It never decorates. Its rarity IS the signal.
- The Token Bridge Rule: every color is a semantic token (`bg-card`,
  `text-foreground`, `border-border`). Never hardcode hex or oklch in markup.
  No `.dark` CSS selector overrides — the token system handles dark mode.
- The Data Speaks Mono Rule: every dollar amount, gram, percentage — any
  computed or entered numeric value — renders in JetBrains Mono with
  tabular-nums.
- The One Label Rule: tracked-uppercase label style (`text-[11px] font-bold
  uppercase tracking-[0.16em]`) appears on form field labels and input group
  headings only. Not as decorative kickers.
- The Flat-By-Default Rule: surfaces are flat at rest. Shadows appear only as a
  response to state (hover, focus, overlay). Depth comes from background color
  shifts, not shadow stacks.
- Motion uses CSS custom properties (`--ease-out`, `--duration-fast`, etc.)
  defined in `src/styles/global.css`. Animate only `transform` and `opacity`.
  Respect `prefers-reduced-motion: reduce`.
- Dialog backdrops use `backdrop:bg-backdrop/50`. Never hardcoded
  `backdrop:bg-slate-900/50`.

### IV. TypeScript Strictness + Type Safety

TypeScript strict mode is enabled and enforced. Types are the source of truth
for data contracts.

- Prisma-generated types are the single source of truth for all data shapes.
  Never manually duplicate `Prisma.Ingredient`, `Prisma.Recipe`, etc.
- All database access goes through `@/lib/db/*` barrel (`index.ts`). Direct
  Prisma client usage in pages/controllers is forbidden.
- API boundaries (form submissions, Stripe webhooks) use runtime validation.
- `noUncheckedIndexedAccess` is preferred. Access array elements via
  `.at(index)` or explicit undefined checks.
- `verbatimModuleSyntax` is enabled in tsconfig — use `import type` for type-only
  imports.

### V. Technology Lock-in

The stack is locked and MUST NOT change without a MAJOR constitution amendment.

- **Runtime**: Astro 6 SSR via `@astrojs/vercel`. Server-rendered Astro
  components. No additional frontend frameworks (React, Vue, Svelte, etc.).
  Client islands only where interactivity is unavoidable.
- **Build**: Vite + pnpm 11.1.2 (`packageManager` locked). Node >=22.12.0.
- **Database**: PostgreSQL via Prisma ORM with `@prisma/adapter-pg` + `pg.Pool`.
  Connection pool: max 3, idle timeout 30s, connection timeout 10s. Prisma client
  output at `generated/prisma/` (non-standard path). Singleton in
  `src/lib/prisma.ts`. Postinstall runs `npx prisma generate`.
- **Styling**: Tailwind V4 via `@tailwindcss/vite` plugin. Semantic CSS tokens
  in `@theme` (`src/styles/global.css`). 7 accent color families (indigo default,
  violet, blue, emerald, rose, amber, coral). Landing layout always uses coral.
- **Icons**: `astro-icon` with `lucide:*` icons only. Icons listed explicitly
  in `astro.config.mjs` `include` block.
- **Auth**: Better Auth (server singleton at `src/lib/auth.ts`, client at
  `src/lib/auth-client.ts`). Email/password with `requireEmailVerification` +
  Google OAuth. Session cookie cache (5 min TTL). Trusted origins from
  `BETTER_AUTH_URL` env var.
- **Billing**: Stripe (API version `2026-04-22.dahlia`, SDK v22). Checkout
  Sessions, Customer Portal, webhooks. 3 routes in `src/pages/api/stripe/`:
  `checkout` (POST, auth), `portal` (POST, auth), `webhook` (POST, no auth,
  signature verified).
- **Deployment**: Vercel (ephemeral — `DATABASE_URL` MUST always be set).
  Build command: `npx prisma generate && npx prisma migrate deploy && astro build`.
- **Layout system**: `LandingLayout` for public/marketing pages (landing,
  pricing, sign-in, sign-up, legal). `Layout` for app shell (sidebar navigation)
  on authenticated pages. `currentPage` prop for sidebar active state.
- **Forms**: No Astro Actions. POST to same page, read
  `Astro.request.formData()`, redirect on success. Spanish locale:
  `parseNumberInput()` converts comma to dot.

## Additional Constraints

### Security & Data

- **Multi-tenant**: every database record is scoped by `ownerId`.
  `RECIPES_STATIC_OWNER_ID` / `EMAIL` env vars for seed users.
- **Content Security Policy**: `default-src 'self'`, script-src allows
  `'unsafe-inline'` and `https://accounts.google.com`, frame-src allows
  Stripe and Google. Set in middleware via `setSecurityHeaders()`.
- **Other security headers**: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **CSRF protection**: token generated in middleware (`src/lib/csrf.ts`),
  set as non-httpOnly cookie, available in `Astro.locals.csrfToken`. Client
  helper at `src/lib/csrf-client.ts`.
- **Rate limiting**: database-backed rate limiter at `src/lib/rate-limiter.ts`.
  Applied on auth routes (sign-in, sign-out). Uses `RateLimitEntry` model with
  key/count/resetAt.
- **Audit logging**: `AuditLog` model logs sign-in, sign-up, password-change,
  email-change, account-delete, session-revoke. Logger at `src/lib/db/audit.ts`.
  Triggered in middleware for sign-in events.
- **All user-generated HTML** MUST be sanitized via DOMPurify wrapper
  (`src/lib/html-sanitizer.ts`) with limited tag/attr allowlist. Recipe
  instructions use this.
- **Webhook signature verification** is mandatory for Stripe webhooks.
- **No secrets in code**. Environment variables for all API keys, database URLs,
  Stripe credentials, and auth config.
- **Build trust**: `pnpm.onlyBuiltDependencies` allows only `esbuild`, `sharp`,
  `@prisma/engines`, `prisma`.

### Subscription & Billing

- **Plans**: 3 tiers — Free (all 12 feature flags false), Basic (5 true), Pro
  (all 12 true). Configured in `src/lib/plans-config.ts` with `FREE_FEATURES`
  constant. Plans auto-seeded on first authenticated request (global
  `__plansSeeded` guard in middleware).
- **Model**: `SubscriptionPlan` (id, stripePriceId, name, tier, billingInterval,
  priceCents, currency default mxn, recipesLimit, ingredientsLimit, featuresJson,
  active). `Subscription` (userId, stripeCustomerId, stripeSubscriptionId,
  planId, status, period, cancelAtPeriodEnd, trialEnd).
- **Middleware**: caches subscription for 60s via `src/lib/cache.ts`
  (`CacheEntry` model). Resolved through `resolveSubscription()` in
  `src/lib/subscription.ts`. Available as `Astro.locals.subscription`.
- **Feature flags**: 12 boolean keys checked against subscription plan's
  `featuresJson`. Gate features like `production_planner` in pages/routes.

### Data Layer

- **Models**: Ingredient, Recipe, RecipeIngredient, RecipePresentation,
  UserPreferences, SubscriptionPlan, Subscription, User, Session, Account,
  Verification, RateLimitEntry, CacheEntry, AuditLog.
- **Relations**: Recipe `CASCADE` deletes RecipeIngredients. Ingredient
  `RESTRICT` on delete (blocked if referenced by any recipe — returns
  `{ status: "blocked", recipes: [...] }`).
- **RecipeIngredient**: composite PK `@@id([recipeId, ingredientId])`.
- **Recipe update is destructive**: `$transaction` deletes all
  `RecipeIngredient` rows then re-creates.
- **Seed data**: `data/ingredients.json`, `data/recipes.json`. Loaded on
  first run via `seedIfNeeded()`. Seed script at `prisma/seed.ts` (run via
  `npx tsx prisma/seed.ts`).

### Pages & Routing

- **Protected** (requires `Astro.locals.session`): `/recipes`,
  `/recipes/[recipe]`, `/ingredients`, `/settings`, `/settings/billing`,
  `/produccion`.
- **Public**: `/`, `/sign-in`, `/sign-up`, `/forgot-password`,
  `/reset-password`, `/verify-email`, `/pricing`, `/privacy`, `/terms`,
  `/404`.
- `/produccion` also gated behind `production_planner` feature flag.

### Performance

- Static where possible, dynamic only where user-specific data is required.
- Subscription cache: 60s TTL via `src/lib/cache.ts` (database-backed).
- No orchestrated page-load animation sequences. Product loads into a task.
- Recipe grid cards use staggered `cardFadeIn` animation (35ms delay/stagger)
  only if `prefers-reduced-motion: no-preference`.

### Accessibility

- WCAG 2.1 AA minimum: sufficient color contrast, keyboard navigation, semantic
  HTML, screen-reader support.
- Dark mode supported through token remapping, not CSS overrides.`.dark` class
  on `<html>` element toggles CSS variable overrides.
- All animations respect `prefers-reduced-motion: reduce` (disabled entirely via
  `animation: none !important`).

## Development Workflow

- All changes go through feature branches using Speckit sequential numbering
  (`001-feature-name`).
- Before merge: `pnpm astro check` (type-check) and `pnpm eslint .` (lint) MUST
  pass with zero errors.
- Migration workflow: `npx prisma migrate dev --name <name>` → review →
  `npx prisma generate` → commit migration files.
- Commitment message: `npx prisma generate` runs automatically on `postinstall`.
- Seed: `npx tsx prisma/seed.ts` for manual seeding. Automatic via `seedIfNeeded()`
  on first run.
- Commit messages follow conventional commits:
  `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`.
- No test infrastructure currently exists. When added, tests MUST be a
  non-negotiable gate.

### Client-side Patterns

- **Binding guards**: `data-*-bound="1"` attributes prevent duplicate listener
  binding across SPA navigations.
- **Lifecycle**: Bind on both `astro:page-load` and `astro:after-swap`.
- **Theme**: `applyTheme()` reads `html.dataset.theme` / `html.dataset.accent`.
  No `.dark` CSS overrides — semantic tokens auto-adapt.
- **Dialog**: Native `<dialog>` with `data-animated` for enter/exit transitions.
  `bindDialogBackdrop(dialogElement)` for click-outside-to-close
  (`src/lib/dialog.ts`).
- **Sign-in/sign-out**: Popup or open-in-tab flow with rate limiting
  (`src/lib/sign-in.ts`, `src/lib/sign-out.ts`).

### Recipe Instructions

- Markdown-to-HTML rendering via `src/lib/instructions-parser.ts`: parses
  headings, steps, `@ingredient` references, timer badges, temperature badges,
  step groups.
- WYSIWYG editor (`InstructionsEditor.astro`) with toolbar (bold, italic,
  heading, list, ordered list) and `@ingredient` mention autocomplete.
- Cooking mode (`CookingMode.astro`): full-screen overlay displaying step
  by step with kitchen timer.

## Governance

This Constitution supersedes all other practices, guidelines, and conventions.
Any conflict between this Constitution and a local convention resolves in favor
of the Constitution.

**Amendment process:**
1. Propose the change with documented rationale.
2. If MAJOR or MINOR: seek team review and approval.
3. Update the Constitution, increment the version, set `LAST_AMENDED_DATE` to
   today.
4. Propagate changes to dependent templates if needed.

**Compliance:**
- All PRs and reviews MUST verify Constitution compliance.
- Complexity MUST be justified. If a solution is harder than the problem,
  it is a violation of Principle I (Clean Code).
- Violations of NON-NEGOTIABLE principles (I, III) block merge until resolved.

**Versioning:**
- MAJOR: Backward-incompatible governance changes, principle removals or
  redefinitions.
- MINOR: New principle or materially expanded guidance.
- PATCH: Clarifications, wording refinements, typo fixes.

**Version**: 1.1.0 | **Ratified**: 2026-05-25 | **Last Amended**: 2026-05-25
