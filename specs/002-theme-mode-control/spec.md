# Feature Specification: Theme Mode Control

**Feature Branch**: `002-theme-mode-control`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "El sistema leera que tema usará apartir de la configuración el equipo del usuario, con la opción de forzar o actualizar el tipo, es decir, podrá seleccionar su tema entre claro y oscuro. Los colores de acentuación es aparte. Verifica otras especificaciones, esquemas, y todo lo que pueda afectar a esta especificación para aplicarla correctamente"

## Clarifications

### Session 2026-05-26

- Q: What should happen when saving a theme preference fails (network error, server error)? → A: Apply the change optimistically client-side, revert to previous state and show error notification on server failure.
- Q: What accessibility level should the theme selector meet? → A: Standard WCAG 2.1 AA compliance.

## User Scenarios & Testing

### User Story 1 - Set theme preference in Settings (Priority: P1)

A signed-in user navigates to Settings > Preferences and selects their preferred theme mode. They can choose between following their system's appearance setting, or explicitly selecting light or dark mode. The change takes effect immediately across the app.

**Why this priority**: Core functionality requested — users must be able to select their theme and override the system default. This is the primary interaction point for theme control.

**Independent Test**: Can be fully tested by signing in, navigating to Settings > Preferences, selecting a theme option, and verifying the app UI updates to the selected theme. The choice persists after page reload and across browser sessions.

**Acceptance Scenarios**:

1. **Given** a signed-in user on the Settings page, **When** they select "Light" theme, **Then** the app UI immediately renders in light mode and the preference is saved
2. **Given** a signed-in user on the Settings page, **When** they select "Dark" theme, **Then** the app UI immediately renders in dark mode and the preference is saved
3. **Given** a signed-in user with a saved "Dark" preference, **When** they reload the page, **Then** the app UI renders in dark mode without flash
4. **Given** a signed-in user who has never set a theme preference, **When** they load any app page, **Then** the app automatically follows their OS-level appearance setting

---

### User Story 2 - System-aware default theme (Priority: P1)

When a user signs in for the first time, the app detects their operating system's preferred color scheme (light or dark) and applies it automatically. No manual configuration is needed for the app to match the user's system-wide preference.

**Why this priority**: The primary requirement states the system should read the theme from the user's device configuration. This ensures a seamless out-of-box experience.

**Independent Test**: Can be fully tested by setting the OS to dark mode, signing in as a new user (or clearing preferences), and verifying the app renders in dark mode without any manual theme selection.

**Acceptance Scenarios**:

1. **Given** a user with their OS set to dark mode and no saved theme preference, **When** they sign in for the first time, **Then** the app renders in dark mode
2. **Given** a user with their OS set to light mode and no saved theme preference, **When** they sign in for the first time, **Then** the app renders in light mode
3. **Given** a user with "System" selected as their theme preference, **When** they change their OS theme from light to dark, **Then** the app auto-updates to reflect the change

---

### User Story 3 - Theme consistency across the app (Priority: P2)

Once a user selects a theme preference (or the system default is applied), all authenticated pages in the app use the same theme consistently. Navigation, sidebar, recipe pages, ingredient pages, production planner, and settings all respect the chosen theme without the user needing to set it per-page.

**Why this priority**: A fragmented theme experience would be confusing. Consistency is essential for trust and usability.

**Independent Test**: Can be tested by setting a theme, navigating through all app sections, and verifying every page renders in the selected theme. Test both light and dark modes.

**Acceptance Scenarios**:

1. **Given** a user has selected "Dark" mode, **When** they navigate from recipes to ingredients to settings, **Then** every page renders in dark mode
2. **Given** a user has selected "Light" mode, **When** they navigate between any authenticated pages, **Then** every page renders in light mode

---

### Edge Cases

- How does the theme selector behave with OS accessibility settings (reduced motion, high contrast)? — Addressed by WCAG 2.1 AA compliance: theme transitions respect reduced motion preferences; high contrast mode is a system-level concern and does not conflict with the app's theme selection.
- How does the app handle users who are not signed in (landing pages) — should the landing pages also respect system preference?
- What happens if the browser does not support `prefers-color-scheme` detection?
- How does the app behave during the brief moment before JavaScript loads — should the theme be server-rendered to prevent flash?
- What happens when the user clears their browser data — does the app fall back to system detection or to a hardcoded default?

## Requirements

### Functional Requirements

- **FR-001**: Users MUST be able to select a theme preference from at least three options: "System default" (follow OS), "Light", and "Dark"
- **FR-002**: The system MUST detect the user's OS-level color scheme preference and use it as the default when no explicit preference has been saved
- **FR-003**: The system MUST persist the user's theme preference across sessions and devices (within the same account)
- **FR-004**: Changes to the theme preference MUST take effect immediately (client-side) without requiring a page reload
- **FR-005**: All authenticated app pages MUST consistently render in the user's selected or detected theme
- **FR-006**: The system MUST prevent a flash of incorrectly-themed content during page load by rendering the correct theme server-side when user preference is known
- **FR-007**: Theme controls MUST be placed in Settings > Preferences tab for authenticated app pages. Landing pages (sign-in, sign-up, pricing, etc.) use their existing separate theme toggle mechanism.
- **FR-008**: When the user selects "System default", the app MUST reactively update the theme in real-time when the OS color scheme changes, without requiring a page reload.
- **FR-009**: When a user changes their theme preference, the change MUST be applied optimistically (immediately in the UI) before the server confirms. If the server persist fails, the system MUST revert to the previous theme and display a non-blocking error notification.
- **FR-010**: The theme selector UI MUST meet WCAG 2.1 AA standards: keyboard navigable (tab/arrow keys between options), screen reader announces current selection and changes, and color contrast ratios are maintained in both themes.

### Key Entities

- **UserPreferences**: Represents the user's theme and accent color settings. Already exists in the database with `theme` (currently `"light"` / `"dark"`) and `accentColor` fields. The `theme` field will be extended to support `"system"` as a third valid value to represent "follow OS preference". Default for new users: `theme: "system"`, `accentColor: "coral"`.
- **Theme**: The effective visual mode applied to the UI — either `light` or `dark`. This is the resolved output after considering whether the user selected an explicit mode or the system default.

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can select their preferred theme in under 30 seconds from first navigating to Settings
- **SC-002**: The correct theme is rendered on initial page load 100% of the time for users with a saved preference (no flash of wrong theme)
- **SC-003**: A new user's first authenticated page load matches their OS preference without requiring any action
- **SC-004**: Theme preference, once set, persists across page reloads, tab closures, and browser restarts with 100% reliability
- **SC-005**: All authenticated pages (recipes, ingredients, settings, production) render consistently in the selected theme

## Assumptions

- Accent color selection logic is explicitly out of scope — this feature only adds the theme mode control. However, the existing accent picker UI in Settings > Preferences will be completed as infrastructure (the picker already existed in the JS but was missing its HTML). The default accent color for new users changes from `indigo` to `coral` to match the landing page.
- The landing/public pages (sign-in, sign-up, pricing) have their own separate theme system and are not affected by this feature
- Users who have already saved a "light" or "dark" preference will keep their existing choice; only users who select "System" (or have no preference) will follow OS detection
- The existing authentication system (Better Auth) will be reused — theme preferences are tied to the authenticated user account
- Browser support for `prefers-color-scheme` is assumed for the "System" option; unsupported browsers will fall back to light mode
- The existing database model (`UserPreferences`) will be extended to support `"system"` as a valid theme value rather than creating a new table
