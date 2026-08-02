# Implementation Plan: Página de Inicio de Sesión

**Branch**: `004-sign-in-page` | **Date**: 2026-05-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-sign-in-page/spec.md`

## Summary

Refactor existing sign-in page (`src/pages/sign-in.astro`) to meet security requirements: generic error messages that don't leak account existence, Google OAuth restricted to existing accounts only (no auto-creation via `disableSignUp`), and `?redirect=` query param support for post-auth deep-linking. No new pages, no new DB models. Changes touch 3 files: the sign-in page, sign-in lib, and auth config.

Impeccable audit score: **18/20** (Excellent). 1 P1 responsive issue, 2 P2 accessibility gaps, 1 P3 polish item. See [impeccable-audit.md](./impeccable-audit.md).

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode), Astro 6

**Primary Dependencies**: Better Auth (server + client), `@/lib/sign-in`, `@/components/ui` (Button, Icon), LandingLayout

**Storage**: PostgreSQL via Prisma (no schema changes needed)

**Testing**: No test infrastructure exists

**Target Platform**: Web (Vercel SSR), all screen sizes responsive

**Project Type**: Web application (Astro SSR page)

**Performance Goals**: Sign-in latency <5s email, <8s Google (per SC-001/SC-002)

**Constraints**: Spanish locale, semantic CSS tokens only, no hardcoded colors, no Astro Actions, LandingLayout

**Scale/Scope**: 1 existing page modified, 2 supporting files modified, 0 new files

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Principle                   | Status  | Notes                                                            |
| --------------------------- | ------- | ---------------------------------------------------------------- |
| I. Clean Code               | ✅ PASS | <300 lines per file, no new files, no dead code                  |
| II. Simple UX, Clear UI     | ✅ PASS | Single-purpose page, Spanish UI, semantic tokens                 |
| III. Design by Constitution | ✅ PASS | LandingLayout, `bg-card`, `text-foreground`, no hardcoded colors |
| IV. TypeScript Strictness   | ✅ PASS | All changes in `.ts`/`.astro` with strict types                  |
| V. Technology Lock-in       | ✅ PASS | Astro 6, Better Auth, Tailwind V4 — no new tech added            |

**Gate result: PASS**. No violations. No complexity tracking needed.

## Project Structure

### Documentation (this feature)

```text
specs/004-sign-in-page/
├── plan.md              # This file
├── research.md          # Phase 0: Better Auth disableSignUp, redirect patterns
├── data-model.md        # Phase 1: Entity reuse, state transitions, validation
├── quickstart.md        # Phase 1: Step-by-step implementation guide
├── impeccable-audit.md  # Phase 1: Impeccable audit (18/20 Excellent)
└── tasks.md             # Phase 2 output (by /speckit.tasks)
```

### Source Code (modified files only)

```text
src/
├── pages/
│   └── sign-in.astro       # MAIN: rewrite JS logic + redirect support
├── lib/
│   ├── auth.ts              # Add disableSignUp: true to Google provider
│   └── sign-in.ts           # Update signInWithGoogle for redirect param
```

### Source Code (read-only dependencies)

```text
src/
├── lib/
│   ├── auth-client.ts       # Better Auth client (unchanged)
│   ├── csrf.ts / csrf-client.ts  # CSRF protection (unchanged)
│   └── sign-in.ts           # Sign-in helpers (unchanged)
├── layouts/
│   └── LandingLayout.astro  # Landing page wrapper (unchanged)
├── components/
│   └── ui/                  # Button, Icon (unchanged)
└── middleware.ts            # Session guard (unchanged, already blocks auth pages for logged-in users)
```

**Structure Decision**: No new files. Modify 3 existing files only. Follow same patterns as current codebase (binding guards, Astro lifecycle, Spanish locale).
