# Data Model: Página de Inicio de Sesión

**Feature**: 004-sign-in-page | **Phase**: 1

## Summary

No new database entities, tables, or schema changes. This feature modifies only the presentation/authentication layer. All data models are reused from the existing system.

## Entities (Existing, Read-Only)

### User

| Field | Type | Description |
|-------|------|-------------|
| id | string (PK) | Better Auth user ID |
| email | string (unique) | User email address |
| emailVerified | boolean | Whether email has been verified |
| name | string | Display name |
| image | string? | Avatar URL |
| createdAt | datetime | Account creation timestamp |
| updatedAt | datetime | Last update timestamp |

**Used for**: Authentication validation. Not modified by this feature.

### Account

| Field | Type | Description |
|-------|------|-------------|
| id | string (PK) | Account ID |
| userId | string (FK → User) | Linked user |
| providerId | string | Provider name (e.g., "google", "credential") |
| accountId | string | Provider-specific account ID |
| accessToken | string? | OAuth access token (encrypted if configured) |
| refreshToken | string? | OAuth refresh token |
| createdAt | datetime | Account linking timestamp |
| updatedAt | datetime | Last update timestamp |

**Used for**: Google OAuth linking validation. Better Auth's `disableSignUp: true` checks this table to determine if a Google account is already linked to a User. No account = error.

### Session

| Field | Type | Description |
|-------|------|-------------|
| id | string (PK) | Session ID |
| userId | string (FK → User) | Linked user |
| token | string (unique) | Session token |
| expiresAt | datetime | Session expiration |
| createdAt | datetime | Session creation timestamp |
| updatedAt | datetime | Last update timestamp |

**Used for**: Session creation after successful sign-in. Managed entirely by Better Auth.

### RateLimitEntry

| Field | Type | Description |
|-------|------|-------------|
| key | string | Rate limit key (IP/path based) |
| count | int | Current request count |
| resetAt | datetime | Window reset timestamp |

**Used for**: Rate limiting on sign-in attempts. Read by middleware, managed by `src/lib/rate-limiter.ts`. Not modified by this feature.

### AuditLog

| Field | Type | Description |
|-------|------|-------------|
| id | string (PK) | Log entry ID |
| userId | string | User involved |
| event | string | Event type (e.g., "sign-in", "sign-up") |
| metadata | json? | Additional context |
| createdAt | datetime | Event timestamp |

**Used for**: Audit logging of sign-in events. Triggered by existing middleware. Not modified by this feature.

## State Transitions

### Sign-in Flow (Email/Password)

```
[User visits /sign-in]
  → [Middleware checks session] → if session exists → redirect /recipes
  → [User submits form]
  → [Better Auth validates credentials]
  → Credentials valid:
    → [Session created]
    → [AuditLog: "sign-in" event]
    → [Redirect to validated ?redirect= or /recipes]
  → Credentials invalid (wrong password):
    → [Error: "Credenciales inválidas."]
  → Email not verified:
    → [Error: "Debes verificar tu email..."]
    → [Option: resend verification email]
```

### Sign-in Flow (Google)

```
[User clicks "Continuar con Google"]
  → [Better Auth initiates OAuth flow → Google consent screen]
  → [Google redirects back to /api/auth/callback/google]
  → [Better Auth processes OAuth tokens]
  → disableSignUp=true → checks Account table for linked record:
    → Account exists:
      → [Session created]
      → [AuditLog: "sign-in" event]
      → [Redirect to validated ?redirect= or /recipes]
    → Account does NOT exist:
      → [Error returned to client]
      → [Page shows generic error message]
      → [No user/account created]
```

## Validation Rules

| Rule | Source | Enforcement |
|------|--------|-------------|
| `?redirect=` must start with `/` | Client script | `URLSearchParams` + validation function |
| `?redirect=` must not contain `//` or `:` | Client script | Prevents `https://evil.com` attacks |
| Email required | HTML5 | `required` attribute + `type="email"` |
| Password required | HTML5 | `required` attribute |
| `disableSignUp: true` for Google | Server config | Better Auth `socialProviders.google` |

## No Schema Migrations

This feature requires **zero database migrations**. The `disableSignUp` change in Better Auth config is purely behavioral — it uses existing User/Account tables to enforce the constraint at the application level.
