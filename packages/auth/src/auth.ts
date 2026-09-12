import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@recetario/db";
import { sendEmail } from "./email";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { validatePassword } from "./password-validation";
import {
  createPasswordResetToken,
  getResetPasswordEmailHtml,
} from "./password-reset";
import { createResetPasswordCallback } from "./reset-password-callback";
import { createVerificationEmailCallback } from "./verification-email-callback";
import { getTrustedOrigins } from "./csrf";
import { recordSignInAudit } from "./session-audit";

// ponytail: WEB_ORIGIN defaults to localhost:4321 (dev) so trustedOrigins
// and errorURL don't need to be hardcoded. In prod, set
// WEB_ORIGIN=https://app.kitchcalc.com in apps/api env.
export function createAuth(): any {
  const webOrigin = process.env.WEB_ORIGIN ?? "http://localhost:4321";

  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
  }
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set");
  }

  return betterAuth({
    baseURL: webOrigin,
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
      sendResetPassword: createResetPasswordCallback(
          sendEmail,
          createPasswordResetToken,
          getResetPasswordEmailHtml,
        ),
    },
    emailVerification: {
      sendVerificationEmail: createVerificationEmailCallback(sendEmail),
      sendOnSignUp: true,
      sendOnSignIn: true,
      expiresIn: 86400,
    },
    rateLimit: { enabled: process.env.NODE_ENV === "production" },
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
    // Every new session means a successful authentication happened here, so
    // the audit row is written at the auth boundary instead of inferring it
    // from request paths in the web app.
    databaseHooks: {
      session: {
        create: {
          after: recordSignInAudit,
        },
      },
    },
    onAPIError: {
      onError(error: unknown) {
        const err = error as Record<string, unknown> | null | undefined;
        console.error("[Better Auth Error Details]", {
          name: err?.name,
          message: err?.message,
          code: err?.code,
          meta: err?.meta,
          stack: err?.stack,
        });
      },
      errorURL: `${webOrigin}/sign-in`,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    // ponytail: both dev origins (API + web). For prod, set
    // BETTER_AUTH_URL and WEB_ORIGIN to the prod API and web URLs. The CSRF
    // policy in apps/api reads the same helper, so both layers agree.
    trustedOrigins: getTrustedOrigins(),
  });
}

let authInstance: any = null;

export function getAuth(): any {
  if (!authInstance) {
    authInstance = createAuth();
  }
  return authInstance;
}

export const auth = new Proxy({} as any, {
  get(_target, prop) {
    const instance = getAuth();
    const value = Reflect.get(instance, prop);
    if (typeof value === "function") {
      return value.bind(instance);
    }
    return value;
  },
});

