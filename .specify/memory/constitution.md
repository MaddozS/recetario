<!--
Sync Impact Report — v1.2.0 → v2.0.0

Version change: 1.2.0 → 2.0.0 (MINOR → MAJOR)
Modified principles:
  - I. Clean Code: expanded with error handling, logging, complexity thresholds
  - II. Simple UX, Clear UI: enhanced with loading/error/empty state trinity
  - III. Design by Constitution: enhanced with component prop conventions + Design System Mandate
  - IV. TypeScript Strictness + Type Safety: expanded with API types and runtime validation
  - V. Technology Lock-in: unchanged
Added principles:
  - VI. Component Architecture (NON-NEGOTIABLE): composition, prop typing, documentation
  - VII. Performance Engineering: bundle size, caching, resource optimization
  - VIII. Scalability Architecture: indexing, connection management, horizontal design
  - IX. Error Handling & Resilience (NON-NEGOTIABLE): boundaries, graceful degradation
  - X. Observability: logging, health checks, metrics standards
Added sections:
  - Applying the Constitution: Decision Framework
  - Principles Application Guide: when/how to apply each principle
  - Design System Mandate (NON-NEGOTIABLE) in Section III
Removed sections: (none)
Templates requiring updates:
  - .specify/templates/plan-template.md: ⚠️ needs review - "Constitution Check" section should reference new principles
  - .specify/templates/spec-template.md: ⚠️ needs review - may need performance/scalability requirements
  - .specify/templates/tasks-template.md: ⚠️ needs review - new principle-driven task types
Follow-up TODOs:
  - TODO(health-checks): Add /api/health endpoint implementation to constitution once created
  - TODO(testing-strategy): Once tests are added, document testing principles in Appendix
-->

# KitchCalc Constitution

## Preamble

This constitution establishes the engineering principles that govern all code, design, and architecture decisions in KitchCalc. It serves as the authoritative source for resolving conflicts between local conventions and system-wide standards. Every contributor MUST familiarize themselves with these principles before making architectural or design decisions.

**Principle Classification:**
- **NON-NEGOTIABLE**: Violations block merge. No exceptions without explicit waiver from project lead.
- **DEFAULT**: Strong guidance that may be violated with documented justification.

---

## Applying the Constitution: Decision Framework

When facing technical decisions, follow this framework:

1. **Map to Principle**: Identify which principle(s) apply to your decision
2. **Check NON-NEGOTIABLE First**: Ensure your choice doesn't violate any NON-NEGOTIABLE principle
3. **Evaluate Trade-offs**: Document trade-offs against Clean Code (I) and Simple UX (II)
4. **Apply Default Principles**: Prefer DEFAULT principle solutions over ad-hoc approaches
5. **Document Violations**: Any violation requires documented justification in code comments or PR description
6. **Seek Review**: NON-NEGOTIABLE violations require explicit approval. DEFAULT violations should be flagged in review.

**Decision Hierarchy** (highest to lowest priority):
1. Security & Data (NON-NEGOTIABLE - Section Additional Constraints)
2. Component Architecture (NON-NEGOTIABLE - VI)
3. Error Handling & Resilience (NON-NEGOTIABLE - IX)
4. Clean Code (I) and Design by Constitution (III)
5. All other principles

---

## Core Principles

### I. Clean Code (NON-NEGOTIABLE)

Every piece of code MUST be clean: readable, maintainable, and self-documenting. This is not aspirational — it is enforced.

**Rules:**

- No commented-out code. No dead code paths. No `console.log` in committed code.
- Functions do one thing. Components are single-responsibility.
  - A file exceeding **300 lines MUST be refactored**.
  - A function exceeding **50 lines SHOULD be split**.
- Names reveal intent: variables, functions, components, and files use meaningful, unabbreviated names (well-known domain abbreviations excepted).
- No duplication. If a pattern appears twice, extract it.
- Imports are organized: external → internal, absolute over relative (`@/`).
- Commits are atomic and descriptive (conventional commits).

