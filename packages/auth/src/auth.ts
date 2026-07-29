import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import type { PrismaClient } from "@recetario/db";
import { createPrismaClient } from "@recetario/db";
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

// ponytail: WEB_ORIGIN defaults to localhost:4321 (dev) so trustedOrigins
// and errorURL don't need to be hardcoded. In prod, set
// WEB_ORIGIN=https://app.kitchcalc.com in apps/api env.
const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:4321";
const API_ORIGIN = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";

// ponytail: any type to bypass generic mismatch with inferred config
export function createAuth(prisma: PrismaClient): any {
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

// ponytail: backward-compat singleton — used by the rest of apps/api
// (recipes, preferences, etc.) where a fresh pool per request isn't
// worth the latency. The /api/auth/* handler in apps/api uses
// createAuth(createPrismaClient()) per request to dodge the pg.Pool
// wedge documented in memory #63.
export const auth = lazyInit("auth", () =>
  createAuth(createPrismaClient()),
) as ReturnType<typeof betterAuth>;
