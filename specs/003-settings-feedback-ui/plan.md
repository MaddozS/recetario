# Implementation Plan: Settings Feedback UI

**Branch**: `003-settings-feedback-ui` | **Date**: 2026-05-26 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-settings-feedback-ui/spec.md`

## Summary

Replace native `alert()` calls on the settings page with design system-compliant `FeedbackAlert` components. Add disabled button states with visual indicators (reduced opacity, not-allowed cursor) for empty/invalid forms. Add loading spinners during form submission. Ensure focus management for accessibility. All changes are client-side within `src/pages/settings.astro` leveraging existing `Button` and `FeedbackAlert` components.

## Technical Context

**Language/Version**: TypeScript (strict mode)

**Primary Dependencies**: Astro components, Tailwind V4 (semantic tokens), astro-icon (lucide)

**Storage**: PostgreSQL via Prisma (`UserPreferences` model) — no schema changes

**Testing**: None (per constitution — no test infrastructure)

**Target Platform**: Web (Vercel SSR via `@astrojs/vercel`)

**Project Type**: Web application (Astro 6 SSR)

**Performance Goals**: Feedback within 500ms of form submission

**Constraints**: Zero native `alert()` calls; all feedback via `FeedbackAlert` with `success-*` / `danger-*` semantic tokens; preserve optimistic update pattern; no new UI components

**Scale/Scope**: Single page (`/settings`), 3 form sections (preferences, email, password), client-side behavior changes only

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

| Gate                            | Status  | Notes                                                                                                                                              |
| ------------------------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| **I. Clean Code**               | ✅ PASS | No new duplicate patterns; follows existing optimistic update pattern                                                                              |
| **II. Simple UX, Clear UI**     | ✅ PASS | Inline validation, sensible defaults, Spanish copy preserved                                                                                       |
| **III. Design by Constitution** | ✅ PASS | The One Voice Rule (accent on primary only), The Token Bridge Rule (all semantic tokens), The Theme Triad Rule, The Independence Rule — all upheld |
| **IV. TypeScript Strictness**   | ✅ PASS | No new data types needed; Prisma types unchanged                                                                                                   |
| **V. Technology Lock-in**       | ✅ PASS | No new dependencies; uses existing `Button` and `FeedbackAlert` components                                                                         |
| **Accessibility**               | ✅ PASS | WCAG 2.1 AA: focus management added to FeedbackAlert; disabled states meet contrast requirements                                                   |

**Constitution Findings**: All gates pass. Feature aligns with existing patterns (optimistic updates, POST-to-page forms, semantic tokens). No Complexity Tracking entries needed.

## Project Structure

### Documentation (this feature)

```text
specs/003-settings-feedback-ui/
├── plan.md              # This file
├── spec.md              # Feature specification
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
└── contracts/           # Phase 1 output (empty — no external interfaces)
```

### Source Code (repository root)

```text
src/
└── pages/
    └── settings.astro   # All changes: 3 <script> blocks + template updates
```

**Structure Decision**: Single page, single file. All changes are within `src/pages/settings.astro`. No new files, components, or pages.

## Complexity Tracking

_Not applicable — all Constitution gates pass with no violations._