**Error Handling:**

- Errors MUST be handled at the boundary (API route, user interaction point).
- Internal functions SHOULD propagate errors, not swallow them.
- Never `catch` without action; either handle meaningfully or re-throw.
- User-facing errors MUST be localized, actionable, and non-technical.

**Logging:**

- Log at decision points: auth success/failure, data mutations, external API calls.
- Never log sensitive data (passwords, tokens, personal information).
- Use structured logging: `{ action: 'sign_in', userId: '...', status: 'success' }`.
- Log levels: `error` for failures requiring attention, `warn` for recoverable issues, `info` for significant events.

**Complexity Management:**

- Cyclomatic complexity SHOULD remain below 10 per function.
-嵌套 nesting SHOULD NOT exceed 3 levels; use early returns and guard clauses.
- Complexity MUST be justified. If a solution is harder than the problem, it is a violation.

---

### II. Simple UX, Clear UI

Every screen answers one question. Every interaction has one purpose. Information is concise — never decorative, never redundant.

**Rules:**

- Numbers own the page: costs, quantities, and margins render in JetBrains Mono with `font-variant-numeric: tabular-nums`. The font shift signals "this is data, not prose."
- Forms minimize friction: sensible defaults, keyboard-friendly tab order, inline validation, Spanish decimal format via `parseNumberInput()`.
- **State Trinit**: Every view MUST implement the complete state trinity:
  1. **Loading**: Skeleton or spinner, never blank space
  2. **Empty**: Instructive message with clear CTA, never decorative
  3. **Error**: Localized message with retry action, never raw error details
- Never display raw IDs, timestamps, or internal application state to users.
- UI copy is Spanish-first, kitchen-familiar. No jargon, no English holdovers.

**Forms (Non-Negotiable Pattern):**

- POST to same page, read `Astro.request.formData()`, redirect on success.
- No Astro Actions.
- Spanish locale: `parseNumberInput()` converts comma to dot for decimal input.

---

### III. Design by Constitution (NON-NEGOTIABLE)

All UI MUST follow DESIGN.md — "La Cocina Ordenada". All UX decisions MUST align with PRODUCT.md. The impeccable skill principles serve as the design review standard for all UI work.

**Design System Mandate (NON-NEGOTIABLE):**

- **Use the existing system**: ALL UI primitives MUST be imported from `@/components/ui` barrel. The barrel IS the design system API.
- **No duplication**: Never create custom `Button`, `Card`, `Input`, `Badge`, `Dialog` equivalents. If the existing component lacks a prop or variant, extend it — don't clone it.
- **Import convention**: `import { Button, Card, Input, ... } from "@/components/ui";` — never import directly from individual files.
- **App-level components** (e.g., `BillingSection`, `FeedbackAlert`) live in `src/components/` and compose design system primitives. They are NOT replacements for missing primitives.
- **Feature components** live in `src/components/<feature>/` and also compose design system primitives. A feature component that renders UI should use `@/components/ui` building blocks.

**Color & Theme Rules:**

- **The One Voice Rule**: Accent color on primary actions and selection only. It never decorates. Its rarity IS the signal.
- **The Token Bridge Rule**: Every color is a semantic token (`bg-card`, `text-foreground`, `border-border`). Never hardcode hex or oklch in markup. No `.dark` CSS selector overrides — the token system handles dark mode.
- **The Theme Triad Rule**: The app supports three theme modes — "System default" (follow OS), "Light", and "Dark". When set to "System", the app reactively tracks the OS color scheme in real-time. Default for users with no saved preference is to follow OS.
- **The Independence Rule**: Theme mode (light/dark/system) and accent color are independent user preferences. Changing one does not affect the other.

**Typography Rules:**

- **The Data Speaks Mono Rule**: Every dollar amount, gram, percentage — any computed or entered numeric value — renders in JetBrains Mono with tabular-nums.
- **The One Label Rule**: Tracked-uppercase label style (`text-[11px] font-bold uppercase tracking-[0.16em]`) appears on form field labels and input group headings only. Not as decorative kickers.

