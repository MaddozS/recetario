import type { EmailPayload } from "./email.js";

type SendEmailFn = (payload: EmailPayload) => Promise<void>;

export function createVerificationEmailCallback(sendEmail: SendEmailFn) {
  return async ({
    user,
    url,
  }: {
    user: { email: string };
    url: string;
  }): Promise<void> => {
    try {
      await sendEmail({
        to: user.email,
        subject: "Verifica tu email - KitchCalc",
        html: `<p>Haz clic en el enlace para verificar tu email:</p><p><a href="${url}">${url}</a></p><p>Este enlace expira en 1 hora.</p>`,
      });
    } catch (e) {
      console.error("[AUTH] sendVerificationEmail failed:", e);
    }
  };
}
