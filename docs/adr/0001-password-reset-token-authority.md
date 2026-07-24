# Password-reset token authority lives in KitchCalc, not Better Auth

The `sendResetPassword` callback in `packages/auth/src/auth.ts` ignores the `token` parameter Better Auth passes and generates a fresh `crypto.randomUUID()` stored in our own `passwordResetToken` Prisma table. The reset link uses our local token, and validation runs through `validatePasswordResetToken` in `password-reset.ts`. We kept this control to manage token expiry, validation flow, and the user-facing reset UX directly rather than defer to Better Auth's built-in handling.

## Considered Options

- **Use Better Auth's built-in reset flow.** Rejected: gives up control over the token table, expiry policy, and the user-facing reset page. The pre-existing `PasswordResetToken` model and reset UX were built before the Better Auth migration and continue to serve users — switching would require reworking the data model, the reset form, and any code that reads tokens.
