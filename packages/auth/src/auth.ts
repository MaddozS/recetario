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
// ponytail: any type to avoid generic mismatch with inferred config
let _auth: any;

function initAuth(): any {
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

// ponytail: cast to bypass strict generic mismatch between
// ReturnType<typeof betterAuth> and the actual inferred config type.
export const auth = new Proxy({} as any, {
  get(_target, key) {
    const client = initAuth();
    const value = (client as unknown as Record<string | symbol, unknown>)[key];
    return typeof value === "function" ? (value as Function).bind(client) : value;
  },
}) as ReturnType<typeof betterAuth>;
