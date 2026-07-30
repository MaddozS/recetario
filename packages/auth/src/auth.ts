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

// ponytail: WEB_ORIGIN defaults to localhost:4321 (dev) so trustedOrigins
// and errorURL don't need to be hardcoded. In prod, set
// WEB_ORIGIN=https://app.kitchcalc.com in apps/api env.
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:4321";
const API_ORIGIN = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";

// ponytail: any type to bypass generic mismatch with inferred config
export function createAuth(): any {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
  }
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set");
  }

  return betterAuth({
    baseURL: WEB_ORIGIN,
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
      errorURL: `${WEB_ORIGIN}/sign-in`,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60,
      },
    },
    // ponytail: both dev origins (API + web). For prod, set
    // BETTER_AUTH_URL and WEB_ORIGIN to the prod API and web URLs.
    trustedOrigins: [API_ORIGIN, WEB_ORIGIN],
  });
}

export const auth = createAuth()
