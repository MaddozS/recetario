# Implementation Plan: Página de Registro de Usuario

**Branch**: `005-sign-up-page` | **Date**: 2026-05-27 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-sign-up-page/spec.md`

## Summary

Add first-name and last-name fields to the sign-up form and to the User model (Better Auth `additionalFields`). Enable Google sign-up (account creation) on the sign-up page with profile field mapping. Update Prisma schema with migration for `firstName`/`lastName` columns. Maintain existing `LandingLayout` visual consistency with the sign-in page.

## Technical Context

**Language/Version**: TypeScript 5.x (strict), Astro 6 SSR

**Primary Dependencies**: Better Auth (server: `src/lib/auth.ts`, client: `src/lib/auth-client.ts`), Prisma ORM (`@prisma/adapter-pg`), Tailwind V4, astro-icon (lucide)

**Storage**: PostgreSQL via Prisma. User model in `user` table.

**Testing**: No test infrastructure. Manual verification via `pnpm dev`.

**Target Platform**: Web (Vercel deployment via `@astrojs/vercel`)

**Project Type**: Web application — SSR Astro pages, no client-side framework

**Performance Goals**: Standard web app — sign-up form submission < 3s, page load < 2s

**Constraints**: TypeScript strict mode, no Astro Actions (POST to same page), semantic CSS tokens only (no `.dark` overrides), `LandingLayout` wrapper

**Scale/Scope**: Single page (`/sign-up`), 1 Prisma migration, 1 auth config change, 1 client-side function update

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle | Status | Notes |
|-----------|--------|-------|
| I. Clean Code (NON-NEGOTIABLE) | PASS | Existing patterns followed. No dead code. `@/lib/db/*` barrel for DB access. |
| II. Simple UX, Clear UI | PASS | Form follows sign-in page patterns. POST to same page. Spanish UI. |
| III. Design by Constitution (NON-NEGOTIABLE) | PASS | `LandingLayout`, semantic tokens, flat-by-default, same structure as sign-in. |
| IV. TypeScript Strictness + Type Safety | PASS | `additionalFields` types inferred from auth config. Prisma types as source of truth. |
| V. Technology Lock-in | PASS | No new frameworks. Astro + Tailwind + Prisma + Better Auth only. |
| Security & Data | PASS | Rate limiting exists. CSRF in middleware. AuditLog for sign_up events. |
| Accessibility | PASS | Keyboard navigable inputs/toggles. Semantic HTML. |

## Project Structure

### Documentation (this feature)

```text
specs/005-sign-up-page/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API contracts)
└── tasks.md             # Phase 2 output (/speckit.tasks — NOT created here)
```

### Source Code (repository root)

```text
src/
├── pages/
│   └── sign-up.astro          # Main page — add firstName/lastName fields
├── lib/
│   ├── auth.ts                # Better Auth config — add additionalFields, mapProfileToUser
│   ├── auth-client.ts         # Client auth (no changes needed)
│   ├── sign-in.ts             # Update signUpWithEmail signature, add signUpWithGoogle
│   └── db/
│       └── audit.ts           # Audit log (no changes — sign_up already handled)
prisma/
├── schema.prisma              # Add firstName/lastName to User model
└── migrations/                # Migration for new columns
```

**Structure Decision**: Single Astro web app. Changes scoped to auth config, single page, Prisma schema, and sign-up helper. Existing patterns and layouts reused.

## Complexity Tracking

> No violations to justify. All gates pass.
