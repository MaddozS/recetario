# @recetario/auth

Better Auth server + client, CSRF, rate limiter, password utilities, sign-in/out helpers, and email sending for KitchCalc.

## Usage

```ts
import { auth } from "@recetario/auth";
import { authClient } from "@recetario/auth";
import { signInWithGoogle } from "@recetario/auth";
import { signOut } from "@recetario/auth";
import { rateLimitCheck } from "@recetario/auth";
import { validatePassword } from "@recetario/auth";
import { validateCsrf, generateToken } from "@recetario/auth";
// etc.
```

## Environment Variables

| Variable | Runtime | Description |
|---|---|---|
| `BETTER_AUTH_SECRET` | Server (`process.env`) | Better Auth encryption secret (min 32 chars) |
| `BETTER_AUTH_URL` | Server (`process.env`) | Base URL (e.g. `https://kitchcalc.com`) |
| `GOOGLE_CLIENT_ID` | Server (`process.env`) | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Server (`process.env`) | Google OAuth client secret |
| `RESEND_API_KEY` | Server (`process.env`) | Resend API key for transactional emails |
| `SENDER_EMAIL` | Server (`process.env`) | From address for emails |
| `PUBLIC_BETTER_AUTH_URL` | Client (`import.meta.env.PUBLIC_*`) | Base URL for client-side auth client |

### Server vs Client

- Server-side files (`auth.ts`, `csrf.ts`, `email.ts`, etc.) use `process.env.*` — standard Node.js environment variables. Resolved at runtime on Cloudflare Workers/Pages (set via `wrangler secret put` or dashboard; local dev via `apps/*/.dev.vars`, synced from root `.env` by `pnpm dev`).
- Client-side file (`auth-client.ts`) uses `import.meta.env.PUBLIC_*` — Vite/Astro build-time substitution. Only `PUBLIC_*` prefixed vars are available to browser code.
- `auth-client.ts` also falls back to `window.location.origin` when the env var is unset (useful during development).

## Dependencies

- **peerDependency**: `@recetario/db` (Prisma client + utilities)
- **runtime**: `better-auth`

## Files

| File | Description |
|---|---|
| `auth.ts` | Better Auth server singleton (Prisma adapter, Google OAuth, email/password, hooks) |
| `auth-client.ts` | Better Auth browser client (uses `import.meta.env.PUBLIC_BETTER_AUTH_URL`) |
| `csrf.ts` | Server-side CSRF token generation/validation |
| `csrf-client.ts` | Client-side CSRF cookie reader |
| `rate-limiter.ts` | DB-backed rate limiter (Prisma `RateLimitEntry`) |
| `password-validation.ts` | Password strength rules (min 8 chars, upper, lower, digit, special) |
| `password-reset.ts` | Password reset token CRUD + HTML email template |
| `sign-in.ts` | Google/email sign-in helpers (client-side) |
| `sign-out.ts` | Sign-out helper (client-side) |
| `email.ts` | Resend transactional email sender (stubs when no API key) |