**Surface & Motion Rules:**

- **The Flat-By-Default Rule**: Surfaces are flat at rest. Shadows appear only as a response to state (hover, focus, overlay). Depth comes from background color shifts, not shadow stacks.
- Motion uses CSS custom properties (`--ease-out`, `--duration-fast`, etc.) defined in `src/styles/global.css`. Animate only `transform` and `opacity`. Respect `prefers-reduced-motion: reduce`.
- Dialog backdrops use `backdrop:bg-backdrop/50`. Never hardcoded `backdrop:bg-slate-900/50`.

**Component Prop Conventions:**

- Props MUST be typed explicitly. No `any` props.
- Boolean props MUST use `is` or `has` prefix: `isLoading`, `hasError`.
- Event handlers MUST use `on` prefix: `onSubmit`, `onChange`.
- Slot props (rendering children) MUST use `render` suffix: `renderFooter`, `renderHeader`.
- Component files MUST export the component as default AND export the Props type.

---

### IV. TypeScript Strictness + Type Safety

TypeScript strict mode is enabled and enforced. Types are the source of truth for data contracts.

**Rules:**

- Prisma-generated types are the single source of truth for all data shapes. Never manually duplicate `Prisma.Ingredient`, `Prisma.Recipe`, etc.
- All database access goes through `@/lib/db/*` barrel (`index.ts`). Direct Prisma client usage in pages/controllers is forbidden.
- API boundaries (form submissions, Stripe webhooks) use runtime validation (Zod or equivalent).
- `noUncheckedIndexedAccess` is preferred. Access array elements via `.at(index)` or explicit undefined checks.
- `verbatimModuleSyntax` is enabled in tsconfig — use `import type` for type-only imports.

**API Types:**

- Request/response types for external APIs (Stripe, Google OAuth) MUST be defined in `src/types/` with `.ts` extension.
- Never spread Prisma types directly into API responses — create explicit DTOs.
- API error responses MUST follow a consistent shape: `{ error: string, code: string, details?: unknown }`.

---

### V. Technology Lock-in

The stack is locked and MUST NOT change without a MAJOR constitution amendment.

**Runtime:** Astro 6 SSR via `@astrojs/vercel`. Server-rendered Astro components. No additional frontend frameworks (React, Vue, Svelte, etc.). Client islands only where interactivity is unavoidable.

**Build:** Vite + pnpm 11.1.2 (`packageManager` locked). Node >=22.12.0.

**Database:** PostgreSQL via Prisma ORM with `@prisma/adapter-pg` + `pg.Pool`. Connection pool: max 3, idle timeout 30s, connection timeout 10s. Prisma client output at `generated/prisma/` (non-standard path). Singleton in `src/lib/prisma.ts`. Postinstall runs `npx prisma generate`.

**Styling:** Tailwind V4 via `@tailwindcss/vite` plugin. Semantic CSS tokens in `@theme` (`src/styles/global.css`). 7 accent color families (indigo default, violet, blue, emerald, rose, amber, coral). Landing layout always uses coral.

**Icons:** `astro-icon` with `lucide:*` icons only. Icons listed explicitly in `astro.config.mjs` `include` block.

**Auth:** Better Auth (server singleton at `src/lib/auth.ts`, client at `src/lib/auth-client.ts`). Email/password with `requireEmailVerification` + Google OAuth. Session cookie cache (5 min TTL). Trusted origins from `BETTER_AUTH_URL` env var.

**Billing:** Stripe (API version `2026-04-22.dahlia`, SDK v22). Checkout Sessions, Customer Portal, webhooks. 3 routes in `src/pages/api/stripe/`: `checkout` (POST, auth), `portal` (POST, auth), `webhook` (POST, no auth, signature verified).

