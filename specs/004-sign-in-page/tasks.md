# Tasks: Página de Inicio de Sesión

**Input**: Design documents from `specs/004-sign-in-page/`

**Prerequisites**: plan.md (required), spec.md (required), research.md, data-model.md, quickstart.md, impeccable-audit.md

**Tests**: Not requested in spec. Test infrastructure does not exist.

**Organization**: Tasks grouped by user story for independent implementation.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, US4)
- File paths are relative to repo root

---

## Phase 1: Setup

**Purpose**: Confirm environment and base page readiness

- [ ] T001 Verify `pnpm dev` runs at `localhost:4321` and `/sign-in` renders the existing page
- [ ] T002 [P] Read and confirm existing `src/lib/auth.ts` Google provider config (lines 42-47) and `src/lib/sign-in.ts` (lines 1-25) for current state

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Auth backend changes that both US1 and US2 depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [ ] T003 Add `disableSignUp: true` to `socialProviders.google` in `src/lib/auth.ts:42-47`
- [ ] T004 [P] Update `signInWithGoogle` in `src/lib/sign-in.ts:3-8` to accept optional `redirectUrl` param and pass it as `callbackURL`

**Checkpoint**: Auth backend configured — user story implementation can now begin

---

## Phase 3: User Story 1 — Email/Password Sign-in with Redirect & Security (Priority: P1) 🎯 MVP

**Goal**: Email/password sign-in respects `?redirect=` param, shows only generic error messages that never reveal account existence.

**Independent Test**: Navigate to `/sign-in?redirect=/recipes/123`, sign in with correct credentials, verify redirect to `/recipes/123`. Attempt with wrong password, verify error is `"Credenciales inválidas."` with no hint about email existence.

### Implementation for User Story 1

- [ ] T005 [P] [US1] Add `getSafeRedirect()` helper function in `<script>` section of `src/pages/sign-in.astro` that reads `?redirect=` from `URLSearchParams`, validates it starts with `/` and contains no `//` or `:`, returns validated path or `/recipes` as fallback
- [ ] T006 [US1] Update email form submit handler in `src/pages/sign-in.astro:238-279` to use `redirectTarget` from `getSafeRedirect()` instead of hardcoded `"/recipes"` in `window.location.href`
- [ ] T007 [US1] Verify generic error message: ensure catch block at line 276-278 produces `"Credenciales inválidas."` for all non-EMAIL_NOT_VERIFIED errors, with no differentiation between wrong password and non-existent account
- [ ] T008 [US1] Verify email not verified flow: ensure `EMAIL_NOT_VERIFIED` code handler at lines 249-275 still shows the specific message with resend button

**Checkpoint**: Email/password sign-in with redirect param and generic security errors fully functional

---

## Phase 4: User Story 2 — Google Sign-in (Existing Accounts Only) (Priority: P2)

**Goal**: Google OAuth sign-in only works for already-linked accounts, respects `?redirect=` param, shows error without auto-creating accounts.

**Independent Test**: Sign in with Google on a linked account → successful. Sign in with Google on an unlinked account → error message, no account created. Check DB — no new User row.

### Implementation for User Story 2

- [ ] T009 [US2] Update Google button click handler in `src/pages/sign-in.astro:287-314` to call `signInWithGoogle(redirectTarget)` passing the validated redirect target
- [ ] T010 [US2] Handle `disableSignUp` error: in Google catch block at line 306-313, ensure error message is generic (e.g., `"No se pudo iniciar sesión con Google."`) — replace permissive message at line 312 if it reveals account linking state
- [ ] T011 [US2] Verify Google sign-in overlay/spinner still shows during OAuth redirect (lines 295-302) and buttons disable properly
- [ ] T012 [US2] Manually test: Google sign-in WITH linked account → session created, redirected correctly
- [ ] T013 [US2] Manually test: Google sign-in WITHOUT linked account → error displayed, verify no new User row in DB via `npx prisma studio`

**Checkpoint**: Google sign-in restricted to existing accounts, redirect param supported

---

## Phase 5: User Story 4 — Session Guard (Priority: P1)

**Goal**: Users with active session cannot access `/sign-in` page; immediately redirected.

**Independent Test**: Sign in, manually navigate to `/sign-in`, verify redirect to `/recipes`.

### Implementation for User Story 4

- [ ] T014 [US4] Verify middleware session guard: test that navigating to `/sign-in` while authenticated redirects to `/recipes`. If middleware does not handle this, add frontmatter guard to `src/pages/sign-in.astro:1-5`:
```astro
---
import { Icon } from "astro-icon/components";
import { Button } from "@/components/ui";
import LandingLayout from "@/layouts/LandingLayout.astro";

if (Astro.locals.session) return Astro.redirect("/recipes");
---
```

**Checkpoint**: Session guard active — authenticated users cannot see sign-in page

---

## Phase 6: User Story 3 — Navigation Links (Priority: P3)

**Goal**: "Regístrate" and "¿Olvidaste tu contraseña?" links navigate correctly.

**Independent Test**: Click each link, verify correct destination.

### Implementation for User Story 3

