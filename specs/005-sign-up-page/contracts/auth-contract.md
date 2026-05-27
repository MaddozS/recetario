# Auth API Contract: Sign-Up

**Feature**: 005-sign-up-page | **Date**: 2026-05-27

## Client Functions

### `signUpWithEmail(email, password, firstName, lastName)`

Creates a new user account with email and password.

```typescript
// Signature (updated)
export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
): Promise<void>

// Underlying Better Auth call
authClient.signUp.email({
  email,
  password,
  name: `${firstName} ${lastName}`,
  firstName,
  lastName,
})
```

**Parameters**:
- `email`: Valid email string, trimmed
- `password`: String, min 6 chars
- `firstName`: Non-empty string, trimmed, max 100 chars
- `lastName`: Non-empty string, trimmed, max 100 chars

**Error codes** (thrown):
- `USER_ALREADY_EXISTS`: Email is already registered
- Validation errors from Better Auth

### `signInWithGoogle(redirectUrl?)` (unchanged function, reused)

Used by both sign-in and sign-up pages. With `disableSignUp: false`, creates account if Google email is not linked.

```typescript
export async function signInWithGoogle(redirectUrl?: string): Promise<void>

// Underlying Better Auth call
authClient.signIn.social({
  provider: "google",
  callbackURL: `${window.location.origin}${redirectUrl || "/recipes"}`,
})
```

## Server Auth Config Changes

### `src/lib/auth.ts`

```typescript
// ADD: user.additionalFields
user: {
  additionalFields: {
    firstName: { type: "string", required: true },
    lastName: { type: "string", required: true },
  },
},

// MODIFY: socialProviders.google
google: {
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  disableSignUp: false,                         // Changed from true
  mapProfileToUser: (profile) => ({             // NEW
    firstName: profile.given_name,
    lastName: profile.family_name,
  }),
},
```