**Deployment:** Vercel (ephemeral — `DATABASE_URL` MUST always be set). Build command: `npx prisma generate && npx prisma migrate deploy && astro build`.

**Layout system:** `LandingLayout` for public/marketing pages (landing, pricing, sign-in, sign-up, legal). `Layout` for app shell (sidebar navigation) on authenticated pages. `currentPage` prop for sidebar active state.

**Forms:** No Astro Actions. POST to same page, read `Astro.request.formData()`, redirect. Spanish locale: `parseNumberInput()` converts comma to dot.

---

### VI. Component Architecture (NON-NEGOTIABLE)

Components are the atoms of the UI. This principle governs their creation, composition, and documentation.

**Component Boundaries:**

- Create a component when: (a) logic repeats, (b) a concept deserves isolation, (c) a piece of UI has independent states.
- Do NOT create a component for: trivial markup, single-use layouts, premature abstraction.
- Components MUST live in `src/components/ui/` for shared primitives or feature-specific folders for domain components.

**Composition Over Inheritance:**

- Prefer prop composition over slot nesting for customization.
- Use named slots for layout flexibility: `<Card>`, `<Card>`, `<Card>`.
- Prefer controlled components (state via props) over uncontrolled (state via internal ref).

**Props Design:**

- Props types MUST be exported: `export type Props = { ... }`.
- All props MUST have JSDoc comments explaining purpose and constraints.
- Default values for optional props MUST be documented.
- Boolean props: `isDisabled`, `isLoading`, `hasError`. Never shorthand `disabled`.
- Required props have no marker; optional props use `?`.

**Component Documentation:**

- Every shared component MUST have a JSDoc comment explaining its purpose.
- Props table in JSDoc: `@param - description`.
- Usage example in JSDoc when complexity warrants it.

**Single Responsibility:**

- A component does one thing. If a component needs "mode" props (is X vs is Y), split it.
- Container components (logic/data) separate from presenter components (UI). Use `<Component>.astro` for UI, service files for logic.

---

### VII. Performance Engineering

Performance is a feature. The app MUST be fast, but not at the expense of code quality or maintainability.

**Bundle Size:**

- No new dependencies without justification and review.
- Monitor `pnpm why <package>` before adding; avoid duplicate transitive deps.
- Dynamic imports for code that loads on interaction (modals, dropdowns, cooking mode).

**Caching Strategy:**

- **Server-side**: Subscription cache (60s TTL) via `src/lib/cache.ts`. Database-backed.
- **Client-side**: Theme and accent preferences via localStorage; re-hydrate on load.
- **Static assets**: Vercel CDN handles caching; use content hashing for versioning.
- Cache invalidation MUST be explicit and documented.

**Loading Performance:**

- Static where possible, dynamic only where user-specific data is required.
- Recipe grid uses skeleton loading, not spinners.
- Staggered `cardFadeIn` animation (35ms delay/stagger) only if `prefers-reduced-motion: no-preference`.

**Resource Optimization:**

- Images: use Astro's `<Image>` component for automatic optimization (WebP, size).
- Fonts: load only used weights; `font-display: swap` for body text.
- No unused CSS; Tailwind purge enabled in production.

**Metrics to Monitor:**

- Time to First Byte (TTFB): target < 200ms for API routes.
- Largest Contentful Paint (LCP): target < 2.5s.
- Cumulative Layout Shift (CLS): target < 0.1.

---

### VIII. Scalability Architecture

Design for growth. Every decision considers the impact at 10x, 100x scale.

**Database Indexing:**

- Every foreign key column MUST have an index.
- Composite indexes MUST be ordered by selectivity (most selective first).
- Review `EXPLAIN ANALYZE` for queries touching >1000 rows.
- Index creation MUST be included in migrations.

**Connection Management:**

- Connection pool: max 3 connections, 30s idle timeout, 10s connection timeout.
- Never hold connections across async boundaries.
- Long-running operations (batch imports, report generation) MUST have their own connection or be queued.

