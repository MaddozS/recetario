# Feature Specification: Settings Feedback UI

**Feature Branch**: `003-settings-feedback-ui`

**Created**: 2026-05-26

**Status**: Draft

**Input**: User description: "La sección de settings.astro debe contar con mensajes de confirmación de cambios, mensajes de error cuando algo falla y seguir el esquema de colores y de layout establecidos en el design system (por ejemplo actualmente no hay indicador de que un botón está desactivado cuando no tiene información el formulario). Es necesario también que las alertas sigan los códigos de colores que debe tener (ejemplo rojo cuando es error)"

## Clarifications

### Session 2026-05-26

- Q: Should the preferences save button show a loading spinner during submission? → A: Show loading spinner inside the button while request is in flight.
- Q: Where should the FeedbackAlert for the preferences form appear? → A: At the top of the section, matching the existing server-side feedback position.
- Q: Should focus move to the FeedbackAlert when it appears? → A: Yes, move focus to the FeedbackAlert element for screen reader and keyboard users.

## User Scenarios & Testing

### User Story 1 - Save Theme/Accent Preferences with Proper Feedback (Priority: P1)

A user changes their theme or accent color and saves. They receive a design-system styled confirmation message on success or an error message on failure, instead of a native browser `alert()`.

**Why this priority**: This is the most visible flow — users constantly change theme/accent and need clear, on-brand feedback when saving.

**Independent Test**: Can be fully tested by changing a theme option and clicking "Guardar cambios". The result (success banner or error banner) renders with `FeedbackAlert` component using semantic tokens.

**Acceptance Scenarios**:

1. **Given** the user has changed their theme or accent preference on the preferences tab, **When** they click "Guardar cambios" and the save succeeds, **Then** they see a green success banner with message "Preferencias guardadas correctamente."
2. **Given** the user has changed their theme or accent preference on the preferences tab, **When** they click "Guardar cambios" and the save fails, **Then** they see a red error banner with the server response text (or a generic "Error al guardar las preferencias." fallback) and the selection reverts to the previously saved values.

---

### User Story 2 - Disabled Button State for Empty Account Forms (Priority: P1)

When an account form field (email, password) is empty or invalid, the submit button appears visually disabled (greyed out, not clickable) to indicate the action cannot be performed. The preferences save button is hidden until a change is detected.

**Why this priority**: Directly called out in the feature description. Currently there is no visual cue when a button cannot be used, which creates a poor UX.

**Independent Test**: Can be tested by loading the settings page with empty email/password fields and observing the submit buttons appear with reduced opacity and a not-allowed cursor. Filling in the required fields enables the buttons.

**Acceptance Scenarios**:

1. **Given** the "Cambiar email" form has the "Nuevo email" field empty, **When** the user looks at the form, **Then** the submit button appears visually disabled (reduced opacity, not-allowed cursor) and clicking it does not submit.
2. **Given** the "Cambiar contraseña" form has any field empty, **When** the user looks at the form, **Then** the submit button appears visually disabled.
3. **Given** a form button is disabled, **When** the user fills all required fields with valid values, **Then** the button becomes visually enabled (full opacity, pointer cursor).

---

### User Story 3 - Inline Feedback for Account Forms (Priority: P2)

When a user changes their email or password, success or error messages appear inline (within the form card) using the design system's semantic color tokens, rather than relying solely on browser alerts or unstyled text.

**Why this priority**: These forms already have basic feedback but need to be audited for consistency with the design system tokens.

**Independent Test**: Can be tested by submitting the change-email or change-password form with valid/invalid data and observing the feedback element uses `success-bg`/`success-border`/`text-success` for success and `danger-bg`/`danger-border`/`text-danger` for error.

**Acceptance Scenarios**:

