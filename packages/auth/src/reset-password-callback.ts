import type { SendEmailFn } from "./email.js";

type PrismaForReset = {
  user: {
    findUnique: (args: {
      where: { id: string };
      select: { firstName: boolean; name: boolean };
    }) => Promise<{ firstName: string | null; name: string | null } | null>;
  };
};

const RESET_TOKEN_EXPIRY_MINUTES = 10;

export function createResetPasswordCallback(
  prisma: PrismaForReset,
  sendEmail: SendEmailFn,
  createPasswordResetToken: (
    userId: string,
    expiryMinutes?: number,
  ) => Promise<string>,
  getResetPasswordEmailHtml: (data: {
    resetLink: string;
    userName: string;
    expiryMinutes?: number;
  }) => string,
) {
  return async ({
    user,
    url,
  }: {
    user: { id: string; email: string };
    url: string;
  }): Promise<void> => {
    try {
      const dbUser = await prisma.user.findUnique({
        where: { id: user.id },
        select: { firstName: true, name: true },
      });
      const userName = dbUser?.firstName || dbUser?.name || "usuario";

      const resetToken = await createPasswordResetToken(
        user.id,
        RESET_TOKEN_EXPIRY_MINUTES,
      );

      // ponytail: strips Better Auth's query token and uses our own
      // See ADR-0001: password-reset-token-authority
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
  };
}
