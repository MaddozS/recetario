# Research: Settings Feedback UI

**Phase**: 0 — Outline & Research

## Decisions

### Decision 1: Feedback component to replace native `alert()`

- **Decision**: Use existing `FeedbackAlert` component
- **Rationale**: Already exists, uses correct semantic tokens (`success-bg`, `success-border`, `text-success`, `danger-bg`, `danger-border`, `text-danger`), supports `aria-live` and `role="alert"` for accessibility. Replacing native `alert()` requires no new component, just wiring the existing component into the optimistic save error path.
- **Alternatives considered**: 
  - Native `alert()` — violates design system, no styling, no accessibility
  - Custom toast — unnecessary complexity, `FeedbackAlert` already serves this purpose

### Decision 2: Loading state for submit buttons

- **Decision**: Use the existing `loading` prop on `Button` component
- **Rationale**: Button component already supports `loading` prop that renders a spinner SVG, disables the button, and sets `aria-busy="true"`. No changes needed to `Button.astro`.
- **Alternatives considered**: 
  - Manual spinner element — duplicates existing functionality
  - Disable only without spinner — insufficient feedback for slow connections

### Decision 3: Disabled button state for empty forms

- **Decision**: Use the existing `disabled` prop on `Button` component
- **Rationale**: `Button.astro` already applies `disabled:opacity-70` and `disabled:cursor-not-allowed` CSS classes. The spec requires adding client-side validation listeners to toggle the `disabled` attribute based on field values.
- **Alternatives considered**: N/A — trivial implementation

### Decision 4: Focus management on FeedbackAlert

- **Decision**: Call `.focus()` on the `FeedbackAlert` element after dynamic insertion
- **Rationale**: WCAG best practice for dynamic content. `FeedbackAlert` already has `role="alert"` — adding focus ensures screen readers announce immediately.
- **Alternatives considered**: Rely solely on `aria-live="assertive"` — slower announcement, not guaranteed across all screen readers

## Existing Patterns Identified

- **Change email form**: Already uses inline feedback via `showFeedback()` with semantic tokens (`#change-email-feedback` element). Uses `fetch()` to API endpoint.
- **Change password form**: Same pattern as email form (`#change-password-feedback`). Uses `fetch()` to API endpoint.
- **Preferences form**: Uses optimistic save via `fetch()`, reverts on error, uses native `alert()` for error notification. This is the main target for replacement.
- **Binding guards**: All client scripts use `data-*-bound="1"` for SPA navigation safety.
- **Lifecycle**: All scripts bind on `astro:page-load`, `astro:after-swap`, and call immediately.

## Architectural Constraints

- Feature is entirely client-side within `src/pages/settings.astro`
- No backend changes required (existing API endpoints for email/password change, existing `upsertUserPreferences` for preferences)
- No new files, imports, or dependencies
- Must preserve existing optimistic update behavior (revert on failure)
