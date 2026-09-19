# Decompose monolithic auth config into focused modules

> **Histórico (pre-Nuxt).** Documento de la etapa anterior a la migración a Nuxt (Task 13b): se conserva como registro, no como guía operativa, y las rutas o comandos que cita pueden no existir. Ver `docs/README.md`.

## Problem Statement

The `initAuth()` function in `packages/auth/src/auth.ts` is 114 lines of a single Better Auth config object. The `sendResetPassword` callback alone mixes database read/write, crypto token generation, URL construction, HTML rendering, and email dispatch — five distinct concerns in one function. While `password-reset.ts` and `email.ts` already exist as separate modules, the callback composition lives inside `auth.ts`, making it untestable in isolation and coupling the auth config to every concern it touches.

## Solution

Extract `sendResetPassword` and `sendVerificationEmail` callbacks into their own modules that compose the existing `password-reset.ts`, `email.ts`, and `prisma` adapters. The auth config becomes a composition layer: each callback is imported as a pre-built function and assigned to the config, rather than defined inline.

## User Stories

1. As a developer modifying the password-reset flow, I want to change the reset email template without touching the auth config, so that I don't risk breaking authentication setup.
2. As a developer testing the password-reset email, I want to exercise the email-sending logic independently of the auth framework, so that I can write focused tests.
3. As a developer reading the auth module, I want the init function to clearly show what adapters are wired together, so that I understand the architecture without deciphering 70-line inline callbacks.
4. As a developer reusing password-reset logic in a different context (e.g., admin-triggered reset), I want the sending logic available as a standalone function, so that I don't duplicate it.
5. As a developer adding a new email notification (e.g., sign-in alert), I want a clear pattern for composing a callback and plugging it into the auth config, so that the codebase has a consistent convention.

## Implementation Decisions

### New modules

- `packages/auth/src/reset-password-callback.ts`: exports `createResetPasswordCallback(prisma, sendEmail, createPasswordResetToken, getResetPasswordEmailHtml) => ({ user, url }) => Promise<void>`. The factory accepts the token and template helpers as parameters for testability. Composes `email.ts` for dispatch. User lookup, URL construction, and dispatch are thin orchestration; the token lifecycle lives in `password-reset.ts`.
- `packages/auth/src/verification-email-callback.ts`: exports `createVerificationEmailCallback(sendEmail) => ({ user, url }) => Promise<void>`. Composes `email.ts` for dispatch. The HTML body is constructed as a single template literal (matching the current format).

### Auth config change

`auth.ts` imports the creator functions and assigns them as callbacks:

```ts
sendResetPassword: createResetPasswordCallback(prisma, sendEmail),
// ...
sendVerificationEmail: createVerificationEmailCallback(sendEmail),
```

The existing `password-reset.ts` and `email.ts` modules are not modified — they are already well-factored. This change moves the composition out of `auth.ts` and uses the existing `createPasswordResetToken` helper instead of duplicating the token CRUD logic inline.

### Exports

The new factories are exported from `@recetario/auth/server` and re-exported from `@recetario/auth` via `export * from "./server.js"` (per the auth-barrel-dedup convention). External consumers wire them with their own `prisma` and `sendEmail`.

### Constants

- `RESET_TOKEN_EXPIRY_MINUTES = 10` lives in `reset-password-callback.ts` (used in the `createPasswordResetToken` call and the email template).
- Subject lines ("Restablece tu contraseña - KitchCalc", "Verifica tu email - KitchCalc") and the `"usuario"` fallback remain inline (preserves current behavior).

### URL transformation

`${url.split("?")[0]}?token=${resetToken}` — strips Better Auth's query string and uses our locally-generated token. The new module includes a comment referencing the rationale (a `ponytail:` justification line + the ADR link). See [ADR-0001](../adr/0001-password-reset-token-authority.md).

### Error handling

Errors in any step (user lookup, token CRUD, email dispatch) are caught and logged inside the callback. The `console.error("[AUTH] ...") pattern is preserved. No change to error visibility or recovery.

## Testing Decisions

### Framework

Vitest, added to `packages/auth/package.json` as a dev dependency.

### Pattern

All I/O modules in the auth package export factory functions. The factory takes its external dependencies (`prisma`, `sendEmail`, env config) as parameters. Tests inject mocks via these parameters — the same parameter list a real consumer would use. This is the only test infrastructure pattern defined by this spec; other modules in the monorepo can adopt it as they grow their own tests.

### Test files

Co-located `*.test.ts` next to source:
- `packages/auth/src/reset-password-callback.test.ts`
- `packages/auth/src/verification-email-callback.test.ts`

### Mocking

- All test dependencies are injected as factory parameters — `prisma` methods, `sendEmail`, `createPasswordResetToken`, and `getResetPasswordEmailHtml` are all `vi.fn()` mocks. No module-level `vi.mock` calls.
- No real DB; no docker; no Prisma test schema.

### Test cases for `reset-password-callback.test.ts`

1. **Happy path**: `prisma.user.findUnique` is called with `{ id: user.id }` selecting firstName and name; `createPasswordResetToken` (injected mock) is called with the same user id and `RESET_TOKEN_EXPIRY_MINUTES`; `sendEmail` is called with the right `to`, `subject`, and `html` containing the reset link.
2. **No firstName, no name**: the rendered `userName` in the email falls back to `"usuario"`.
3. **User lookup throws**: error is caught, logged with `[AUTH] sendResetPassword failed:`, not rethrown.
4. **Email dispatch throws**: same behavior.
5. **URL transformation**: the reset link in the email body does not contain Better Auth's `token`; it contains the locally-generated UUID.

### Test cases for `verification-email-callback.test.ts`

1. **Happy path**: `sendEmail` is called with the right `to`, `subject`, and `html` containing the verification URL.
2. **Email dispatch throws**: error is caught, logged with `[AUTH] sendVerificationEmail failed:`, not rethrown.

## Out of Scope

- Changing the content or format of reset/verification emails.
- Modifying the Better Auth configuration structure or plugin set.
- Moving any other configuration (social providers, hooks, session config) out of `auth.ts` — only the callbacks that contain multi-step logic are extracted.
- Adding retry logic or improved error handling for email dispatch.
- Refactoring `password-reset.ts` or `email.ts` to factory pattern (deferred to follow-up PRs).
- Scaffolding test infrastructure for other modules in the monorepo (only the new modules get tests in this change).

## Further Notes

This is Candidate #3 from the July 24, 2026 architecture review. The `auth.ts` file shrinks from 142 lines to approximately 80 lines. The new modules total ~50 lines plus tests. The factory pattern is justified by the test infrastructure design — tests inject mocks via the factory's parameters, no DB required.
