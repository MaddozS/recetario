# Outcome: Settings Feedback Disappear Bug Fix

**Date**: 2026-05-28
**Fix**: `src/pages/settings.astro:1009-1021`

## Bug

Name change form called `window.location.reload()` immediately after `showFeedback()`, erasing success/error message.

## Root cause

`window.location.reload()` at line 1014 caused full page re-render. All feedback divs reset to `class="hidden"` from server.

## Fix

1. **Removed** `window.location.reload()`
2. **Removed** dead `astro:after-swap` dispatch (lines 1011-1013)
3. **Added** DOM updates after successful save:
   - Profile header h2 textContent → `firstName lastName`
   - Avatar initial div textContent → `firstName.charAt(0).toUpperCase()`

## Verification

- `pnpm astro check`: 0 errors, 0 warnings
- `pnpm eslint src/pages/settings.astro`: clean

## Pattern

`showFeedback()` is client-side DOM. Calling `window.location.reload()` after it erases the feedback. Prefer DOM updates for in-page state changes.
