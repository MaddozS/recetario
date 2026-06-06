# Explore Report: Badge FOUC (Flash of Unstyled Content) Investigation

Date: 2025-06-05
Agent: explorer
Task File: prompt instructions

## Target Area Explored
- **Primary files**: `src/components/ui/Badge.astro`, `src/styles/global.css`, `src/layouts/Layout.astro`, `src/lib/accent-colors.ts`
- **Adjacent files**: `src/layouts/LandingLayout.astro`, `src/pages/settings.astro`, `src/lib/db/preferences.ts`

## Root Cause Found: Yes — WITH HIGH CONFIDENCE

### The Bug

When user sets theme to `"system"` and their OS is in dark mode, the Badge flashes a light/bright color on page reload.

**Root cause: The blocking `<script is:inline>` in Layout.astro correctly toggles the `dark` CSS class on `<html>`, but does NOT update the inline CSS custom properties (`--color-accent-*` / `--aw-accent-*`) to their dark mode values.**

### Detailed Sequence

1. **Server render** (Layout.astro:24-27):
   ```
   const theme = userPrefs?.theme ?? 'system';            // 'system'
   const accentCssVars = getAccentCssVars(accent, theme);  // 'coral', 'system'
   ```
   `getAccentCssVars('coral', 'system')` → `isDark = false` → generates LIGHT mode values:
   ```
   --aw-accent-100:#fde0d8;--color-accent-100:#fde0d8;
   ```

2. **Server-rendered HTML**:
   ```html
   <html class="" data-theme="system" data-app-theme="system"
         style="--aw-accent-50:#fef2ef;--color-accent-50:#fef2ef;...">
   ```
   Note: no `dark` class, light accent vars.

3. **Blocking `is:inline` script runs** (Layout.astro:33-49):
   - Detects `data-app-theme="system"` + OS prefers dark
   - Adds `class="dark"` to `<html>` → semantic tokens (bg, card, text, border) switch to dark
   - **Does NOT update `html.style.cssText`** → `--color-accent-100` stays `#fde0d8` (light coral)
   - Sets `html.dataset.theme = 'dark'`

4. **First paint**: Badge with `bg-accent-100` resolves to `var(--color-accent-100)` = `var(--aw-accent-100, #e0e7ff)` = `#fde0d8` (light coral) on a dark page background → **bright flash**

5. **Non-blocking `<script>` at page bottom runs** `applyTheme()` (Layout.astro:226-241):
   - Sets `html.style.cssText = getAccentCssVars('coral', 'dark')` → dark mode values:
     ```
     --aw-accent-100:#962e39;--color-accent-100:#962e39;
     ```
   - Badge background becomes `#962e39` (dark red-brown) → correct dark mode, flash gone

### Why the Previous Fix Didn't Work

The previous fix added `--color-accent-${shade}:${value}` alongside `--aw-accent-${shade}:${value}` in the `getAccentCssVars()` output. This addressed the WRONG problem:

- **It wasn't about which CSS variable names are used** — both `--aw-accent-*` and `--color-accent-*` are set correctly
- **The problem is the VALUES** — they're generated in LIGHT mode when `theme === "system"` because the server doesn't know the user's OS preference
- The `getAccentCssVars()` function receives `theme = "system"` and `isDark = theme === "dark"` evaluates to `false`, so it always outputs light values

## Evidence

- `global.css:16-17` confirms:
  ```css
  --color-accent-100: var(--aw-accent-100, #e0e7ff);
  ```
- Built CSS confirms `.bg-accent-100 { background-color: var(--color-accent-100); }` — standard Tailwind v4 utility generation
- `accent-colors.ts:159-169` confirms `isDark = theme === "dark"` — only resolves to `true` when `theme === "dark"` string exactly
- `Layout.astro:24` — theme is `userPrefs?.theme ?? 'system'` — when `"system"`, the server always renders light vars
- `Layout.astro:33-49` blocking script confirms it only handles `class="dark"` and `data-theme`, NOT CSS variables
- `Layout.astro:226-241` non-blocking `applyTheme()` confirms it does set both class and CSS vars, but runs AFTER first paint

## For Explicit Dark Mode Users (`data-app-theme="dark"`)

No flash occurs:
1. Server renders `class="dark"` and `getAccentCssVars('coral', 'dark')` (dark mode vars) — both correct
2. Blocking script sees `stored = 'dark'`, skips `if (stored === 'system')` block — does nothing (already correct)
3. `applyTheme()` runs later and sets same values — no change

## UI Conventions

