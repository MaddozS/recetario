# Tasks: Password Reset Flow

**Input**: Design documents from `/specs/006-password-reset-flow/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), data-model.md, research.md

**Tests**: No tests requested in specification

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Verification - No New Files Needed)

**Purpose**: Verify existing infrastructure is ready for implementation

- [x] T001 Verify `PasswordResetToken` migration was applied in `prisma/migrations/20260529012757_add_password_reset_token/migration.sql`
- [x] T002 Verify `password_reset` exists in `AuditAction` enum in `prisma/schema.prisma`
- [ ] T003 Add abuse protection for `/forget-password` after the replacement rate-limit design is approved

---

## Phase 2: Foundational (Custom Email Template & Token Logic)

**Purpose**: Core infrastructure changes required before user stories can work

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T004 [P] Create branded HTML email template function in `src/lib/email-templates.ts` for password reset (Resend-compatible styling)
- [x] T005 [P] Create token generation and validation helpers in `src/lib/password-reset.ts` (10-min expiry, token invalidation logic)
- [x] T006 Update `sendResetPassword` hook in `src/lib/auth.ts` to use branded email template and custom token flow (depends on T004, T005)

**Checkpoint**: Foundational ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Request Password Reset (Priority: P1) 🎯 MVP

**Goal**: User receives branded email with 10-minute expiry link after requesting reset

**Independent Test**: Submit valid email address and verify receipt of branded reset email with valid link

### Implementation for User Story 1

- [x] T007 [US1] Update `src/lib/auth.ts` to generate `PasswordResetToken` records with 10-minute expiry when forget password is requested
- [x] T008 [US1] Modify `sendResetPassword` to use branded HTML template from `src/lib/email-templates.ts` and include `{{resetLink}}` with token
- [x] T009 [US1] Update `src/pages/forgot-password.astro` to handle success/error states (verify existing implementation works with new flow)
- [x] T010 [US1] Verify old tokens (in `Verification` table) are not used by new flow (orphaned - intentional per spec)

**Checkpoint**: User Story 1 complete - email flow works with branded template

---

## Phase 4: User Story 2 - Reset Password with Link (Priority: P1)

**Goal**: User can set new password with same validation as account creation

**Independent Test**: Click valid reset link and complete password change flow with validation feedback

### Implementation for User Story 2

- [x] T011 [P] [US2] Create password reset validation service in `src/lib/password-reset.ts` to validate tokens and update passwords
- [x] T012 [P] [US2] Create `/api/auth/reset-password.ts` endpoint to handle token validation and password update (depends on T011)
- [x] T013 [US2] Update `src/pages/reset-password.astro` to call new endpoint instead of `authClient.resetPassword()` (depends on T012)
- [x] T014 [US2] Apply same password validation rules from `src/lib/password-validation.ts` (8+ chars, upper, lower, digit, special)
- [x] T015 [US2] Add `password_reset` audit event via `logAuditEvent()` from `@/lib/db/audit` when password is changed
- [x] T016 [US2] Mark token as used (set `usedAt`) after successful password change
- [x] T017 [US2] Show success screen with "Volver al inicio de sesión" link after password change

**Checkpoint**: User Story 2 complete - password reset flow works end-to-end

---

## Phase 5: User Story 3 - Expired Link Handling (Priority: P2)

**Goal**: User sees clear error when link has expired with option to request new one

**Independent Test**: Use expired link and verify proper error handling and redirect

### Implementation for User Story 3

- [x] T018 [US3] Update token validation in `src/lib/password-reset.ts` to return expired status when `expiresAt < now()`
- [x] T019 [US3] Update `src/pages/reset-password.astro` to display "Enlace expirado" message with "Solicitar nuevo enlace" button when token expired
- [x] T020 [US3] Pre-fill email field on expired page if user came from forgot-password with email (via URL param or localStorage)

**Checkpoint**: User Story 3 complete - expired links handled gracefully

---

## Phase 6: User Story 4 - Timer Display (Priority: P2)

**Goal**: User sees countdown timer (MM:SS) showing time remaining before link expires

**Independent Test**: Observe countdown timer on reset password page and verify it decrements correctly

### Implementation for User Story 4

- [x] T021 [P] [US4] Calculate remaining time from token's `expiresAt` and pass to frontend in `src/pages/reset-password.astro`
- [x] T022 [P] [US4] Add countdown timer component in `src/pages/reset-password.astro` showing MM:SS format (e.g., "09:45")
- [x] T023 [US4] Update timer every second using `setInterval`
- [x] T024 [US4] When timer reaches 0, trigger expired link flow (show error, hide form)
- [x] T025 [US4] Ensure timer works correctly across page loads (calculate from server-side `expiresAt`, not localStorage)

**Checkpoint**: User Story 4 complete - countdown timer visible and functional

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [x] T026 [P] Run `pnpm astro check` to verify TypeScript types are correct
- [x] T027 [P] Run `pnpm eslint .` to verify no linting errors
- [x] T028 Verify all 18 functional requirements from spec.md are addressed
- [x] T029 Update `src/lib/email-templates.ts` if any adjustments needed based on testing
- [x] T030 Test full flow: forgot password → email received → reset page → new password → sign in works

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - verify infrastructure
- **Phase 2 (Foundational)**: Depends on Setup - CRITICAL, blocks all stories
- **Phase 3-6 (User Stories)**: All depend on Foundational phase completion
- **Phase 7 (Polish)**: Depends on all user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational - establishes email flow
- **User Story 2 (P2)**: Depends on User Story 1 (needs token validation logic)
- **User Story 3 (P2)**: Depends on User Story 2 (needs expired detection)
- **User Story 4 (P2)**: Depends on User Story 2 (needs timer on reset page)

### Within Each User Story

- Foundational tasks (T004-T006) before user story tasks
- Models/services before UI integration
- Core implementation before polish

### Parallel Opportunities

- T004 and T005 can run in parallel (different files)
- T011 and T012 can run in parallel (depends on T004-T006)
- T021 and T022 can run in parallel (both in same file, different sections)

---

## Parallel Example: User Story 2

```bash
# These tasks can be done together:
Task: T011 - Create password reset validation service
Task: T012 - Create reset-password endpoint

# Then sequential:
Task: T013 - Update reset-password.astro to use new endpoint
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Verify migration
2. Complete Phase 2: Foundational (email template + token logic)
3. Complete Phase 3: User Story 1 (email flow)
4. **STOP and VALIDATE**: Test email receipt with branded template
5. Deploy/demo if ready

### Incremental Delivery

1. Foundational → Email flow (US1) → Deploy
2. Add Password reset with link (US2) → Deploy
3. Add Expired link handling (US3) → Deploy
4. Add Timer display (US4) → Deploy

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/lib/email-templates.ts` | New - branded HTML email template |
| `src/lib/password-reset.ts` | New - token generation and validation |
| `src/lib/auth.ts` | Update `sendResetPassword` hook |
| `src/pages/reset-password.astro` | Add countdown timer, use new endpoint |
| `src/pages/forgot-password.astro` | May need minor adjustments |
| `prisma/schema.prisma` | Already updated - no changes needed |
| `prisma/migrations/` | Already applied - no changes needed |

---

## Notes

- Migration already applied - no `npx prisma migrate dev` needed
- Using Better Auth default paths (`/auth/forget-password`, `/auth/reset-password`)
- Old `Verification` table tokens become orphaned (intentional)
- Rate limiting is deferred until a replacement abuse-protection design is implemented
- Audit logging via existing `logAuditEvent()` from `@/lib/db/audit`