# Tasks: Theme Mode Control

**Input**: Design documents from `specs/002-theme-mode-control/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test infrastructure exists — all validation is manual via dev server.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `src/` at repository root (Astro SSR project)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

No setup tasks needed — project already exists with full infrastructure (Astro, Prisma, Tailwind, auth, DB).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Type system and core theme logic that MUST be complete before any user story work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T001 [P] Add `"system"` to Theme union type in `src/lib/db/types.ts` (change `"light" | "dark"` to `"light" | "dark" | "system"`)
- [x] T002 [P] Update `upsertUserPreferences()` to validate `"system"` as a valid theme value in `src/lib/db/preferences.ts`; also update `getUserPreferences()` fallback default from `theme: 'light'` to `theme: 'system'` and default accent from `'indigo'` to `'coral'`
- [x] T003 Update `applyTheme()` to resolve `"system"` via `window.matchMedia('(prefers-color-scheme: dark)')` in `src/layouts/Layout.astro`

**Checkpoint**: Foundation ready — TypeScript types accept all three modes, validation passes, `getUserPreferences()` defaults to "system"/"coral", and `applyTheme()` can resolve "system" to the effective theme. User story implementation can now begin.

---

## Phase 3: User Story 1 — Set theme preference in Settings (Priority: P1) 🎯 MVP

**Goal**: Signed-in user can navigate to Settings > Preferences and select their preferred theme mode (system/light/dark). The change takes effect immediately and persists across reloads.

**Independent Test**: Sign in, go to `/settings?tab=preferences`, select a theme option, verify UI updates instantly. Reload the page — theme persists.

- [x] T004 [P] [US1] Add Preferences tab HTML with 3 theme option buttons (`[data-theme-option]`) + hidden `#theme-input` in `src/pages/settings.astro`
- [x] T005 [P] [US1] Add accent color picker grid HTML (`[data-accent-option]` buttons) + hidden `#accent-input` in `src/pages/settings.astro`
- [x] T006 [US1] Wire form POST handler with CSRF token (`Astro.locals.csrfToken`) to save theme/accent via `upsertUserPreferences()` in `src/pages/settings.astro`
- [x] T007 [US1] Add optimistic save JS: apply selection immediately, revert + show non-blocking error on server failure in `src/pages/settings.astro`

**Checkpoint**: User Story 1 is fully functional — users can change theme in Settings, see live preview, and preference persists across sessions.

---

## Phase 4: User Story 2 — System-aware default theme (Priority: P1)

**Goal**: Users with no saved preference automatically follow their OS color scheme. The "System" mode reactively tracks OS changes in real-time without page reload.

**Independent Test**: Set OS to dark mode, clear preferences (or use fresh session), load any app page — renders dark. Switch OS to light — app follows. Select explicit "Light" in Settings — overrides OS. Switch back to "System" — returns to OS follow.

**⚠ T003, T008, and T009 all modify `src/layouts/Layout.astro`. Implement these tasks SEQUENTIALLY in order: T003 → T008 → T009. Do NOT attempt parallel execution on the same file.**

- [x] T008 [US2] Add inline blocking `<script is:inline>` in `src/layouts/Layout.astro` that reads `matchMedia` before paint to prevent flash for "system" users
- [x] T009 [US2] Add `window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ...)` listener in `src/layouts/Layout.astro` for reactive theme tracking when mode is "system"
- [x] T010 [US2] Handle browser unsupported case: if `window.matchMedia` is unavailable, fall back to light mode in `src/layouts/Layout.astro`

**Checkpoint**: User Story 2 is complete — first-load flash prevention works, OS changes are tracked in real-time, unsupported browsers fall back to light, and users can toggle between auto and explicit modes.

---

## Phase 5: User Story 3 — Theme consistency across the app (Priority: P2)

**Goal**: Theme applies uniformly across all authenticated pages (recipes, ingredients, settings, production) without per-page configuration.

**Independent Test**: Set dark mode, navigate through all sections (recipes → ingredients → settings → production) — every page renders consistently in dark mode. Repeat with light mode.

- [ ] T011 [US3] Verify theme consistency across recipes, ingredients, settings, and production pages (manual QA sweep)

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: QA, edge cases, and cleanup

- [x] T012 [P] Run `pnpm astro check` — zero type errors across modified files
- [x] T013 [P] Run `pnpm eslint .` — zero lint errors (pre-existing error in PricingSection.astro is unrelated)
- [ ] T014 Run `pnpm dev` and manually smoke-test all acceptance scenarios from spec.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No tasks — project is already initialized
- **Foundational (Phase 2)**: No dependencies — BLOCKS all user stories
- **User Story 1 (Phase 3)**: Depends on Foundational completion (T003 for applyTheme)
- **User Story 2 (Phase 4)**: Depends on Foundational completion (T003 for applyTheme) — can run in parallel with US1
- **User Story 3 (Phase 5)**: Depends on US1 + US2 completion
- **Polish (Phase 6)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 2 (P1)**: Can start after Foundational (Phase 2) — no dependencies on other stories
- **User Story 3 (P2)**: Depends on US1 and US2 (needs theme setting + OS detection working)

### Parallel Opportunities

- **Foundational**: T001 and T002 can run in parallel (different files)
- **User Stories 1 & 2**: Can be implemented in parallel (different concerns — Settings UI vs Layout rendering)
- **Within US1**: T004 and T005 can run in parallel (theme buttons vs accent picker in same page but different sections)
- **Polish**: T012 and T013 can run in parallel (different tools)

---

## Parallel Example: Foundational Phase

```bash
# Launch type + validation updates in parallel:
Task: "Add 'system' to Theme type in src/lib/db/types.ts"
Task: "Update upsertUserPreferences validation in src/lib/db/preferences.ts"

# Then, after both complete:
Task: "Update applyTheme() to resolve 'system' via matchMedia in Layout.astro"
```

## Parallel Example: User Stories 1 & 2

```bash
# US1 team: Settings UI
Task: "Add Preferences tab HTML + accent picker in settings.astro"
Task: "Wire form handler + optimistic save JS in settings.astro"

# US2 team (parallel): Layout rendering
Task: "Add inline flash prevention script in Layout.astro"
Task: "Add OS change listener in Layout.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 2: Foundational
2. Complete Phase 3: User Story 1
3. **STOP and VALIDATE**: Test theme selection in Settings, verify persistence on reload
4. Deploy/demo if ready

### Incremental Delivery

1. Complete Foundational → Core type + applyTheme ready
2. Add User Story 1 → Settings UI → Deploy/Demo (MVP! Users can manually pick theme)
3. Add User Story 2 → OS-aware defaults + reactive tracking → Deploy/Demo
4. Add User Story 3 → Consistency verification → Deploy/Demo
5. Each story adds value without breaking previous stories

### Parallel Team Strategy

- Developer A: Phase 2 (T001-T003) → Phase 3 US1 (T004-T007)
- Developer B: Phase 4 US2 (T008-T009) [starts after Phase 2]

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No test tasks — project has no test infrastructure; validate manually via dev server
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
