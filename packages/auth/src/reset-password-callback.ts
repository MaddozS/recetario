import type { SendEmailFn } from './email';
import { prisma } from '@recetario/db';

const RESET_TOKEN_EXPIRY_MINUTES = 10;

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:4321';
const API_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:8787';

export function createResetPasswordCallback(
  sendEmail: SendEmailFn,
  createPasswordResetToken: (userId: string, expiryMinutes?: number) => Promise<string>,
  getResetPasswordEmailHtml: (data: {
    resetLink: string;
    userName: string;
    expiryMinutes?: number;
  }) => string
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
      const userName = dbUser?.firstName || dbUser?.name || 'usuario';

      const resetToken = await createPasswordResetToken(user.id, RESET_TOKEN_EXPIRY_MINUTES);

      // ponytail: strips Better Auth's path token and query params,
      // then replaces the API origin+path with the web app origin+path.
      // The user lands on the web app's /reset-password page which calls
      // the API validation endpoint via fetch. This keeps the auth flow
      // consistent with the verification-email callback pattern.
      // See ADR-0001: password-reset-token-authority
      const baseUrl = url.split('?')[0];
      const basePath = baseUrl.substring(0, baseUrl.lastIndexOf('/'));
      const webUrl = basePath
        .replace(API_URL, WEB_ORIGIN)
        .replace('/api/auth/reset-password', '/reset-password');
      const resetLink = `${webUrl}?token=${resetToken}`;
      const html = getResetPasswordEmailHtml({
        resetLink,
        userName,
        expiryMinutes: RESET_TOKEN_EXPIRY_MINUTES,
      });
      await sendEmail({
        to: user.email,
        subject: 'Restablece tu contraseña - KitchCalc',
        html,
      });
    } catch (e) {
      console.error('[AUTH] sendResetPassword failed:', e);
    }
  };
}