**Query Design:**

- Avoid N+1 queries. Use `include` for related data.
- Pagination REQUIRED for list endpoints (>100 items).
- No `SELECT *` in application code. Always specify needed columns.

**Horizontal Considerations:**

- Stateless server design; no in-memory session storage.
- All state in PostgreSQL or cached in `CacheEntry` model.
- Rate limiting protects against traffic spikes (already implemented on auth routes).
- Webhook processing is idempotent; uses Stripe event ID for deduplication.

---

### IX. Error Handling & Resilience (NON-NEGOTIABLE)

The app MUST degrade gracefully and never expose internal state to users.

**Error Boundaries:**

- API routes MUST catch errors and return structured responses, never unhandled exceptions.
- Never expose stack traces, SQL errors, or internal paths to users.
- All errors log with correlation ID for tracing.

**User-Facing Errors:**

- Localized messages in Spanish, actionable, non-technical.
- Show what failed and what to do next (retry, contact support, etc.).
- Never say "Internal Server Error" — say "No pudimos guardar tu receta. Por favor intenta de nuevo."

**Graceful Degradation:**

- External service failures (Stripe, Google OAuth) MUST have fallback behavior.
- Stripe webhook failures: return 200 after logging, process asynchronously.
- Auth failures: clear session, redirect to sign-in with message.

**Retry Logic:**

- Idempotent operations only.
- Exponential backoff with jitter: initial 100ms, max 5s, max 3 attempts.
- Do NOT retry on 4xx errors.

---

### X. Observability

You cannot improve what you cannot measure. The app MUST emit signals that allow diagnosis and metrics collection.

**Health Checks:**

- `/api/health` endpoint returns `{ status: 'ok', timestamp, version }`.
- Database connectivity checked on each health call.
- Health endpoint is unauthenticated and fast (<50ms).

**Structured Logging:**

- Use consistent format: `{ timestamp, level, action, userId?, resourceId?, duration?, error? }`.
- Log: application startup, auth events, data mutations, external API calls, errors.
- Never log: passwords, tokens, PII, request bodies with sensitive data.

**Metrics:**

- Request duration per endpoint (histogram).
- Error rate per endpoint (counter).
- Active sessions (gauge).
- Subscription distribution (gauge by plan tier).

**Tracing:**

- Correlation ID in request headers (`x-correlation-id`).
- Propagate correlation ID to all log entries within a request.

---

## Additional Constraints

### Security & Data

