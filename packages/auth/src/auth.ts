import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@recetario/db";
import { sendEmail } from "./email.js";
import { createAuthMiddleware, APIError } from "better-auth/api";
import { validatePassword } from "./password-validation.js";
import { lazyInit } from "@recetario/config/lazy";
import {
  createPasswordResetToken,
  getResetPasswordEmailHtml,
} from "./password-reset.js";
import { createResetPasswordCallback } from "./reset-password-callback.js";
import { createVerificationEmailCallback } from "./verification-email-callback.js";

// ponytail: lazy init — avoids reading process.env at import time
// in Vite SSR where .env isn't loaded into process.env.
// ponytail: any type to bypass generic mismatch with inferred config
function initAuth(): any {
  const googleClientId = process.env.GOOGLE_CLIENT_ID;
  if (!googleClientId) {
    throw new Error("GOOGLE_CLIENT_ID environment variable is not set");
  }
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!googleClientSecret) {
    throw new Error("GOOGLE_CLIENT_SECRET environment variable is not set");
  }

  return betterAuth({
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
          prisma,
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
}

// ponytail: cast to bypass strict generic mismatch between
// ReturnType<typeof betterAuth> and the actual inferred config type.
export const auth = lazyInit("auth", initAuth) as ReturnType<typeof betterAuth>;
