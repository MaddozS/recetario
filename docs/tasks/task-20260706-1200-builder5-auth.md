# Task: Lazy betterAuth initialization

## Assigned Agent
kitchcalc-builder

## Context Received
- **Problem**: `packages/auth/src/auth.ts` calls `betterAuth({...})` at module top-level, reading `process.env.GOOGLE_CLIENT_ID!`, `GOOGLE_CLIENT_SECRET!`, `BETTER_AUTH_URL` at import time. In Vite SSR, `process.env` doesn't have `.env` vars, so Google OAuth gets `undefined` credentials — silently broken auth.
- **Pattern**: Same Proxy lazy-init pattern already applied to `packages/db/src/prisma.ts`.
- **Current file**: `packages/auth/src/auth.ts` — 113 lines, `betterAuth({...})` called at top-level (line 11).

## Dependency And Parallel Safety
- Depends on: none
- Parallel group: lazy-env-fixes
- Parallel-safe: yes — edits `packages/auth/src/auth.ts` only, disjoint from stripe task
- Sibling tasks: task-20260706-1200-builder5-stripe (stripe.ts fix)

## Skills
Selected:
- ponytail — mirror proven Proxy pattern from prisma.ts
- better-auth-best-practices — auth-specific concerns for lazy init

## Scope
Editable files:
- `/Users/maddozs/personal-projects/recetario/packages/auth/src/auth.ts`

Forbidden files:
- all other files

## Instructions
1. Replace the content of `packages/auth/src/auth.ts`. The replacement wraps `betterAuth()` in a lazy `initAuth()` function and exports a Proxy. The key change: move the `process.env` reads and the `betterAuth()` call inside `initAuth()`. Add runtime guards for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` (the `!` assertion is TypeScript-only, not a runtime check).

2. The replacement content:

```typescript
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@recetario/db";
import { sendEmail } from "./email.js";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { validatePassword } from "./password-validation.js";
import { getResetPasswordEmailHtml } from "./password-reset.js";

const RESET_TOKEN_EXPIRY_MINUTES = 10;

// ponytail: lazy init — avoids reading process.env at import time
// in Vite SSR where .env isn't loaded into process.env.
let _auth: ReturnType<typeof betterAuth> | undefined;

function initAuth(): ReturnType<typeof betterAuth> {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
  }
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set");
  }

  _auth = betterAuth({
    database: prismaAdapter(prisma, {
      provider: "postgresql",
    }),
    user: {
      additionalFields: {
        firstName: { type: "string", required: true },
        lastName: { type: "string", required: true },
      },
    },
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: true,
      sendResetPassword: async ({ user, url, token }) => {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: user.id },
            select: { firstName: true, name: true },
          });
          const userName = dbUser?.firstName || dbUser?.name || "usuario";

          const resetToken = crypto.randomUUID();
          const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

          await prisma.passwordResetToken.deleteMany({
            where: { userId: user.id },
          });

          await prisma.passwordResetToken.create({
            data: {
              userId: user.id,
              token: resetToken,
              expiresAt,
            },
          });

          const resetLink = `${url.split("?")[0]}?token=${resetToken}`;
          const html = getResetPasswordEmailHtml({
            resetLink,
            userName,
            expiryMinutes: RESET_TOKEN_EXPIRY_MINUTES,
          });
          await sendEmail({
            to: user.email,
            subject: "Restablece tu contraseña - KitchCalc",
            html,
          });
        } catch (e) {
          console.error("[AUTH] sendResetPassword failed:", e);
        }
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        try {
          await sendEmail({
            to: user.email,
            subject: "Verifica tu email - KitchCalc",
            html: `<p>Haz clic en el enlace para verificar tu email:</p><p><a href="${url}">${url}</a></p><p>Este enlace expira en 1 hora.</p>`,
          });
        } catch (e) {
          console.error("[AUTH] sendVerificationEmail failed:", e);
        }
      },
      sendOnSignUp: true,
      sendOnSignIn: true,
      expiresIn: 3600,
    },
    socialProviders: {
      google: {
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        disableSignUp: false,
        mapProfileToUser: (profile) => ({
          firstName: profile.given_name,
          lastName: profile.family_name,
        }),
      },
    },
    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/sign-up/email") {
          const password = ctx.body?.password as string | undefined;
          if (!password || !validatePassword(password).valid) {
            throw new APIError("BAD_REQUEST", {
              message:
                "La contraseña debe tener al menos 8 caracteres, incluir mayúsculas, minúsculas, números y un carácter especial.",
            });
          }
        }
      }),
    },
    onAPIError: {
      errorURL: "/sign-in",
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    trustedOrigins: [process.env.BETTER_AUTH_URL ?? "http://localhost:4321"],
  });

  return _auth;
}

export const auth = new Proxy({} as ReturnType<typeof betterAuth>, {
  get(_target, key) {
    const client = initAuth();
    const value = (client as unknown as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
});
```

3. Rebuild the auth package: `pnpm --filter @recetario/auth build`
4. Verify build succeeds.

## Acceptance Criteria
- `auth.ts` uses lazy Proxy initialization (no top-level `betterAuth()` call)
- Runtime guards for `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` with clear error messages
- `pnpm --filter @recetario/auth build` succeeds
- All existing config (hooks, email, password reset, session) preserved inside `initAuth()`

## Reporting
Write report to: `docs/tasks/task-20260706-1200-builder5-auth-report.md`
Return only: done docs/tasks/task-20260706-1200-builder5-auth-report.md
