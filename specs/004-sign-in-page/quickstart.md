# Quickstart: Página de Inicio de Sesión

**Feature**: 004-sign-in-page | **Phase**: 1

## Prerequisites

- `pnpm dev` running at `localhost:4321`
- Database seeded (existing user with email/password)
- Google OAuth credentials configured in `.env`
- At least one user account linked to Google (for testing Google sign-in)

## Files to Modify

| File | Change |
|------|--------|
| `src/lib/auth.ts` | Add `disableSignUp: true` to `socialProviders.google` |
| `src/lib/sign-in.ts` | Update `signInWithGoogle` to accept optional `redirectTarget` param |
| `src/pages/sign-in.astro` | Rewrite JS logic: redirect validation, generic errors, Google no-auto-create |

## Step-by-Step

### 1. Disable Google Auto-Signup (Server Config)

In `src/lib/auth.ts`, add `disableSignUp: true` to the Google provider:

```ts
socialProviders: {
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID!,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    disableSignUp: true,  // ← add this line
  },
},
```

### 2. Update signInWithGoogle

In `src/lib/sign-in.ts`, accept optional redirect:

```ts
export async function signInWithGoogle(redirectUrl?: string) {
  await authClient.signIn.social({
    provider: "google",
    callbackURL: `${window.location.origin}${redirectUrl || "/recipes"}`,
  });
}
```

### 3. Update Page Script

In `src/pages/sign-in.astro` `<script>`:

1. Add `getSafeRedirect()` function
2. Use it for both email and Google sign-in redirects
3. Ensure generic error messages for security (FR-006, FR-010)
4. Verify middleware redirect for authenticated users

## Verification

```bash
# Type-check
pnpm astro check

# Lint
pnpm eslint .

# Dev server
pnpm dev
```

### Test Checklist

- [ ] `/sign-in` redirects to `/recipes` when session active
- [ ] Email + correct password → signs in
- [ ] Email + wrong password → "Credenciales inválidas." (no hint about email existence)
- [ ] Non-existent email + any password → "Credenciales inválidas." (same message)
- [ ] Unverified account → verification message with resend option
- [ ] Google sign-in with linked account → signs in
- [ ] Google sign-in WITHOUT linked account → error, no account created
- [ ] `?redirect=/recipes/123` → after sign-in → `/recipes/123`
- [ ] `?redirect=https://evil.com` → after sign-in → `/recipes` (ignored)
- [ ] `?redirect=//evil.com` → after sign-in → `/recipes` (ignored)
- [ ] Page renders correctly on mobile (375px), tablet (768px), desktop (1280px)
- [ ] Password toggle works (eye icon shows/hides)
- [ ] Both buttons disable during auth (no double-submit)
- [ ] `Regístrate` link → `/sign-up`
- [ ] `¿Olvidaste tu contraseña?` link → `/forgot-password`
