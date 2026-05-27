# Quickstart: Página de Registro de Usuario

**Feature**: 005-sign-up-page | **Date**: 2026-05-27

## Prerequisites

- PostgreSQL running and `DATABASE_URL` set
- Google OAuth credentials configured (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- All dependencies installed (`pnpm install`)

## Implementation Steps

### 1. Update Prisma Schema

Add `firstName` and `lastName` fields to the `User` model in `prisma/schema.prisma`:

```prisma
model User {
  firstName String  @map("first_name")
  lastName  String  @map("last_name")
  // ... keep existing fields
}
```

### 2. Run Migration

```bash
npx prisma migrate dev --name add_first_last_name
npx prisma generate
```

### 3. Update Auth Config

In `src/lib/auth.ts`:

- Add `user.additionalFields` with `firstName` and `lastName`
- Change `disableSignUp: false` for Google provider
- Add `mapProfileToUser` for Google

### 4. Update Client Sign-Up Function

In `src/lib/sign-in.ts`, update `signUpWithEmail` to accept `firstName` and `lastName`:

```typescript
export async function signUpWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
) {
  const { error } = await authClient.signUp.email({
    email,
    password,
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
  });
  if (error) throw error;
}
```

### 5. Update Sign-Up Page

In `src/pages/sign-up.astro`:

- Add `first_name` and `last_name` input fields (before `email`)
- Update form submit handler to read new fields and pass to `signUpWithEmail`
- The Google button works as-is (uses existing `signInWithGoogle`)

### 6. Update Sign-In Page (minor)

In `src/pages/sign-in.astro`:

- Remove the `signup_disabled` error handler (since `disableSignUp` is now `false`, this error code will never occur)

### 7. Verify

```bash
pnpm dev
# Navigate to http://localhost:4321/sign-up
# Test email registration flow
# Test Google registration flow
pnpm astro check   # Type-check
pnpm eslint .      # Lint
```
