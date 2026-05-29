# Tasks: Settings Feedback UI

**Input**: Design documents from `/specs/003-settings-feedback-ui/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md

**Tests**: No test infrastructure exists in this project. Tasks focus on implementation only.

**Organization**: Tasks grouped by user story. All changes are in `src/pages/settings.astro` (single file).

## Format: `[ID] [P] [Story] Description`

- **[P]**: Can run in parallel (different sections/blocks of the same file, or different files)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Single project**: `src/` at repository root
- No new files needed — all changes in `src/pages/settings.astro`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

Setup phase is empty — project already exists. No new dependencies, components, or infrastructure needed.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

No blocking prerequisites. All changes affect client-side behavior within a single existing page. Components (`Button`, `FeedbackAlert`) are already built and tested.

**Checkpoint**: Ready for user story implementation.

---

## Phase 3: User Story 1 - Save Theme/Accent Preferences with Proper Feedback (Priority: P1) 🎯 MVP

**Goal**: Replace native `alert()` calls in the preferences optimistic save flow with a `FeedbackAlert` component rendered at the top of the section. Show a loading spinner in the save button during submission.

**Independent Test**: Open Settings → Preferencias tab. Change a theme option. The "Guardar cambios" button appears. Click it. Observe:
- Button shows a spinner during the request
- On success: green banner at section top says "Preferencias guardadas correctamente."
- On failure: red banner at section top shows error message, selections revert
- Focus moves to the feedback banner

### Implementation for User Story 1

- [x] T001 [US1] Add `FeedbackAlert` container element at top of preferences section in `src/pages/settings.astro` (around line 315, before the form)
- [x] T002 [US1] Replace native `alert()` calls with dynamic `FeedbackAlert` rendering in the optimistic save submit handler (script 1, lines 670 and 686 of `src/pages/settings.astro`)
- [x] T003 [US1] Wire loading spinner to preferences save button via the `loading` prop on the `Button` component — set `true` on submit, `false` after response (script 1 in `src/pages/settings.astro`)
- [x] T004 [US1] Add focus management: after `FeedbackAlert` appears, call `.focus()` on it (script 1 in `src/pages/settings.astro`)

**Checkpoint**: Preferences form now shows design-system feedback instead of native alerts. Button shows spinner during save. MVP deliverable.

---

## Phase 4: User Story 2 - Disabled Button State for Empty Account Forms (Priority: P1)

**Goal**: Account form submit buttons (change email, change password) appear visually disabled (reduced opacity, not-allowed cursor) when any required field is empty. The preferences save button is hidden until a change is detected.

**Independent Test**: Open Settings → Perfil tab. With empty email and password fields, verify both submit buttons show `opacity-70` + `cursor-not-allowed` and are not clickable. Fill fields and verify buttons become enabled. Open Preferencias tab — "Guardar cambios" is hidden until a theme/accent change is made.

### Implementation for User Story 2

- [x] T005 [US2] Add input event listeners to toggle `disabled` prop on the "Cambiar email" submit button based on field emptiness (script 3 in `src/pages/settings.astro`, around line 762)
- [x] T006 [US2] Add input event listeners to toggle `disabled` prop on the "Cambiar contraseña" submit button based on field emptiness (script 3 in `src/pages/settings.astro`, around line 800)
- [x] T007 [US2] Ensure the preferences save button is hidden when no changes (existing `checkIfChanged` toggles `hidden` class on `#save-btn-wrapper`) — add `disabled` attribute to the button for screen reader consistency (script 1 in `src/pages/settings.astro`, around line 612)

**Checkpoint**: Account forms show disabled state when fields are empty; preferences button is hidden until a change is detected.

---

## Phase 5: User Story 3 - Inline Feedback for Account Forms (Priority: P2)

**Goal**: Change-email and change-password forms show loading spinners during submission, have proper focus management on feedback, and use correct semantic tokens.

**Independent Test**: Open Settings → Perfil tab. Submit change-email form with valid data. Observe spinner in button during request, green success banner on success, focus moves to banner. Repeat for change-password form.

### Implementation for User Story 3

- [x] T008 [US3] Wire loading spinner to the "Cambiar email" submit button via the `loading` prop — set `true` on submit, `false` after response (script 3 in `src/pages/settings.astro`, around line 767)
- [x] T009 [US3] Wire loading spinner to the "Cambiar contraseña" submit button via the `loading` prop — set `true` on submit, `false` after response (script 3 in `src/pages/settings.astro`, around line 805)
- [x] T010 [US3] Add focus management to account form feedback elements: call `.focus()` on `#change-email-feedback` and `#change-password-feedback` when they appear (script 3 in `src/pages/settings.astro`)
- [x] T011 [US3] Audit account form feedback elements to confirm they use correct semantic tokens: `border-success-border bg-success-bg text-success` for success, `border-danger-border bg-danger-bg text-danger` for error (script 3 `showFeedback` function in `src/pages/settings.astro`, around line 745). If any non-compliant classes are found, replace them with the correct semantic tokens.

**Checkpoint**: Account forms now show loading spinners and have proper focus management.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T012 Search the entire `src/pages/settings.astro` for any remaining native `alert()` calls and replace with `FeedbackAlert`
- [x] T013 Run `pnpm astro check` and `pnpm eslint .` — fix all errors before merging

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Empty — no dependencies
- **Foundational (Phase 2)**: Empty — no dependencies
- **User Story 1 (Phase 3)**: No dependencies — can start immediately
- **User Story 2 (Phase 4)**: No dependencies on US1 — tasks affect different sections of the same file, but careful merging needed
- **User Story 3 (Phase 5)**: No dependencies on other stories — tasks affect separate script block
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: No dependencies — fully independent
- **US2 (P1)**: No dependencies — fully independent
- **US3 (P2)**: No dependencies — fully independent

### Within Each User Story

- Tasks within a phase that modify the same function/block should be done sequentially
- Tasks marked [P] in different files/script blocks can be done in parallel

### Parallel Opportunities

- US1, US2, and US3 can all be implemented in parallel (they affect different `<script>` blocks within the same file)
- T005 and T006 (US2) can run in parallel (different forms, same script block)
- T008 and T009 (US3) can run in parallel (different forms, same script block)

---

## Parallel Example: All User Stories

```bash
# Launch US1, US2, and US3 in parallel:
Task: "US1: Preferences form FeedbackAlert + loading spinner (script 1)"
Task: "US2: Disabled button states for empty fields (script 3)"
Task: "US3: Account form loading spinners + focus management (script 3)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 3: User Story 1 (Preferences feedback)
2. **STOP and VALIDATE**: Test by changing theme/accent, saving, observing FeedbackAlert
3. Deploy if ready

### Incremental Delivery

1. US1 → Test independently → Deploy/Demo (MVP!)
2. US2 → Test independently → Deploy
3. US3 → Test independently → Deploy
4. Each story adds value without breaking previous stories

### Solo Developer Strategy

With a single developer:

1. Implement US1 (preferences feedback) — most visible change
2. Implement US2 (disabled buttons) — quick win, explicitly requested
3. Implement US3 (account form spinners + focus) — lower priority polish
4. Run Phase 6 polish tasks last

---

## Notes

- **[P] tasks**: Different forms/script blocks, no file conflicts
- **No new files needed**: All changes in `src/pages/settings.astro`
- **Binding guards**: All new event listeners must use `data-*-bound="1"` pattern for SPA safety
- **Lifecycle**: All scripts must bind on `astro:page-load`, `astro:after-swap`, and call immediately
- **No backend changes required**: Existing API endpoints and `upsertUserPreferences` are sufficient
- **Commit after each phase** for clean history
