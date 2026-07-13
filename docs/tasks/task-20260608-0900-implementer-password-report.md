# Implementer Report: Replace inline password validation with shared lib
Date: 2026-06-08 09:00
Task File: docs/plans/plan-20260607-phase1-quick-wins.md (Task 2)
Agent: implementer

## Steps Executed
- **Step 1 (Add import)**: Added `import { validatePassword, getRuleResults } from "@/lib/password-validation";` after existing `setupPasswordToggles` import
- **Step 2 (Remove inline PASSWORD_RULES)**: Deleted lines 174-180 (the `const PASSWORD_RULES = [...]` array)
- **Step 3 (Remove inline validatePassword)**: Deleted lines 197-199 (the `function validatePassword(...)` declaration)
- **Step 4 (Update password input handler)**: Replaced `PASSWORD_RULES.forEach(...)` with `getRuleResults(password).forEach(...)` using `rule-${result.key}` and `result.passed`
- **Step 5 (Update form submit validation)**: Changed `if (!validatePassword(password))` to `if (!validatePassword(password).valid)`
- **Verification**: Ran `pnpm astro check` and `pnpm eslint .`

## Files Modified
- `src/pages/reset-password.astro`: Removed inline duplication of `PASSWORD_RULES` array and `validatePassword()` function; switched to shared `@/lib/password-validation` library imports (`validatePassword`, `getRuleResults`)

## Commands Executed
- `pnpm astro check`: 1 pre-existing error in `sign-up.astro` (unrelated `removeOverlay` variable), 0 new errors
- `pnpm eslint .`: 6 pre-existing errors across 3 files (graphify.js, Header.astro, auth.ts), 0 new errors

## Issues Encountered
- None. All edits applied cleanly with no type errors introduced.

## Verification
- `pnpm astro check`: Passes — only pre-existing error in `sign-up.astro` (unrelated to changes)
- `pnpm eslint .`: Passes — only pre-existing errors in unrelated files
