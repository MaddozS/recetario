<!--
Sync Impact Report — v1.0.0

Version change: (none) → 1.0.0
Modified principles: (all new — initial constitution)
Added sections:
  - I. Clean Code (NON-NEGOTIABLE)
  - II. Simple UX, Clear UI
  - III. Design by Constitution (DESIGN.md + PRODUCT.md)
  - IV. TypeScript Strictness + Type Safety
  - V. Technology Lock-in
  - Additional Constraints
  - Development Workflow
Removed sections: (none)
Templates requiring updates:
  - .specify/templates/plan-template.md: ✅ reviewed — no constitution check alignment needed (principles are declarative, no procedural gates)
  - .specify/templates/spec-template.md: ✅ reviewed — scope/requirements alignment is compatible
  - .specify/templates/tasks-template.md: ✅ reviewed — no new principle-driven task types needed beyond existing template
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
- Imports are organized: external → internal, absolute over relative.
- Commits are atomic and descriptive (`feat:`, `fix:`, `refactor:`, `docs:`).

### II. Simple UX, Clear UI

Every screen answers one question. Every interaction has one purpose.
Information is concise — never decorative, never redundant.

- Numbers own the page: costs, quantities, and margins render in JetBrains Mono
  with `font-variant-numeric: tabular-nums`. The font shift signals "this is
  data, not prose."
- Forms minimize friction: sensible defaults, keyboard-friendly tab order,
  inline validation, Spanish decimal format support via `parseNumberInput`.
- Empty states are instructive, never decorative. Show the user what to do next.
- Never display raw IDs, timestamps, or internal application state to users.
- UI copy is Spanish-first, kitchen-familiar. No jargon, no English holdovers.

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

### IV. TypeScript Strictness + Type Safety

TypeScript strict mode is enabled and enforced. Types are the source of truth
for data contracts.

- Prisma-generated types are the single source of truth for all data shapes.
  Never manually duplicate `Prisma.Ingredient`, `Prisma.Recipe`, etc.
- All database access goes through `@/lib/db/*` barrel exports. Direct Prisma
  client usage in pages/controllers is forbidden.
- API boundaries (form submissions, Stripe webhooks) use runtime validation:
  Zod schemas or Prisma-native validation.
- `noUncheckedIndexedAccess` is preferred. Access array elements via
  `.at(index)` or explicit undefined checks.

### V. Technology Lock-in

The stack is locked and MUST NOT change without a MAJOR constitution amendment.

- **Runtime**: Astro 6 SSR via `@astrojs/vercel`. Server-rendered Astro
  components. No additional frontend frameworks (React, Vue, Svelte, etc.).
  Client islands only where interactivity is unavoidable.
- **Build**: Vite + pnpm 11.1.2. Node >=22.12.0.
- **Database**: PostgreSQL via Prisma ORM with `@prisma/adapter-pg`. Connection
  pool: max 3, 30s idle timeout. Output: `generated/prisma/`.
- **Styling**: Tailwind V4 with semantic CSS tokens in `@theme`. All UI
  components in `@/components/ui` barrel.
- **Auth**: Better Auth (server singleton + client). Google OAuth only.
- **Billing**: Stripe (API version `2026-04-22.dahlia`). Checkout Sessions,
  Customer Portal, webhooks.
- **Deployment**: Vercel (ephemeral — `DATABASE_URL` MUST always be set).

## Additional Constraints

### Security & Data

- Multi-tenant: every database record is scoped by `ownerId`.
- All user-generated HTML content MUST be sanitized via DOMPurify (allowlist in
  `src/lib/html-sanitizer.ts`).
- Webhook signature verification is mandatory for all Stripe webhook endpoints.
- Rate limiting on auth routes (`src/lib/sign-in.ts`, `src/lib/sign-out.ts`).
- No secrets in code. Environment variables for all API keys, database URLs,
  and Stripe credentials.

### Performance

- Static where possible, dynamic only where user-specific data is required.
- Subscription cache: 60s TTL via `src/lib/cache.ts`.
- No orchestrated page-load animation sequences. Product loads into a task.

### Accessibility

- WCAG 2.1 AA minimum: sufficient color contrast, keyboard navigation, semantic
  HTML, screen-reader support.
- Dark mode supported through token remapping, not CSS overrides.
- All animations respect `prefers-reduced-motion: reduce`.

## Development Workflow

- All changes go through feature branches using Speckit sequential numbering
  (`001-feature-name`).
- Before merge: `pnpm astro check` (type-check) and `pnpm eslint .` (lint) MUST
  pass with zero errors.
- Migration workflow: `npx prisma migrate dev --name <name>` → review →
  `npx prisma generate` → commit migration files.
- Seed data (`data/ingredients.json`, `data/recipes.json`) loads on first run
  via `seedIfNeeded()`.
- Commit messages follow conventional commits:
  `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `style:`.
- No test infrastructure currently exists. When added, tests MUST be a
  non-negotiable gate.

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

**Version**: 1.0.0 | **Ratified**: 2026-05-25 | **Last Amended**: 2026-05-25
