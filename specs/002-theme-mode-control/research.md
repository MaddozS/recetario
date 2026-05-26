# Research: Theme Mode Control

## Decisions

### D1: Flash prevention for "System" users (G7)

**Decision**: Use an inline blocking `<script is:inline>` in `Layout.astro` that
reads `window.matchMedia('(prefers-color-scheme: dark)')` and sets
`document.documentElement.dataset.theme` before the first paint. This mirrors
the pattern already used in `LandingLayout.astro` for landing pages.

**Rationale**:
- Works in all browsers that support `prefers-color-scheme` (no Chromium-only
  client hints dependency)
- Already proven pattern in the codebase (`LandingLayout.astro` line 49-54)
- No additional server-side infrastructure needed
- The server renders a default theme (light), the inline script corrects it
  before any content paints for "System" users

**Alternatives considered**:
- Server-side via `Sec-CH-Prefers-Color-Scheme` header: Chromium-only, adds
  middleware complexity, no fallback for Firefox/Safari
- Server-side via `User-Agent` detection: Unreliable, inaccurate
- Cookie-based resolved theme: Adds extra cookie round-trip

### D2: Validating "system" as a theme value in UserPreferences (G6)

**Decision**: The `theme` field in `UserPreferences` is currently a free-text
`String` in Prisma. No schema migration is needed — validation will happen
at the application layer in `src/lib/db/preferences.ts` and the TypeScript type
in `src/lib/db/types.ts`.

**Rationale**:
- The existing Prisma schema stores `theme` as `String` (not an enum), so
  adding `"system"` as a valid value does not require a migration
- Runtime validation in `upsertUserPreferences()` will reject invalid values
- The TypeScript union type `"light" | "dark" | "system"` provides compile-time
  safety

### D3: CSRF for Settings Preferences form (G6)

**Decision**: Reuse the existing CSRF mechanism. The form needs a hidden input
`<input type="hidden" name="csrf" value={Astro.locals.csrfToken} />` and the
server-side handler already validates CSRF via `validateCsrfToken()`.

**Rationale**:
- The Settings page already has CSRF set up (lines 59-83 in settings.astro)
- The POST handler reads `theme` and `accent` fields — just need to wire the
  Preferences tab form with the same mechanism
- Client-side CSRF helper at `src/lib/csrf-client.ts` reads the token cookie

### D4: OS theme change listener (FR-008)

**Decision**: In `applyTheme()` in `Layout.astro`, add a
`window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)`
listener that re-evaluates the effective theme when the OS preference changes.
Only active when user preference is `"system"`.

**Rationale**:
- Simple, well-documented browser API
- No external dependencies needed
- Listener is cleaned up on page navigation (astro:before-swap)

### D5: Accent color independence

**Decision**: The Preferences tab will show theme selection (system/light/dark)
and accent color picker as two separate, independent controls. Changing one
does not affect the other.

**Rationale**:
- Constitution Independence Rule
- Existing JS (`setupSettings()` in settings.astro) already separates
  `updateThemeOptions()` and `updateAccentOptions()` — the HTML just needs
  to match
