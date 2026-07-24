# KitchCalc Context

Project-specific terminology for the KitchCalc monorepo (Recetario).

## Auth

**Auth callback**:
A function KitchCalc provides to fill a slot in Better Auth's config (e.g., `sendResetPassword`, `sendVerificationEmail`). Better Auth calls the callback at the appropriate moment in the auth flow.

_Avoid_: "auth handler" (overloaded), "auth function" (too generic).

**Auth callback factory**:
A function that returns an auth callback. The factory takes the callback's external dependencies (`prisma`, `sendEmail`, env config) as parameters; the returned callback is the unit of work. The factory is the testability seam for I/O modules — tests inject mocks via the parameters.

**Auth config**:
The object returned by `initAuth()` in `packages/auth/src/auth.ts` — the Better Auth instance with all adapters, callbacks, and session settings wired in. After decomposition, this is a thin composition layer that imports pre-built callbacks from focused modules.

**Composition layer**:
A module whose only job is to wire together pre-built pieces. In `packages/auth/src/auth.ts`, the composition layer imports `prisma`, `sendEmail`, callback factories, and middleware, and assembles them into the Better Auth config.

**Token authority**:
The system that owns the password-reset token table and validation flow. In KitchCalc, the authority is the project's own `passwordResetToken` Prisma model and `validatePasswordResetToken` in `password-reset.ts` — Better Auth's `token` parameter is discarded. See [ADR-0001](./docs/adr/0001-password-reset-token-authority.md).

## Email

**Email transport**:
The boundary that sends email — `sendEmail` in `packages/auth/src/email.ts`. Callers provide `to`, `subject`, `html`; the transport handles the actual dispatch (Resend API in production, console-log stub otherwise).

**Email template**:
A pure function that renders the HTML body of an email (e.g., `getResetPasswordEmailHtml` in `password-reset.ts`). Takes data, returns a string. No I/O.

_Avoid_: "email body" (overloaded), "email renderer" (less precise).
