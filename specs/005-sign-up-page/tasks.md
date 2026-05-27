# Tasks: Página de Registro de Usuario

**Input**: Design documents from `/specs/005-sign-up-page/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: No test infrastructure exists in this project. Manual verification via `pnpm dev`.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Database schema changes needed for all user stories

- [ ] T001 Add `firstName` and `lastName` fields to User model in `prisma/schema.prisma` per data-model.md (fields `firstName String @map("first_name")`, `lastName String @map("last_name")`)
- [ ] T002 Run `npx prisma migrate dev --name add_first_last_name` to create migration, then `npx prisma generate` to regenerate client

**Checkpoint**: Prisma schema updated, migration applied, client regenerated

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core auth infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Update `src/lib/auth.ts`: add `user.additionalFields` with `firstName` and `lastName` (both type `"string"`, required `true`)
- [ ] T004 [P] Update `src/lib/auth.ts`: change `disableSignUp` from `true` to `false` on Google social provider, add `mapProfileToUser` mapping `profile.given_name` → `firstName`, `profile.family_name` → `lastName`
- [ ] T005 Update `signUpWithEmail` function in `src/lib/sign-in.ts` to accept `firstName` and `lastName` parameters, pass them as additional fields alongside `name: \`${firstName} ${lastName}\``

**Checkpoint**: Auth foundation ready — `additionalFields` configured, Google provider allows sign-up, client function updated

---

## Phase 3: User Story 1 - Registro con email, contraseña, nombre y apellido (Priority: P1) 🎯 MVP

**Goal**: Users can create accounts with email, password, first name, and last name via the sign-up form

**Independent Test**: Navigate to `/sign-up`, fill all fields (nombre, apellido, email, password, confirm password), submit, and verify the verification email screen appears with the correct email

### Implementation for User Story 1

- [ ] T006 [US1] Add `nombre` (first_name) input field before email field in `src/pages/sign-up.astro` — use same styles as existing email field, `required`, `autocomplete="given-name"`, label "Nombre", placeholder "Tu nombre"
- [ ] T007 [US1] Add `apellido` (last_name) input field before email field in `src/pages/sign-up.astro` — use same styles, `required`, `autocomplete="family-name"`, label "Apellido", placeholder "Tu apellido"
- [ ] T008 [US1] Update form submit handler in `src/pages/sign-up.astro`: read nombre/apellido inputs, trim whitespace, validate non-empty, pass to updated `signUpWithEmail(email, password, firstName, lastName)`
- [ ] T009 [US1] Add client-side validation for name fields in `src/pages/sign-up.astro`: show error if first or last name is empty after trimming

**Checkpoint**: Email registration with first/last name fully functional — form submits, account created, verification email sent

---

## Phase 4: User Story 4 - Protección de acceso con sesión activa (Priority: P1)

**Goal**: Authenticated users cannot access the sign-up page and are redirected to `/recipes`

**Independent Test**: Sign in, navigate manually to `/sign-up`, verify redirect to `/recipes`

### Implementation for User Story 4

- [ ] T010 [US4] Verify `src/pages/sign-up.astro` frontmatter has `if (Astro.locals.session) return Astro.redirect("/recipes");` guard — add if missing

**Checkpoint**: Session guard active — signed-in users never see sign-up page

---

## Phase 5: User Story 2 - Registro con Google (Priority: P2)

**Goal**: Users can create accounts via Google OAuth with automatic name/last name mapping from Google profile

**Independent Test**: Navigate to `/sign-up`, click "Continuar con Google" with a non-linked Google account, verify account is created and redirected to `/recipes` with session active

### Implementation for User Story 2

- [ ] T011 [US2] Verify Google sign-up button in `src/pages/sign-up.astro` calls `signInWithGoogle()` with proper redirect — ensure `callbackURL` respects `?redirect=` query param (reuse `getSafeRedirect()` pattern from sign-in page)
- [ ] T012 [US2] Add `getSafeRedirect()` helper (or extract shared) in `src/pages/sign-up.astro` to validate redirect parameter for Google sign-up flow

**Checkpoint**: Google registration functional — button creates account with profile mapping, redirects correctly

---

## Phase 6: User Story 5 - Consistencia visual con el diseño del proyecto (Priority: P2)

**Goal**: Sign-up page is visually identical in quality and style to the sign-in page

**Independent Test**: Compare `/sign-up` and `/sign-in` side by side — verify same navbar, card structure, accent bar, icon, label styles, input styles, button styles, divider, error styling

### Implementation for User Story 5

- [ ] T013 [US5] Audit `src/pages/sign-up.astro` form fields: ensure all labels use tracked-uppercase style (`text-[11px] font-bold uppercase tracking-[0.16em]` or equivalent `text-xs font-bold tracking-wider uppercase`), matching sign-in page pattern
- [ ] T014 [US5] Audit `src/pages/sign-up.astro` input styles: ensure all inputs use semantic tokens (`border-border bg-background text-foreground placeholder:text-subtle-foreground focus:border-accent-300 focus:ring-accent-500/20`), matching sign-in page
- [ ] T015 [US5] Verify password toggle buttons in `src/pages/sign-up.astro` use correct SVG icons and aria-labels (matching sign-in page pattern with `data-password-toggle`, `data-eye-open`, `data-eye-closed`)

