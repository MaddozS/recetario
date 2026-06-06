# Analysis Report: Badge Dark Mode Flash

Created: 2025-06-05
Orchestrator: orchestrator
Complexity: ajuste

## Request Summary
Badge component flashes white on page reload when in dark mode.

## Target Location
- **Primary anchor**: `src/components/ui/Badge.astro` (consumer), `src/lib/accent-colors.ts` (root cause)
- **Layer**: component / CSS tokens

## Surrounding Context
- Badge uses Tailwind utility classes: `bg-accent-100`, `text-accent-700`, `border-accent-200`
- Theme system: `<html style="...">` gets inline `--aw-accent-*` vars from `getAccentCssVars()` via SSR
- Blocking script in `<head>` handles `system` theme preference before first paint
- `global.css` defines `--color-accent-100: var(--aw-accent-100, #e0e7ff)` in `@theme` block
- Tailwind generates `.bg-accent-100 { background-color: var(--color-accent-100) }`

## Root Cause
CSS variable chain has missing link at initial paint:

`bg-accent-100` → `var(--color-accent-100)` → `var(--aw-accent-100, #e0e7ff)`

- `--aw-accent-100` is set via inline `style` on `<html>` (SSR) — available immediately ✅
- `--color-accent-100` is defined only in CSS file via `@theme` — not available until CSS loads ❌
- Until CSS loads, `.bg-accent-100` resolves to `transparent` → white appearance in dark mode

## Codebase Patterns to Follow
- Semantic tokens via `@theme` + CSS custom properties
- No `.dark` CSS overrides — tokens auto-adapt
- Inline style on `<html>` for accent colors via `getAccentCssVars()`

## Complexity Assessment
- **Decision**: ajuste
- **Rationale**: Localized fix in a single function. No new pages, routes, APIs, DB changes, auth changes, or billing changes.

## Dependencies & Prerequisites
- None

## Past Related Work
- None directly related