1. **Given** the "Cambiar email" form, **When** the user submits with valid data and the API succeeds, **Then** an inline green banner shows "Email actualizado correctamente."
2. **Given** the "Cambiar email" form, **When** the user submits with invalid data or the API fails, **Then** an inline red banner shows the error message.
3. **Given** the "Cambiar contraseña" form, **When** the user submits with passwords that don't match, **Then** an inline red banner shows "Las contraseñas no coinciden."

---

### Edge Cases

- What happens when the user rapidly submits the same form multiple times? (Prevent double submission by disabling button during request)
- What happens when the network is unavailable during a form submission? (Show error message using FeedbackAlert with danger tokens)
- What happens when a form is submitted with all fields filled but the email format is invalid? (Show error feedback before or after submission attempt)
- What happens when the preferences form has no changes — should the save button be visible at all? (Currently hidden; this is correct behavior)
- What happens when a screen reader user submits a form — does focus move to the feedback element? (Yes, focus moves to FeedbackAlert on submission result)
- What happens if the server returns a 500 error versus a validation error? (Both display as error FeedbackAlert with danger tokens; no distinction in messaging)

## Requirements

### Functional Requirements

- **FR-001**: The preferences save operation MUST display success/error feedback using the `FeedbackAlert` component instead of native `alert()`. The alert MUST appear at the top of the section, matching the server-side feedback position.
- **FR-002**: The preferences form save button MUST be hidden when no changes have been made to theme/accent selections. The button wrapper (`#save-btn-wrapper`) receives a `hidden` class to hide the button until a change is detected.
- **FR-003**: All settings form submit buttons (change email, change password) MUST display a visually disabled state when any required field is empty.
- **FR-004**: All settings form submit buttons MUST become visually enabled when all required fields contain valid values.
- **FR-005**: All feedback/alerts on the settings page MUST use the design system semantic color tokens: `success-bg`, `success-border`, `text-success` for success states and `danger-bg`, `danger-border`, `text-danger` for error states.
- **FR-006**: All settings form submit buttons (preferences, change email, change password) MUST show a loading spinner inside the button while a request is in flight, replacing the icon. The button MUST be disabled during this time to prevent double submission.
- **FR-007**: On network error or API failure during form submission, the system MUST display an inline error message using the design system's danger token colors.
- **FR-008**: When a `FeedbackAlert` appears dynamically after form submission, focus MUST move to the alert element to assist screen reader and keyboard users.

### Key Entities

- **User Preference**: Theme and accent color selection saved per user account. Already persisted via `upsertUserPreferences`.
- **Settings Form**: Group of input fields (email change, password change) with validation requirements and submission behavior.
- **Feedback Alert**: Inline notification component (`FeedbackAlert.astro`) rendered using design system semantic tokens (`success-*` and `danger-*` colors).

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users receive visual feedback within 500ms of submitting any settings form, using design system-styled components.
- **SC-002**: Every settings form submit button has a visually distinct disabled state when preconditions are not met: account form buttons show reduced opacity + not-allowed cursor when fields are empty; preferences button is hidden until a change is detected.
- **SC-003**: Zero native browser `alert()` calls remain on the settings page — all feedback uses the project's `FeedbackAlert` component or equivalent inline element with semantic tokens.
- **SC-004**: All feedback messages use the correct semantic color family: green tones for success, red tones for errors — verified by checking CSS class references match `success-*` / `danger-*` tokens.

## Assumptions

- The existing `FeedbackAlert` component is the correct component to use for all feedback messages.
- The existing `Button` component already supports `disabled` prop with appropriate styling — no changes needed to the Button component itself.
- Form validation (empty fields, password length, email format) is handled client-side before submission.
- The existing inline feedback elements in change-email and change-password forms already use correct semantic tokens; only an audit is needed to confirm consistency.
- The preferences form's "Guardar cambios" button is currently hidden when no changes exist — this behavior is correct and should be preserved.
- The `Button` component already supports a `loading` prop with a spinner — no new UI primitive is needed.
- Focus management on `FeedbackAlert` is handled via JavaScript on the client side after the server response is received.
