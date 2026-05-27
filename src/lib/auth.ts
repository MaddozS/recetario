import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export const auth = betterAuth({
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
    sendResetPassword: async ({ user, url }) => {
      try {
        await sendEmail({
          to: user.email,
          subject: "Restablece tu contraseña - KitchCalc",
          html: `<p>Haz clic en el enlace para restablecer tu contraseña:</p><p><a href="${url}">${url}</a></p><p>Este enlace expira en 1 hora.</p>`,
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
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      disableSignUp: false,
      mapProfileToUser: (profile) => ({
        firstName: profile.given_name,
        lastName: profile.family_name,
      }),
    },
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