- [ ] T015 [US3] Verify "Regístrate" link at `src/pages/sign-in.astro:182` navigates to `/sign-up`
- [ ] T016 [US3] Verify "¿Olvidaste tu contraseña?" link at `src/pages/sign-in.astro:143` navigates to `/forgot-password`

**Checkpoint**: Navigation links confirmed working

---

## Phase 7: Polish — Impeccable Audit Fixes & Cross-Cutting

**Purpose**: Fix findings from [impeccable-audit.md](./impeccable-audit.md) (18/20 score)

- [ ] T017 [P] Fix P1 responsive issue: change `min-h-[80vh] pt-20` to `min-h-dvh py-20` on container div at `src/pages/sign-in.astro:30` to prevent content overflow on landscape mobile viewports
- [ ] T018 [P] Fix P2 responsive issue: add responsive padding `p-6 sm:p-10 pt-8 sm:pt-12` on card div at `src/pages/sign-in.astro:32` for narrow screens
- [ ] T019 [P] Fix P2 a11y issue: add `role="alert"` to `#sign-in-error` div at `src/pages/sign-in.astro:49-53` and `#sign-in-verify-error` div at `src/pages/sign-in.astro:54-58` for screen reader announcements
- [ ] T020 [P] Fix P3 a11y issue: add `aria-hidden="true"` to spinner SVGs in overlay HTML templates at `src/pages/sign-in.astro:232-233` and `src/pages/sign-in.astro:298-299`
- [ ] T021 Run `pnpm astro check` and fix any type errors
- [ ] T022 Run `pnpm eslint .` and fix any lint errors
- [ ] T023 Run through quickstart.md verification checklist: test all 14 items
- [ ] T024 [P] Run `pnpm format` to ensure consistent code style

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS US1 and US2
- **US1 (Phase 3)**: Depends on Foundational — No dependencies on other stories
- **US2 (Phase 4)**: Depends on Foundational (T003, T004) — May share `getSafeRedirect()` from US1 T005
- **US4 (Phase 5)**: Depends on Setup only — can run anytime after T001
- **US3 (Phase 6)**: No dependencies — verification only, can run anytime
- **Polish (Phase 7)**: Depends on US1+US2 completion (modifies same files)

### User Story Dependencies

- **US1 (P1)**: Can start after Foundational — depends on T003, T004, T005
- **US2 (P2)**: Can start after T004 — needs updated `signInWithGoogle` signature. Uses `redirectTarget` from T005
- **US4 (P1)**: Independent — can run anytime after Setup
- **US3 (P3)**: Independent — verification only, can run anytime

### Within Each User Story

- T005 (helper) before T006 (handler uses it)
- T009 (Google handler) after T005 (uses `redirectTarget`)
- T017-T020 independent of each other (different attributes on same file — sequential execution preferred to avoid merge conflicts)

### Parallel Opportunities

- T001 and T002 can run in parallel
- T003 and T004 can run in parallel (different files)
- T015 and T016 can run in parallel (verification only)
- T017, T018, T019, T020 can run in parallel if done as separate commits
- T021 and T022 can run in parallel
- US4 (Phase 5) can run in parallel with any other phase

---

## Parallel Example: Phase 2 Foundational

```bash
# Launch foundational tasks together:
Task: "Add disableSignUp: true to socialProviders.google in src/lib/auth.ts"
Task: "Update signInWithGoogle in src/lib/sign-in.ts to accept redirectUrl param"
```

## Parallel Example: Phase 7 Polish

```bash
# Launch all audit fixes together (different CSS attributes):
Task: "Fix P1 responsive: min-h-dvh py-20 in src/pages/sign-in.astro"
Task: "Fix P2 responsive: responsive padding in src/pages/sign-in.astro"
Task: "Fix P2 a11y: role=alert on error divs in src/pages/sign-in.astro"
Task: "Fix P3 a11y: aria-hidden=true on spinner SVGs"
```

---

## Implementation Strategy

### MVP First (US1 + US4 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (critical — blocks US1)
3. Complete Phase 3: US1 — Email/password with redirect + security
4. Complete Phase 5: US4 — Session guard
5. **STOP and VALIDATE**: Test US1 + US4 independently per quickstart.md
6. Run `pnpm astro check` + `pnpm eslint .`
7. Deploy if ready

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Email sign-in) → Test → Deploy (MVP)
3. Add US2 (Google sign-in) → Test → Deploy
4. Add US3 (Links verify) → Test → Deploy
5. Add US4 (Session guard) → Test → Deploy
6. Polish → Test → Deploy

### Single Developer Strategy

Recommended order: T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 → T022 → T023 → T024

---

## Notes

- [P] tasks modify different files or independent sections of the same file
- [Story] label maps task to user story for traceability
- **No test infrastructure exists** — manual verification per quickstart.md checklist
- **No DB migrations** — `disableSignUp` is application-level config
- **No new files** — all changes in 3 existing files
- Commit after each checkpoint or logical task group
- The page already has binding guards (`data-bound="1"`, `data-pw-bound="1"`) — preserve this pattern
