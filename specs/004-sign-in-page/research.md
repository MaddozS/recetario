# Research: Página de Inicio de Sesión

**Feature**: 004-sign-in-page | **Phase**: 0

## R1: Better Auth `disableSignUp` for Google Social Provider

**Question**: How to prevent Google OAuth from auto-creating accounts?

**Decision**: Use Better Auth's built-in `disableSignUp: true` option on the Google social provider config.

**Rationale**: Better Auth v1.6's `socialProviders.<provider>.disableSignUp` option (documented in [options reference](https://www.better-auth.com/docs/reference/options#socialproviders)) explicitly prevents automatic user creation during OAuth sign-in. When a user attempts to sign in with Google and no linked account exists, Better Auth returns an error instead of creating one. This is the simplest, most maintainable solution — no custom hooks or middleware needed.

**Alternatives considered**:
1. Custom `databaseHooks.user.create.before` to reject: Requires checking OAuth context manually, fragile.
2. Custom middleware on `/api/auth/callback/google`: Intercepts at wrong level; can't reliably prevent account creation.
3. `account.accountLinking.enabled: false` + custom logic: Prevents linking but doesn't prevent initial creation.

**Implementation**:
```ts
// src/lib/auth.ts — add to socialProviders.google:
{
  clientId: process.env.GOOGLE_CLIENT_ID!,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
  disableSignUp: true,  // ← new line
}
```

**Error shape**: When `disableSignUp: true` blocks sign-in, Better Auth's client throws an error. The specific error code/message needs testing, but the page already catches and displays generic errors via `showError()`.

---

## R2: Post-Auth Redirect with `?redirect=` Query Param

**Question**: How to support `?redirect=` for deep-linking after sign-in while preventing open redirect attacks?

**Decision**: Read `redirect` param from `URLSearchParams`, validate it's a same-origin relative path, pass to auth flow. For email sign-in, redirect in page script. For Google, set as `callbackURL`.

**Rationale**:
- **Email sign-in**: The page script already calls `signInWithEmail()` then `window.location.href`. Replace hardcoded `/recipes` with validated redirect.
- **Google sign-in**: Better Auth's `signIn.social({ callbackURL })` accepts any same-origin URL. After OAuth callback processing, the user's browser is redirected there. Simply pass validated redirect as callbackURL.
- **Validation**: Check `redirect` starts with `/` and does not contain `//` or `:` (blocks `https://`, `//evil.com`, `javascript:`). Fallback to `/recipes` on invalid/missing.

**Alternatives considered**:
1. SessionStorage: Store redirect target before Google OAuth, retrieve on landing page. Requires changes to `/recipes` or a shared script. Over-engineered for this case.
2. Server-side redirect handling: Read from Astro middleware. Complicates middleware. Unnecessary.
3. Hash-based: Use `#redirect=` fragment. Fragile, not accessible server-side.

**Implementation sketch** (page script):
```ts
function getSafeRedirect(): string {
  const params = new URLSearchParams(window.location.search);
  const redirect = params.get("redirect");
  if (redirect && redirect.startsWith("/") && !redirect.includes("//") && !redirect.includes(":")) {
    return redirect;
  }
  return "/recipes";
}
const redirectTarget = getSafeRedirect();

// Email: window.location.href = redirectTarget;
// Google: callbackURL: `${window.location.origin}${redirectTarget}`
```

---

## R3: Generic Error Messages for Security

**Question**: How to ensure the page never reveals whether an email exists vs. password is wrong?

**Decision**: Keep current generic error message `"Credenciales inválidas."` for all email/password failures. For `EMAIL_NOT_VERIFIED`, keep the specific message (it's a legitimate account state, not an enumeration vector — the user already has the email). For Google `disableSignUp` errors, use a generic message.

**Rationale**:
- The current code already uses `"Credenciales inválidas."` as fallback. This satisfies FR-006.
- `EMAIL_NOT_VERIFIED` is a distinct code from Better Auth that indicates the account exists but needs verification. Showing this is acceptable because the user already knows their email. The security risk (enumeration) is minimal: an attacker would need valid credentials for an unverified account to learn it exists.
- For Google: Better Auth's error when `disableSignUp: true` blocks sign-in should be caught and displayed as a generic message (e.g., "No se pudo iniciar sesión con Google."). We don't know the exact error code yet — test and adjust.

---

## R4: Existing Middleware Session Guard

**Question**: Does the existing middleware already redirect authenticated users away from `/sign-in`?

**Decision**: Yes, confirmed. The middleware at `src/middleware.ts` checks `Astro.locals.session` and redirects authenticated users. `/sign-in` is listed as a public page in the constitution. However, we need to verify the redirect works — if not, add explicit check in the page frontmatter.

**Rationale**: The constitution lists `/sign-in` under "Public" and describes middleware behavior. FR-001 and FR-002 are already partially satisfied by existing infrastructure. If gaps exist, a simple frontmatter redirect (`Astro.redirect`) will handle edge cases.

**Implementation**: Verify middleware handles `/sign-in` guard. If not, add to page frontmatter:
```astro
---
if (Astro.locals.session) return Astro.redirect("/recipes");
---
```

---

## R5: Responsive Design and Impeccable Audit

**Question**: Does the current sign-in page meet responsive design standards for all screen sizes?

**Decision**: The current page uses `max-w-sm` card with `px-4` padding wrapper. This already works well on mobile (card fills width on small screens). Minor adjustments needed for `min-h-[80vh]` on very short viewports and `pt-20` on very small screens.

**Findings from impeccable analysis** (see `impeccable-audit.md`):
- **Layout**: Good — centered card with nav bar. `max-w-sm` constrains width, `px-4` ensures edge padding.
- **Typography**: `text-2xl font-black` heading, `text-sm` body — clear hierarchy. One Label Rule followed (`uppercase tracking-wider` on label).
- **Color**: All semantic tokens (`bg-card`, `text-foreground`, `border-border`). Landing page uses coral accent via layout. No hardcoded colors.
- **Touch targets**: Buttons use `min-h-11 min-w-11` — exceeds WCAG 44px minimum.
- **Motion**: No animations on layout properties. Should add `prefers-reduced-motion` respect.
- **Responsive issues found**:
  - `min-h-[80vh]` + `pt-20` on the container: on very short viewports (e.g., landscape mobile, 320px height), the card may extend beyond screen. Fix: change to `min-h-screen` or add `py-20` instead of `pt-20`.
  - Password toggle button uses absolute positioning — ensure it doesn't overflow on very narrow screens. Currently works with `right-2` + `pr-11` on input.
- **Accessibility**: All interactive elements are buttons/links with aria-labels. Form uses proper `<label for="...">`. Color contrast via semantic tokens needs verification against WCAG AA.

**Recommendation**: Minimal responsive fixes. The page is already well-structured for responsive use. See `impeccable-audit.md` for full findings and recommended tweaks.
