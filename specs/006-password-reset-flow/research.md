# Research: Password Reset Flow

## Decision: Use Better Auth hooks for custom reset flow

### Better Auth Internals
- `forgetPassword()` triggers `sendResetPassword` hook
- `resetPassword()` validates token and updates password
- Tokens stored in `Verification` table with identifier="reset-password"
- Default expiry: 3600 seconds (1 hour)

### Custom Implementation Approach
Override the default Better Auth flow to add:
1. **10-minute expiry** via custom token generation
2. **Branded email template** via Resend HTML emails
3. **Countdown timer** via client-side JavaScript
4. **Rate limiting** via existing `rate-limiter.ts`

### Resend Best Practices
- Use transactional email templates with clear branding
- Include preheader text for email clients
- Mobile-responsive design
- Clear CTA button
- Footer with unsubscribe (optional for transactional)

### Security Considerations
- Token should be cryptographically random (use `crypto.randomUUID`)
- Store hashed token in database (not plain text)
- Invalidate old tokens on new request
- Log all password reset attempts in AuditLog
- Rate limit forgot-password endpoint (5 per 15 min)

---

## Alternatives Considered

| Alternative | Rationale |
|-------------|-----------|
| Use Better Auth default | Rejected - 1hr expiry, plain email template |
| Custom flow bypassing Better Auth | Rejected - unnecessary complexity |
| Use Verification model directly | Chosen - leverages existing auth infrastructure |

---

## Bibliography
- Resend Email Templates: https://resend.com/docs/dashboard/email-templates
- Better Auth hooks documentation
- OWASP Password Storage Guidelines