**Checkpoint**: Visual consistency verified — sign-up page indistinguishable in quality from sign-in page

---

## Phase 7: User Story 3 - Navegación desde y hacia inicio de sesión (Priority: P3)

**Goal**: Users can navigate between sign-up and sign-in pages easily

**Independent Test**: Click "Inicia sesión" from `/sign-up` → navigates to `/sign-in`. Click "Regístrate" from `/sign-in` → navigates to `/sign-up`

### Implementation for User Story 3

- [ ] T016 [US3] Verify `/sign-up` footer link "¿Ya tienes cuenta? Inicia sesión" exists and links to `/sign-in` in `src/pages/sign-up.astro`
- [ ] T017 [US3] Verify `/sign-in` footer link "¿No tienes cuenta? Regístrate" exists and links to `/sign-up` in `src/pages/sign-in.astro`

**Checkpoint**: Bidirectional navigation between sign-up and sign-in pages working

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Cleanup, verification, and final quality checks

- [ ] T018 Remove `signup_disabled` error code from `AUTH_ERROR_MESSAGES` in `src/pages/sign-in.astro` (no longer relevant since `disableSignUp: false`)
- [ ] T019 Run `pnpm astro check` and fix any type errors
- [ ] T020 Run `pnpm eslint .` and fix any lint errors
- [ ] T021 Run `pnpm format` to ensure consistent code formatting
- [ ] T022 Manual verification: test full email registration flow in `pnpm dev` (fill name/last name, submit, verify email screen, resend verification)
- [ ] T023 Manual verification: test full Google registration flow in `pnpm dev` (click Google button, complete OAuth, verify redirect to /recipes)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately
- **Foundational (Phase 2)**: Depends on Setup (T001-T002 must complete first — schema must exist before auth config references new fields). BLOCKS all user stories.
- **User Stories (Phase 3-7)**: All depend on Foundational phase completion
  - US1 (Phase 3) and US4 (Phase 4) are both P1 and can proceed in parallel
  - US2 (Phase 5) and US5 (Phase 6) are both P2 and can proceed in parallel after P1
  - US3 (Phase 7) is P3 and depends on US1/US2 page being built
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — no dependencies on other stories
- **US4 (P1)**: Can start after Foundational (or in parallel with US1) — independent
- **US2 (P2)**: Can start after Foundational — depends on auth config from Phase 2, independent of US1
- **US5 (P2)**: Can start after US1 (needs the form to exist before auditing styles)
- **US3 (P3)**: Can start after US1 (needs the page and footer to exist)
- **Polish (Phase 8)**: Depends on all stories. US1 must be complete before T018 (sign-in page cleanup).

### Within Each Phase

- Phase 1: T001 → T002 (sequential — migration needs schema change first)
- Phase 2: T003 and T004 can run in [P] parallel (same file but different config sections — combine into single edit), T005 after T003
- Phase 3: T006 and T007 are [P] (different form fields in same file but can be added together), T008-T009 sequential (handler needs fields first)
- Phase 5: T011-T012 sequential
- Phase 6-7: Independent audit/verification tasks

### Parallel Opportunities

- T003 and T004: same file (`src/lib/auth.ts`) but adjacent config changes — combine into one task
- T006 and T007: both add input fields to same file — implement together
- US1 and US4: independent P1 stories, can start in parallel
- US2 and US5: independent P2 stories, can start in parallel after P1
- T019, T020, T021: all verification commands, can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch field additions together:
Task: "Add nombre input field in src/pages/sign-up.astro"
Task: "Add apellido input field in src/pages/sign-up.astro"

# Then sequentially:
Task: "Update form submit handler in src/pages/sign-up.astro"
Task: "Add client-side validation for name fields in src/pages/sign-up.astro"
```

---

## Implementation Strategy

### MVP First (User Story 1 + US4 Only)

1. Complete Phase 1: Setup (Prisma schema + migration)
2. Complete Phase 2: Foundational (auth config + client function)
3. Complete Phase 3: US1 (email registration with first/last name)
4. Complete Phase 4: US4 (session guard)
5. **STOP and VALIDATE**: Test email registration independently
6. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add US1 + US4 → Test email registration + session guard → **MVP!**
3. Add US2 → Test Google registration → Deploy
4. Add US5 → Audit visual consistency → Deploy
5. Add US3 → Verify navigation links → Deploy
6. Polish phase → Type-check, lint, cleanup

### Parallel Team Strategy

With multiple developers:

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (form fields + handler)
   - Developer B: US4 (session guard) + US2 (Google config)
3. After form exists:
   - Developer A: US5 (visual audit)
   - Developer B: US3 (navigation links)
4. Final: Polish phase together

---

## Notes

- [P] tasks = different files/concerns, no dependencies on incomplete tasks
- [Story] label maps task to specific user story for traceability
- Each user story should be independently completable and testable
- No test files needed (no test infrastructure in project)
- All CSS must use semantic tokens (never hardcoded colors)
- All form labels must use tracked-uppercase style matching sign-in page
- All interactivity must have `data-*-bound="1"` guards for SPA navigation
- Commit after each phase or logical group
- Stop at any checkpoint to validate story independently
