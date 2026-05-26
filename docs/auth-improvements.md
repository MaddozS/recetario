# Auth System Improvement Plan

Status: **P0 fully implemented (deployed). P1 partially implemented. P2 partially implemented.
Session Management (P1 #7) and MFA/2FA (P2 #9) are code-complete but UI-hidden — saved for later rework with better UX.**

---

## Table of Contents

- [P0 — Security gaps](#p0--security-gaps)
  - [1. Email verification](#1-email-verification)
  - [2. Password reset flow](#2-password-reset-flow)
  - [3. Rate limiter fix (Vercel)](#3-rate-limiter-fix-vercel)
  - [4. Cache fix (Vercel)](#4-cache-fix-vercel)
- [P1 — Important UX/safety](#p1--important-uxsafety)
  - [5. Account deletion (TBD)](#5-account-deletion-tbd)
  - [6. Email/password change in settings](#6-emailpassword-change-in-settings)
  - [7. Session management UI](#7-session-management-ui)
  - [8. CSRF cookie hardening](#8-csrf-cookie-hardening)
- [P2 — Nice-to-have](#p2--nice-to-have)
  - [9. MFA/2FA support](#9-mfa2fa-support)
  - [10. Google OAuth rate limiting](#10-google-oauth-rate-limiting)
  - [11. Auth audit log](#11-auth-audit-log)
  - [12. Role/claims system](#12-roleclaims-system)

---

## P0 — Security gaps

### 1. Email verification

**Current state:** Sign-up page says "No verificamos email." No verification configured. `emailVerified` field exists in DB schema but unused. `Verification` table exists but not wired up.

**What to do:**

1. Add `emailVerification` block to `src/lib/auth.ts`:

```ts
emailVerification: {
  sendVerificationEmail: async ({ user, url }) => {
    // Send email with verification link
    // Use a mail service (Resend, SendGrid, or SMTP)
  },
  sendOnSignUp: true,
  expiresIn: 3600, // 1 hour
}
```

2. Add mail service integration (`src/lib/email.ts` — new file)
3. Add `SENDER_EMAIL` and mail provider env vars to `.env`
4. Update sign-up page text — remove "No verificamos email", add "Revisa tu correo para verificar tu cuenta"
5. Add verification success/failure pages at `src/pages/verify-email.astro` (optional — Better Auth handles redirect)
6. Add resend verification email endpoint

**Files to change:**
- `src/lib/auth.ts` — add emailVerification config
- `src/lib/email.ts` — new file, mail sending utility
- `src/pages/sign-up.astro` — update copy, remove "No verificamos email"
- `.env` — add mail provider vars

---

### 2. Password reset flow

**Current state:** No "forgot password" link, no reset page, no reset endpoint. Users who lose their password have no recovery path except Google OAuth.

**What to do:**

1. Add "Forgot password" link on sign-in page
2. Create `src/pages/forgot-password.astro` — form asking for email
3. Create `src/pages/reset-password.astro` — form asking for new password (token from URL)
4. Wire up Better Auth's `forgetPassword` and `resetPassword` API calls
5. Use same email service from #1 for sending reset links
6. Add rate limiting on forgot-password endpoint

**Files to change:**
- `src/pages/sign-in.astro` — add "Forgot password?" link below form
- `src/pages/forgot-password.astro` — new file
- `src/pages/reset-password.astro` — new file
- `src/lib/auth-client.ts` — verify `forgetPassword`/`resetPassword` available
- `src/lib/email.ts` — reuse from #1

---

### 3. Rate limiter fix (Vercel)

**Current state:** `src/lib/rate-limiter.ts` uses an in-memory `Map`. On Vercel serverless, each Lambda has its own Map — rate limiting is effectively broken in production.

**What to do:**

1. Replace in-memory Map with a persistent store. Options:
   - **Recommended:** Use Vercel KV (`@vercel/kv`) — low latency, designed for this
   - **Alternative:** Use the existing PostgreSQL db with a `rate_limits` table
   - **Fallback:** Use Vercel Edge Config
2. Create `src/lib/rate-limiter-v2.ts` with same interface but backed by KV/DB
3. Or: wrap existing `rateLimiter.check()` to use KV with same API surface

**Files to change:**
- `src/lib/rate-limiter.ts` — replace Map with persistent storage
- `.env` — add `KV_REST_API_URL` and `KV_REST_API_TOKEN` if using KV
- `package.json` — add `@vercel/kv` if using KV

---

### 4. Cache fix (Vercel)

**Current state:** `src/lib/cache.ts` uses in-memory `Map`. On Vercel, cache misses on almost every request. Subscription and preferences queries re-run constantly.

**What to do:**

1. Replace in-memory Map with persistent cache. Options:
   - **Recommended:** Vercel KV (can share instance with rate limiter)
   - **Alternative:** Use PostgreSQL for cache (simple, no new service)
2. Create `src/lib/cache-v2.ts` with same interface
3. Set larger TTL for subscription cache (e.g., 5 minutes) since KV is shared

**Files to change:**
- `src/lib/cache.ts` — replace Map with persistent storage
- `src/middleware.ts` — update import if changing interface
- `src/layouts/Layout.astro` — update import if changing interface

---

## P1 — Important UX/safety

### 5. Account deletion (TBD)

**Status:** TBD — needs product decision on data retention policy.

**Current state:** No UI or API to delete an account. GDPR/privacy risk for EU users.

**What to do (when decided):**
1. Add "Delete account" section to settings page with confirmation dialog
2. Create `src/pages/api/account/delete.ts` endpoint
3. Cascade delete: Sessions, Accounts, Preferences, Subscriptions, Recipes, Ingredients, etc.
4. Optionally: soft-delete with 30-day recovery window
5. Ensure Stripe subscription is canceled before deletion
6. Add re-authentication requirement before deletion
7. Add audit log entry

**Files to change (when implemented):**
- `src/pages/settings.astro` — add delete section + dialog
- `src/pages/api/account/delete.ts` — new file
- `src/lib/db/account.ts` — new file, deletion logic
- `prisma/schema.prisma` — consider adding `deletedAt` soft-delete column

---

### 6. Email/password change in settings

**Current state:** Settings page shows: name, email (read-only), profile image. No fields to change email or password. Only theme and accent preferences are editable.

**What to do:**

1. Add "Change email" section — current email, new email, confirm new email + current password
2. Add "Change password" section — current password, new password, confirm
3. Create `src/pages/api/account/change-email.ts`
4. Create `src/pages/api/account/change-password.ts`
5. Use Better Auth's account management API
6. If email verification is active (see #1), require re-verification on email change
7. CSRF protection on all POST endpoints

**Files to change:**
- `src/pages/settings.astro` — add email/password change forms
- `src/pages/api/account/change-email.ts` — new file
- `src/pages/api/account/change-password.ts` — new file

---

### 7. Session management UI

**Status: 🚧 Code complete, UI hidden. To be re-enabled after UX review.**

**Current state:** Session model tracks `ipAddress`, `userAgent`, `createdAt`, `expiresAt`. No UI to view or revoke sessions. Users can't see if their account is signed in elsewhere.

**What to do (when un-hidden):**

1. Add "Active sessions" tab to settings page
2. Display: device/browser (parsed from userAgent), IP, location (city/country from IP), last active, current session indicator
3. "Sign out everywhere" button (revokes all sessions except current)
4. Individual "Revoke" button per session
5. Restore `src/pages/api/account/sessions.ts` (GET list, DELETE revoke)
6. Restore `src/pages/api/account/sessions/all.ts` (DELETE all)

**Files to restore:**
- `src/pages/settings.astro` — add sessions tab + content block + JS
- `src/pages/api/account/sessions.ts` — API endpoint
- `src/pages/api/account/sessions/all.ts` — API endpoint
- `src/lib/db/sessions.ts` — session DB queries
- `src/lib/db/index.ts` — re-add export

---

### 8. CSRF cookie hardening

**Current state:** CSRF cookie set with `httpOnly: false` so client-side JS can read it for fetch requests. This exposes the token to XSS attacks.

**What to do:**

1. Option A: Move all authenticated POSTs to Astro Actions or form POSTs — then CSRF goes in hidden field only, cookie can be `httpOnly: true`
2. Option B: Keep `httpOnly: false` but add `SameSite: Strict` (already set) and Content-Security-Policy header
3. Option C: Use double-submit pattern with signed cookie
4. At minimum: add CSP header in middleware to limit script execution

**Files to change:**
- `src/middleware.ts` — update `httpOnly` setting, add CSP header
- Optionally migrate client-side fetch calls to form submissions

---

## P2 — Nice-to-have

### 9. MFA/2FA support

**Status: 🚧 Code complete, UI hidden. To be re-enabled after UX review + design of full flow.**

Better Auth supports TOTP natively. Minor effort, significant security gain.

**What to do (when un-hidden):**

1. Uncomment `twoFactor` block in `src/lib/auth.ts`
2. Uncomment `twoFactorClient` plugin in `src/lib/auth-client.ts`
3. Restore `src/pages/settings/mfa.astro` — enable/disable, QR code setup
4. Restore `src/pages/verify-2fa.astro` — 2FA prompt page at sign-in
5. Add recovery codes generation and storage
6. Re-add "Seguridad" tab to settings nav

**Files to restore:**
- `src/lib/auth.ts` — twoFactor config
- `src/lib/auth-client.ts` — twoFactorClient plugin
- `src/pages/settings/mfa.astro` — MFA settings page
- `src/pages/verify-2fa.astro` — 2FA verify page
- `src/pages/settings.astro` — Seguridad tab in nav

---

### 10. Google OAuth rate limiting

**Current state:** Rate limiter in `src/pages/api/auth/[...all].ts` only checks for `sign-up/email` and `sign-in/email` paths. Google OAuth sign-up/sign-in is not rate limited.

**What to do:**

1. Add rate limit check for OAuth provider routes in the auth handler
2. Or: rate limit the `/api/auth/sign-in/social` path specifically
3. Track by IP, same window as email sign-in

**Files to change:**
- `src/pages/api/auth/[...all].ts` — add OAuth rate limit check

---

### 11. Auth audit log

No record of sign-ins, sign-ups, password changes, email changes, etc. Debugging and security incident response is difficult.

1. Add `AuditLog` model to Prisma schema
2. Fields: `id`, `userId`, `action` (enum: sign_in, sign_up, password_change, email_change, account_delete, session_revoke), `ipAddress`, `userAgent`, `createdAt`
3. Log on middleware (sign-in detection) or in auth callbacks
4. Add admin dashboard or settings viewer for user's own log

**Files to change:**
- `prisma/schema.prisma` — add AuditLog model
- `src/lib/db/audit.ts` — new file, log operations
- `src/middleware.ts` — log sign-ins
- `src/pages/settings.astro` — show user's own audit log

---

### 12. Role/claims system

No `role` field on User model. All users are equal. No admin panel, no moderation.

1. Add `role` field to User model: `enum Role { USER, ADMIN, MODERATOR }`
2. Create `hasRole(user, role)` and `requireRole(role)` utilities
3. Gate admin routes behind role check in middleware
4. Create simple admin dashboard for user management (future)

**Files to change:**
- `prisma/schema.prisma` — add Role enum + role field
- `src/middleware.ts` — populate role in locals
- `src/lib/auth.ts` — add role to session
- `src/lib/db/users.ts` — role queries

---

## Implementation order

```
P0 ✅: email verification → password reset → rate limiter → cache
P1 ✅/🔄: email/password change → CSRF hardening  |  🔒 session management (hidden, needs UX)  |  ⏳ account deletion (TBD)
P2 ✅/🔄: Google OAuth rate limit → audit log → role system  |  🔒 MFA/2FA (hidden, needs UX)
```

### Enabling hidden features

To re-enable Session Management or MFA/2FA:
1. Follow the "Files to restore" lists in their respective sections above
2. Re-add any removed lucide icons to `astro.config.mjs`
3. Run `pnpm astro check` to verify