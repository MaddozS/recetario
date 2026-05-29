# Implementation Plan: Password Reset Flow

**Feature**: Password Reset Flow
**Branch**: `006-password-reset-flow`
**Created**: Thu May 28 2026
**Status**: Draft

## Technical Context

### Stack (Technology Lock-in - Principle V)
- **Runtime**: Astro 6 SSR via `@astrojs/vercel`
- **Database**: PostgreSQL via Prisma ORM with `@prisma/adapter-pg`
- **Email**: Resend (already integrated in `src/lib/email.ts`)
- **Auth**: Better Auth with email/password

### Existing Infrastructure
- `src/lib/email.ts` - Resend integration with fallback stub
- `src/lib/password-validation.ts` - Password rules (8+ chars, upper, lower, digit, special)
- `src/lib/rate-limiter.ts` - Database-backed rate limiting
- `src/lib/db/audit.ts` - `logAuditEvent()` function for audit logging
- `src/pages/forgot-password.astro` - Uses `authClient.forgetPassword()` (Better Auth)
- `src/pages/reset-password.astro` - Uses `authClient.resetPassword()` (Better Auth)
- `src/pages/api/auth/[...all].ts` - Better Auth handler with rate limiting

### Better Auth Password Reset (Current)
- Built-in: `forgetPassword()` and `resetPassword()` methods via Better Auth
- Default expiry: 1 hour
- Token storage: `Verification` model (identifier = "reset-password", value = token)
- Rate limiting: 3 per hour per IP (already exists in `[...all].ts`)
- Current limitation: No countdown timer on reset page, plain text email

### Gaps Identified
1. **No countdown timer** on reset password page (per spec requirement)
2. **Email template** is plain text, no branding (per Resend best practices)
3. **Token expiry** is 1 hour, spec requires 10 minutes
4. **No invalidation** of old tokens when new reset is requested
5. **Old tokens** in `Verification` table (from Better Auth) should stop working

---

## Constitution Check

| Principle | Status | Notes |
|----------|--------|-------|
| I. Clean Code | ✅ | No violations anticipated |
| II. Simple UX, Clear UI | ✅ | State trinity on all pages |
| III. Design by Constitution | ✅ | Using `@/components/ui` barrel |
| IV. TypeScript Strictness | ✅ | Zod validation for form data |
| V. Technology Lock-in | ✅ | Using Resend (already in stack) |
| VI. Component Architecture | ✅ | Shared components in ui barrel |
| IX. Error Handling | ✅ | Structured error responses |
| X. Observability | ✅ | Audit logging on password change |

---

## Phase 0: Research & Decisions

### Research: Better Auth Password Reset Internals

**Decision**: Override Better Auth's default reset flow to add:
1. Custom token generation with 10-minute expiry
2. Custom email template with Resend branding
3. Countdown timer on reset page
4. Old token invalidation on new request

**Approach**: Use Better Auth's default paths (`/auth/forget-password`, `/auth/reset-password`) following existing patterns in the codebase. Override `sendResetPassword` hook in `emailAndPassword` config with custom template.

**Rationale**: Better Auth's built-in `forgetPassword` creates a token in `Verification` table with 1hr default. We need 10-minute expiry and a better UX. Custom API routes would add unnecessary complexity.

**Alternatives considered**:
- Create custom `/api/auth/...` routes bypassing Better Auth (rejected - unnecessary complexity, follows existing patterns)
- Disable Better Auth's `sendResetPassword` and use completely custom flow (rejected - keep things simple)

---

## Phase 1: Data Model & Contracts

### PasswordResetToken Model (Already in Schema - Migration Applied)

The model was added to `prisma/schema.prisma` and migration applied:

```prisma
model PasswordResetToken {
  id        String    @id @default(uuid())
  userId    String    @map("user_id")
  token     String    @unique
  expiresAt DateTime  @map("expires_at") @db.Timestamptz()
  usedAt    DateTime? @map("used_at") @db.Timestamptz()
  createdAt DateTime  @default(now()) @map("created_at")

  @@index([userId])
  @@index([token])
  @@map("password_reset_tokens")
}
```

**Migration**: ✅ Already applied (`20260529012757_add_password-reset-token`)

**Migration**: Already applied (`20260529012757_add_password_reset_token`)

### API Contracts

Better Auth handles the endpoints. We customize the behavior through config.

#### Email Template Variables
- `{{resetLink}}` - Full URL with token for password reset
- `{{userName}}` - User's first name for personalization
- `{{expiryMinutes}}` - Number of minutes until expiry (10)

---

## Phase 2: Implementation

### Tasks

1. **Disable Better Auth Default Reset**: Modify `emailAndPassword` config to disable built-in reset since we're using custom tokens

2. **Update `sendResetPassword` Hook**: Replace plain text with branded HTML template using Resend styling

3. **Create Custom Token Logic**: In `auth.ts`, add logic to generate tokens in `PasswordResetToken` table with 10-min expiry on forget password request

4. **Update Frontend - Forgot Password**: Modify to use custom flow (TBD via Better Auth hooks)

5. **Update Frontend - Reset Page**: Add countdown timer with MM:SS format

6. **Audit Logging**: Use existing `logAuditEvent()` from `@/lib/db/audit` to log `password_reset` action

7. **Invalidate Old Tokens**: When new reset is requested, delete any existing `PasswordResetToken` records for that user

### Implementation Details

#### Rate Limiting (Already Exists)
- Location: `src/pages/api/auth/[...all].ts`
- Current: 3 per hour per IP for `/forget-password`
- Decision: Keep existing 3/hour (more restrictive than "5 per 15 min")

#### Old Tokens (Verification Table)
- Decision: Old Better Auth tokens in `Verification` table should NOT work after this change
- Migration: N/A - the new flow simply won't use `Verification` table for password reset
- The existing `Verification` tokens from Better Auth will effectively be orphaned (no new requests will use them)

---

## Quickstart

### Prerequisites
- Resend API key in `.env` (`RESEND_API_KEY`)
- Sender email configured (`SENDER_EMAIL`)

### Env Variables Needed
```env
RESEND_API_KEY=re_xxxxx
SENDER_EMAIL=noreply@kitchcalc.com
```

### Migration Status
```bash
# Already applied - no action needed
npx prisma migrate dev --name add-password-reset-token
npx prisma generate
```

### Implementation Order
1. Update `src/lib/auth.ts` with custom `sendResetPassword` hook and token generation
2. Update `src/pages/reset-password.astro` with countdown timer
3. Add audit logging in token reset handler