- Badge uses `bg-accent-100`, `text-accent-700`, `border-accent-200`
- All resolve to CSS variables that come from inline `style` on `<html>`
- The `dark` CSS class only overrides semantic tokens (bg, card, muted, fg, borders, danger, success, warning) — NOT the accent-specific vars
- `.dark` in `global.css:106-134` does NOT set `--color-accent-*` or `--aw-accent-*` values
- Accent colors are managed entirely through JS-powered inline styles

## Tech Debt / Adjacent Issues

1. **Same bug exists on LandingLayout.astro:49-54** — blocking script only handles `dark` class, not CSS vars. But LandingLayout is mostly used for light mode marketing pages, so it's less visible.
2. **`html.style.cssText = ...` is destructive** — `applyTheme()` and settings' `updateLivePreview()` both overwrite ALL inline styles. Currently no other inline styles exist, but this is fragile.

## Commands Executed

- `read` on all key source files (Badge.astro, global.css, Layout.astro, accent-colors.ts, LandingLayout.astro, settings.astro, preferences.ts)
- `grep` for Badge usage, applyTheme, getAccentCssVars, classList.remove('dark'), data-app-theme
- `grep` built CSS output to verify `.bg-accent-100` utility class generation
- `grep` build artifact for accent-100 references

## Files Read

- `src/components/ui/Badge.astro`: Full component — uses `bg-accent-100`, `text-accent-700`, `border-accent-200`
- `src/styles/global.css`: Full file — `@theme` defines `--color-accent-100: var(--aw-accent-100, #e0e7ff)`, `.dark` only overrides semantic tokens, NOT accent vars
- `src/layouts/Layout.astro`: Full layout — blocking script only handles `dark` class, NOT CSS vars; `applyTheme()` fixes vars but runs after first paint
- `src/layouts/LandingLayout.astro`: Full layout — same issue with blocking script
- `src/lib/accent-colors.ts`: Full file — `getAccentCssVars()` only generates dark vars when `theme === "dark"` string literal
- `src/lib/db/preferences.ts`: Full file — default theme is `"system"` when no preferences set
- `src/pages/settings.astro`: Theme preview logic — `updateLivePreview()` correctly uses `getEffectiveTheme()` before calling `getAccentCssVars()`
- Build CSS output: Contains `.bg-accent-100 { background-color: var(--color-accent-100); }`

## Recommendations for Orchestrator

### Fix (High Confidence)

The blocking `is:inline` script in `Layout.astro` must also update the inline CSS custom properties when the effective theme resolves to dark mode but the server rendered light values.

**Approach A — Pre-compute both sets (recommended):**
Pass both light and dark accent CSS vars as data attributes, and let the blocking script pick the right one:

1. In Layout.astro frontmatter, compute both sets:
   ```typescript
   const accentCssVarsLight = getAccentCssVars(accent, 'light');
   const accentCssVarsDark = getAccentCssVars(accent, 'dark');
   ```
2. Render them as data attributes on `<html>`:
   ```html
   data-accent-vars-light={accentCssVarsLight}
   data-accent-vars-dark={accentCssVarsDark}
   ```
3. In the blocking script, after determining the effective theme, apply the correct vars:
   ```javascript
   html.style.cssText = isDark
     ? html.dataset.accentVarsDark
     : html.dataset.accentVarsLight;
   ```

**Approach B — Always render dark vars when theme is `"system"`:**
If `theme === 'system'`, pessimistically render dark mode accent vars (since dark-on-dark is less jarring than light-on-dark flash). The explicit `"light"` case still renders light vars. This would mean dark OS = correct, light OS = slightly dark accents (acceptable).

**Approach C — Inline color data in the blocking script:**
Embed the accent color definitions directly in the `<script>` tag so the blocking script can compute the correct vars without imports. More complex and harder to maintain.

**Recommendation: Approach A.** It's clean, has zero FOUC, works for all theme/accent combinations, and keeps the color data in `accent-colors.ts`.

### Risks to Watch For
- The `html.style.cssText = ...` approach is destructive — ensure no other inline styles need to be preserved
- The data attributes on `<html>` add a small amount of HTML size (about 1KB)
- View transitions (`astro:before-swap`, `astro:after-swap`) already handle this correctly via `applyTheme()`

### Adjacent Code That Might Need Changes
- `LandingLayout.astro` has the same pattern (though less critical since landing is usually light mode)
- The `getAccentCssVars()` function signature could be extended (e.g., accept `theme: 'system' | 'light' | 'dark'` and resolve `'system'` internally)
