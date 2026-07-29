import type { SendEmailFn } from "./email.js";

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? "http://localhost:4321";
const API_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:8787";

export function createVerificationEmailCallback(sendEmail: SendEmailFn) {
  return async ({
    user,
    url,
  }: {
    user: { email: string };
    url: string;
  }): Promise<void> => {
    // Better Auth generates URLs pointing to the API server
    // (e.g. http://localhost:8787/api/auth/verify-email), but the user
    // needs to land on the web app's /verify-email page (localhost:4321).
    const webUrl = url.replace(API_URL, WEB_ORIGIN).replace("/api/auth/verify-email", "/verify-email");
    try {
      await sendEmail({
        to: user.email,
        subject: "Verifica tu email - KitchCalc",
        html: `<p>Haz clic en el enlace para verificar tu email:</p><p><a href="${webUrl}">${webUrl}</a></p><p>Este enlace expira en 1 hora.</p>`,
      });
    } catch (e) {
      console.error("[AUTH] sendVerificationEmail failed:", e);
    }
  };
}
