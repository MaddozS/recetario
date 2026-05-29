# Data Model: Settings Feedback UI

**Phase**: 1 — Design & Contracts

## Entity: User Preference

**Source**: `prisma/schema.prisma` — `UserPreferences` model (existing, no changes)

| Field | Type | Notes |
|-------|------|-------|
| `id` | String (UUID) | Primary key |
| `userId` | String | FK to `User`, unique |
| `theme` | `"system" \| "light" \| "dark"` | Default "system" |
| `accentColor` | String (accent family key) | e.g., "indigo", "coral", "violet" |

**Relations**: Belongs to `User` (1:1)

**Operations**: Read via `getUserPreferences(userId)`, upsert via `upsertUserPreferences(userId, { theme, accentColor })` — no changes needed.

## UI State Model (client-side only)

Not persisted — managed entirely in client-side script within `settings.astro`.

### Form States

| Form | States | Validation | Submission |
|------|--------|------------|------------|
| Preferences | idle, changed, saving, error | Has changes vs original theme/accent | Optimistic fetch to `/settings?tab=preferences` |
| Change Email | idle, saving, success, error | email non-empty + valid format, password non-empty | Fetch to `/api/account/change-email` |
| Change Password | idle, saving, success, error | current password non-empty, new ≥6 chars, confirm matches new | Fetch to `/api/account/change-password` |

### Feedback Alert (instantiated per form)

| Property | Values | Notes |
|----------|--------|-------|
| `type` | `"success"` \| `"error"` | Determines token family |
| `message` | string | Human-readable Spanish text |
| `visible` | boolean | Toggled after submission result |
| `element` | HTMLElement | Inline div (account forms) or top-level FeedbackAlert (preferences) |

### Button States

| State | Visual | Behavior |
|-------|--------|----------|
| enabled | Full opacity, pointer cursor | Clickable, submits form |
| disabled (empty fields) | `opacity-70`, `cursor-not-allowed` | Not clickable |
| disabled (no changes) | `opacity-70`, `cursor-not-allowed` | Hidden via wrapper class for preferences |
| loading | Spinner replaces icon, `opacity-70` | Not clickable, `aria-busy="true"` |

## State Transitions

```
idle → changed (user modifies field/selection)
changed → saving (user clicks submit)
saving → success (API returns ok)
saving → error (API returns error or network fails)
saving → idle (restore original values on failure)
success → idle (reset form)
error → idle (user can retry)
```