- **Multi-tenant**: Every database record is scoped by `ownerId`. `RECIPES_STATIC_OWNER_ID` / `EMAIL` env vars for seed users.
- **Content Security Policy**: `default-src 'self'`, script-src allows `'unsafe-inline'` and `https://accounts.google.com`, frame-src allows Stripe and Google. Set in middleware via `setSecurityHeaders()`.
- **Other security headers**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`.
- **CSRF protection**: Token generated in middleware (`src/lib/csrf.ts`), set as non-httpOnly cookie, available in `Astro.locals.csrfToken`. Client helper at `src/lib/csrf-client.ts`.
- **Rate limiting**: Database-backed rate limiter at `src/lib/rate-limiter.ts`. Applied on auth routes (sign-in, sign-out). Uses `RateLimitEntry` model with key/count/resetAt.
- **Audit logging**: `AuditLog` model logs sign-in, sign-up, password-change, email-change, account-delete, session-revoke. Logger at `src/lib/db/audit.ts`. Triggered in middleware for sign-in events.
- **All user-generated HTML** MUST be sanitized via DOMPurify wrapper (`src/lib/html-sanitizer.ts`) with limited tag/attr allowlist. Recipe instructions use this.
- **Webhook signature verification** is mandatory for Stripe webhooks.
- **No secrets in code**. Environment variables for all API keys, database URLs, Stripe credentials, and auth config.
- **Build trust**: `pnpm.onlyBuiltDependencies` allows only `esbuild`, `sharp`, `@prisma/engines`, `prisma`.

### Subscription & Billing

- **Plans**: 3 tiers — Free (all 12 feature flags false), Basic (5 true), Pro (all 12 true). Configured in `src/lib/plans-config.ts` with `FREE_FEATURES` constant. Plans auto-seeded on first authenticated request (global `__plansSeeded` guard in middleware).
- **Model**: `SubscriptionPlan` (id, stripePriceId, name, tier, billingInterval, priceCents, currency default mxn, recipesLimit, ingredientsLimit, featuresJson, active). `Subscription` (userId, stripeCustomerId, stripeSubscriptionId, planId, status, period, cancelAtPeriodEnd, trialEnd).
- **Middleware**: Caches subscription for 60s via `src/lib/cache.ts` (`CacheEntry` model). Resolved through `resolveSubscription()` in `src/lib/subscription.ts`. Available as `Astro.locals.subscription`.
- **Feature flags**: 12 boolean keys checked against subscription plan's `featuresJson`. Gate features like `production_planner` in pages/routes.

### Data Layer

- **Models**: Ingredient, Recipe, RecipeIngredient, RecipePresentation, UserPreferences, SubscriptionPlan, Subscription, User, Session, Account, Verification, RateLimitEntry, CacheEntry, AuditLog.
- **UserPreferences.theme**: Accepts `"system"`, `"light"`, or `"dark"`. Default (no saved preference) is `"system"` — follow OS color scheme.
- **Relations**: Recipe `CASCADE` deletes RecipeIngredients. Ingredient `RESTRICT` on delete (blocked if referenced by any recipe — returns `{ status: "blocked", recipes: [...] }`).
- **RecipeIngredient**: Composite PK `@@id([recipeId, ingredientId])`.
- **Recipe update is destructive**: `$transaction` deletes all `RecipeIngredient` rows then re-creates.
- **Seed data**: `data/ingredients.json`, `data/recipes.json`. Loaded on first run via `seedIfNeeded()`. Seed script at `prisma/seed.ts` (run via `npx tsx prisma/seed.ts`).

### Pages & Routing

- **Protected** (requires `Astro.locals.session`): `/recipes`, `/recipes/[recipe]`, `/ingredients`, `/settings`, `/settings/billing`, `/produccion`.
- **Public**: `/`, `/sign-in`, `/sign-up`, `/forgot-password`, `/reset-password`, `/verify-email`, `/pricing`, `/privacy`, `/terms`, `/404`.
- `/produccion` also gated behind `production_planner` feature flag.

### Accessibility

- WCAG 2.1 AA minimum: sufficient color contrast, keyboard navigation, semantic HTML, screen-reader support.
- Dark mode supported through token remapping: `html[data-theme="dark"]` toggles CSS custom property overrides at the `:root` level. No `.dark` class selectors in component or page styles.
- All animations respect `prefers-reduced-motion: reduce` (disabled entirely via `animation: none !important`).

## Development Workflow

- All changes go through feature branches using Speckit sequential numbering (`001-feature-name`).
- Before merge: `pnpm astro check` (type-check) and `pnpm eslint .` (lint) MUST pass with zero errors.
- Migration workflow: `npx prisma migrate dev --name <name>` → review → `npx prisma generate` → commit migration files.
- Commit: `npx prisma generate` runs automatically on `postinstall`.
- Seed: `npx tsx prisma/seed.ts` for manual seeding. Automatic via `seedIfNeeded()` on first run.
- Commit messages follow conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`.
- No test infrastructure currently exists. When added, tests MUST be a non-negotiable gate.

### Client-side Patterns

