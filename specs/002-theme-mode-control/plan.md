# Implementation Plan: Theme Mode Control

**Branch**: `002-theme-mode-control` | **Date**: 2026-05-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-theme-mode-control/spec.md`

## Summary

Add system-aware theme mode control (system-default / light / dark) to the app.
Users can set their preference in Settings > Preferences. The system detects OS
color scheme as the default when no preference is saved. Changes apply
optimistically with real-time OS tracking for the "System" option.

## Technical Context

**Language/Version**: TypeScript (strict), Node >=22.12.0, Astro 6 SSR

**Primary Dependencies**: Prisma ORM (PostgreSQL), Tailwind V4, Better Auth,
`astro-icon` (lucide), DOM Purify wrapper (`src/lib/html-sanitizer.ts`)

**Storage**: PostgreSQL via Prisma — `UserPreferences` table (already exists)

**Testing**: No test infrastructure — manual validation via dev server

**Target Platform**: Web — Vercel SSR (ephemeral, requires DATABASE_URL)

**Project Type**: Web application (SaaS — recipe management for kitchens)

**Performance Goals**: Theme toggle is instant (client-side only). Flash
prevention on load is the primary concern.

**Constraints**: WCAG 2.1 AA, optimistic UI updates (revert + notify on failure),
no `.dark` CSS overrides (semantic tokens handle dark mode), accent colors
are independent and out of scope.

**Scale/Scope**: Single feature affecting all authenticated pages (recipes,
ingredients, settings, production). Landing pages have their own separate
theme system and are unaffected.

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate | Rule                                                          | Status  | Notes                                                                                                                      |
| ---- | ------------------------------------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------- |
| G1   | Token Bridge Rule — no `.dark` CSS overrides                  | ✅ PASS | `applyTheme()` uses `html.dataset.theme` + semantic tokens                                                                 |
| G2   | Theme Triad Rule — three modes, reactive OS tracking          | ✅ PASS | Spec aligns with FR-001, FR-008                                                                                            |
| G3   | Independence Rule — theme/accent decoupled                    | ✅ PASS | Accent explicitly out of scope per spec Assumptions                                                                        |
| G4   | WCAG 2.1 AA — keyboard, screen reader, contrast               | ✅ PASS | FR-010 requires this                                                                                                       |
| G5   | Optimistic updates — apply immediately, revert on failure     | ✅ PASS | FR-009 matches constitution pattern                                                                                        |
| G6   | CSRF protection — POST forms must verify token                | ✅ PASS | Reuse existing `Astro.locals.csrfToken` + `validateCsrfToken()` in Settings POST handler                                   |
| G7   | Flash prevention — server-render correct theme when known     | ✅ PASS | Use inline blocking `<script is:inline>` in Layout.astro to read `matchMedia` before paint — same pattern as LandingLayout |
| G8   | TypeScript strict — no `any`, Prisma types as source of truth | ✅ PASS | No new types needed beyond `UserPreferences.theme` union extension                                                         |

## Project Structure

### Documentation (this feature)

```text
specs/002-theme-mode-control/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── db/
│   │   ├── preferences.ts    # Updated: extend theme type + validation
│   │   └── types.ts          # Updated: add "system" to theme union
│   └── accent-colors.ts      # Unchanged
├── components/ui/            # No new components needed (Settings page uses inline HTML)
├── pages/
│   └── settings.astro        # Updated: add Preferences tab HTML content
└── layouts/
    └── Layout.astro          # Updated: applyTheme() add system detection + OS listener
```

**Structure Decision**: Astro web app — files modified in-place across existing
`src/` structure. No new directories needed.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

| Violation                  | Why Needed         | Simpler Alternative Rejected Because |
| -------------------------- | ------------------ | ------------------------------------ |
| [e.g., 4th project]        | [current need]     | [why 3 projects insufficient]        |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient]  |
