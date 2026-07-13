# Plan: Phase 1 — Quick Wins (Anti-Pattern Fixes)

Created: 2026-06-07
Orchestrator: orchestrator
Analysis: docs/analysis/analysis-20250607-component-extraction.md
Scope: Standalone — no dependencies on other phases

## Goal
Fix 3 anti-pattern violations and extract 1 utility to eliminate code duplication.

## Acceptance Criteria
- [ ] `PresentationCard.astro` line 229: `backdrop:bg-slate-900/50` → `backdrop:bg-backdrop/50`
- [ ] `src/lib/loading-overlay.ts` created with `showLoadingOverlay(message?: string): () => void`
- [ ] 5 call sites updated to use `showLoadingOverlay()`: sign-in.astro, sign-up.astro, Header.astro, BillingSection.astro, ingredients.astro
- [ ] `reset-password.astro` lines 174-199: replace inline `PASSWORD_RULES` + `validatePassword()` with `import { validatePassword, getRuleResults } from "@/lib/password-validation"`
- [ ] `pnpm astro check` passes
- [ ] `pnpm eslint .` passes

## Tasks

### Task 1: Fix backdrop + create loading overlay utility
- **Agent**: implementer
- **Skills**: ui-ux-pro-max
- **Summary**: 
  1. In `src/components/PresentationCard.astro` line 229, change `backdrop:bg-slate-900/50` to `backdrop:bg-backdrop/50`
  2. Create `src/lib/loading-overlay.ts` exporting `showLoadingOverlay(message?: string): () => void`. The function creates a fixed overlay with spinner (same pattern as current inline code), appends to body, returns a cleanup function that removes overlay and restores body overflow.
  3. Update these 5 files to use the utility instead of inline overlay creation:
     - `src/pages/sign-in.astro` lines 206-213 (email submit) and lines 274-281 (Google submit)
     - `src/pages/sign-up.astro` lines 298-305 (form submit) and lines 387-394 (Google submit)
     - `src/components/Header.astro` lines 151-159 (sign-out)
     - `src/pages/ingredients.astro` lines 1106-1114 (form submit)
     - `src/components/BillingSection.astro` — check if it has inline overlay, if so replace

### Task 2: Deduplicate password validation in reset-password
- **Agent**: implementer
- **Skills**: better-auth-best-practices
- **Summary**: In `src/pages/reset-password.astro`:
  1. Add import: `import { validatePassword, getRuleResults, PASSWORD_RULES } from "@/lib/password-validation"`
  2. Remove the inline `PASSWORD_RULES` array (lines 174-180)
  3. Remove the inline `validatePassword()` function (lines 197-199)
  4. Update `updateRuleDisplay()` to use `getRuleResults()` pattern from the shared lib
  5. The existing `@/lib/password-validation.ts` already exports `PASSWORD_RULES`, `validatePassword()`, and `getRuleResults()` — reuse them directly

### Task 3: Verify all changes
- **Agent**: reviewer
- **Skills**: verification-before-completion
- **Summary**: Run `pnpm astro check` and `pnpm eslint .`. Verify no `backdrop:bg-slate-900/50` remains in codebase. Verify no duplicate `PASSWORD_RULES` in reset-password.astro. Verify all 5 loading overlay sites use the shared utility.