- **Binding guards**: `data-*-bound="1"` attributes prevent duplicate listener binding across SPA navigations.
- **Lifecycle**: Bind on both `astro:page-load` and `astro:after-swap`.
- **Theme**: `applyTheme()` reads `html.dataset.theme` / `html.dataset.accent`. No `.dark` CSS overrides — semantic tokens auto-adapt.
- **Optimistic updates**: Preference changes (theme, accent) apply optimistically in the UI before server confirmation. On server failure, revert to previous state and show non-blocking error notification.
- **Dialog**: Native `<dialog>` with `data-animated` for enter/exit transitions. `bindDialogBackdrop(dialogElement)` for click-outside-to-close (`src/lib/dialog.ts`).
- **Sign-in/sign-out**: Popup or open-in-tab flow with rate limiting (`src/lib/sign-in.ts`, `src/lib/sign-out.ts`).

### Recipe Instructions

- Markdown-to-HTML rendering via `src/lib/instructions-parser.ts`: parses headings, steps, `@ingredient` references, timer badges, temperature badges, step groups.
- WYSIWYG editor (`InstructionsEditor.astro`) with toolbar (bold, italic, heading, list, ordered list) and `@ingredient` mention autocomplete.
- Cooking mode (`CookingMode.astro`): full-screen overlay displaying step by step with kitchen timer.

## Governance

This Constitution supersedes all other practices, guidelines, and conventions. Any conflict between this Constitution and a local convention resolves in favor of the Constitution.

**Amendment Process:**

1. Propose the change with documented rationale referencing specific user need or technical debt.
2. If MAJOR or MINOR: seek team review and approval with 48h comment period.
3. Update the Constitution, increment the version, set `LAST_AMENDED_DATE` to today.
4. Propagate changes to dependent templates if needed.
5. Announce changes in next team communication.

**Compliance:**

- All PRs and reviews MUST verify Constitution compliance.
- Complexity MUST be justified. If a solution is harder than the problem, it is a violation of Principle I (Clean Code).
- Violations of NON-NEGOTIABLE principles (I, III, VI, IX) block merge until resolved.
- DEFAULT principle violations require documented justification in PR.

**Versioning:**

- **MAJOR**: Backward-incompatible governance changes, principle removals or redefinitions that require existing code changes.
- **MINOR**: New principle or materially expanded guidance, addition of NON-NEGOTIABLE designation to existing DEFAULT principle.
- **PATCH**: Clarifications, wording refinements, typo fixes, non-semantic expansions.

---

## Principles Application Guide

This guide helps contributors know WHEN and HOW to apply each principle during development.

| Decision Point | Apply These Principles | Why |
|----------------|----------------------|-----|
| Writing a new component | I (Clean Code), III (Design), VI (Components) | Ensures single responsibility, proper typing, design consistency |
| Adding an API route | I (Clean Code), IV (Types), IX (Error Handling) | Proper error boundaries, type safety, no stack traces |
| Database query | I (Clean Code), VIII (Scalability) | Index review, no N+1, pagination |
| UI change | II (Simple UX), III (Design) | State trinity, semantic tokens, no hardcoded colors |
| Adding dependency | V (Technology Lock-in), VII (Performance) | Bundle size impact, stack alignment |
| Error handling | I (Logging), IX (Resilience) | Structured logging, graceful degradation |
| Performance work | VII (Performance), VIII (Scalability) | Caching, connection management, bundle size |
| Observability work | X (Observability) | Health checks, structured logging, metrics |
| Creating new UI component | III (Design System Mandate), VI (Components) | Must use @/components/ui barrel, no duplication |

### Quick Reference: NON-NEGOTIABLE Checklist

Before any PR, verify:

- [ ] No `any` types in component props
- [ ] No hardcoded colors (only semantic tokens)
- [ ] Error boundaries at API routes (no unhandled exceptions)
- [ ] No `console.log` in committed code
- [ ] No commented-out code
- [ ] File < 300 lines, function < 50 lines
- [ ] State trinity (loading/empty/error) on all views
- [ ] Props typed and documented
- [ ] All UI primitives from `@/components/ui` barrel — no custom duplicates

---

**Version**: 2.0.0 | **Ratified**: 2026-05-25 | **Last Amended**: 2026-05-28
