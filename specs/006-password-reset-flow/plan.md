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
- `src/pages/forgot-password.astro` - Basic forgot password page (no backend)
- `src/pages/reset-password.astro` - Basic reset page (Better Auth handles reset)

### Better Auth Password Reset (Current)
- Built-in: `forgetPassword()` and `resetPassword()` methods via Better Auth
- Default expiry: 1 hour (configurable via `emailAndPassword.resetPasswordExpiresIn`)
- Token storage: `Verification` model (identifier = "reset-password", value = token)
- Current limitation: No countdown timer on reset page

### Gaps Identified
1. **No countdown timer** on reset password page (per spec requirement)
2. **Email template** is plain text, no branding (per Resend best practices)
3. **Token expiry** is 1 hour, spec requires 10 minutes
4. **No invalidation** of old tokens when new reset is requested
5. **No rate limiting** on forgot-password endpoint (auth routes have rate limiting)
6. **No auto-logout** after password change (security best practice)

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

**Rationale**: Better Auth's built-in `forgetPassword` creates a token in `Verification` table with 1hr default. We need 10-minute expiry and a better UX.

**Alternatives considered**:
- Use Better Auth's hooks to customize expiry and template (chosen - minimal override)
- Create completely custom flow bypassing Better Auth (rejected - unnecessary complexity)

---

## Phase 1: Data Model & Contracts

### PasswordResetToken Model

```prisma
model PasswordResetToken {
  id        String   @id @default(uuid())
  userId    String   @map("user_id")
  token     String   @unique
  expiresAt DateTime @map("expires_at") @db.Timestamptz()
  usedAt    DateTime? @map("used_at") @db.Timestamptz()
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@index([token])
  @@map("password_reset_tokens")
}
```

### API Contracts

#### `POST /api/auth/forgot-password`
Request:
```json
{ "email": "user@example.com" }
```
Response (success):
```json
{ "success": true, "message": "Si el email existe, recibirás un enlace" }
```
Response (rate limited):
```json
{ "error": "Demasiadas solicitudes", "code": "RATE_LIMITED" }
```

#### `POST /api/auth/reset-password`
Request:
```json
{ "token": "abc123...", "password": "NewPass123!" }
```
Response (success):
```json
{ "success": true }
```
Response (expired):
```json
{ "error": "El enlace ha expirado", "code": "TOKEN_EXPIRED" }
```

---

## Phase 2: Implementation

### Tasks

1. **Database Migration**: Add `PasswordResetToken` model
2. **API Route**: Create `/api/auth/forgot-password` with rate limiting
3. **API Route**: Create `/api/auth/reset-password` with token validation
4. **Email Template**: Create branded HTML template for reset email
5. **Frontend**: Update `/forgot-password` to use new API
6. **Frontend**: Update `/reset-password` with countdown timer
7. **Audit Logging**: Log `password_reset` action in AuditLog
8. **Security**: Add rate limiting (5 requests per 15 min per IP)

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

### Migration
```bash
npx prisma migrate dev --name add-password-reset-token
npx prisma generate
```