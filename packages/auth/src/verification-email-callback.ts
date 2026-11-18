import type { SendEmailFn } from './email';
import { prisma } from '@recetario/db';

const WEB_ORIGIN = process.env.WEB_ORIGIN ?? 'http://localhost:4321';
const API_URL = process.env.BETTER_AUTH_URL ?? 'http://localhost:8787';

export interface VerificationEmailTemplateData {
  verificationLink: string;
  userName?: string;
}

export function getVerificationEmailHtml(data: VerificationEmailTemplateData): string {
  const userName = data.userName || 'usuario';
  const verificationLink = data.verificationLink;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verifica tu cuenta - KitchCalc</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family:'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing:antialiased;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color:#f8fafc; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width:600px; background-color:#ffffff; border-radius:12px; border:1px solid #e2e8f0; overflow:hidden;" border="0" cellspacing="0" cellpadding="0">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 32px 32px 20px 32px; border-bottom:1px solid #f1f5f9;">
              <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="vertical-align:middle;">
                    <a href="https://app.kitchcalc.com" style="text-decoration:none; display:inline-block;">
                      <img src="https://app.kitchcalc.com/kitchcalc_logo.svg" alt="KitchCalc" width="36" height="36" style="border-radius:10px; display:inline-block; vertical-align:middle; margin-right:10px; border:0;" />
                      <span style="font-family:'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:24px; font-weight:900; color:#0f172a; letter-spacing:-0.5px; vertical-align:middle;">KitchCalc</span>
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 32px; text-align:left;">
              <h1 style="font-family:'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:22px; font-weight:700; color:#0f172a; margin:0 0 16px 0;">Confirma tu correo electrónico</h1>
              <p style="font-size:15px; line-height:1.6; color:#334155; margin:0 0 24px 0;">
                ¡Hola, <strong>${userName}</strong>! Gracias por registrarte en KitchCalc. Para comenzar a calcular el costo real de tus recetas y gestionar tus márgenes, confirma tu dirección de correo electrónico haciendo clic en el siguiente botón:
              </p>
              <table border="0" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
                <tr>
                  <td align="center" style="border-radius:8px; background-color:#eb5757;">
                    <a href="${verificationLink}" target="_blank" style="font-family:'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none; padding:12px 28px; border-radius:8px; display:inline-block;">Verificar mi cuenta</a>
                  </td>
                </tr>
              </table>
              <p style="font-size:13px; line-height:1.5; color:#64748b; margin:0 0 16px 0;">
                Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                <a href="${verificationLink}" style="color:#eb5757; text-break:break-all;">${verificationLink}</a>
              </p>
              <p style="font-size:13px; color:#94a3b8; margin:0;">
                Este enlace expirará en 24 horas. Si no creaste una cuenta en KitchCalc, puedes ignorar este mensaje.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color:#f8fafc; text-align:center; border-top:1px solid #f1f5f9;">
              <p style="font-size:12px; color:#94a3b8; margin:0;">
                © KitchCalc. Calcula el costo real de tus recetas.<br>
                <a href="https://app.kitchcalc.com" style="color:#64748b; text-decoration:none;">app.kitchcalc.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function createVerificationEmailCallback(sendEmail: SendEmailFn) {
  return async ({
    user,
    url,
  }: {
    user: { id?: string; email: string; name?: string; firstName?: string };
    url: string;
  }): Promise<void> => {
    // Better Auth generates URLs pointing to the API server
    // (e.g. http://localhost:8787/api/auth/verify-email), but the user
    // needs to land on the web app's /verify-email page (localhost:4321).
    const webUrl = url
      .replace(API_URL, WEB_ORIGIN)
      .replace('/api/auth/verify-email', '/verify-email');

    let userName = user.firstName || user.name;
    if (!userName && user.id) {
      try {
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { firstName: true, name: true },
        });
        userName = dbUser?.firstName || dbUser?.name || undefined;
      } catch {
        // DB fallback if query fails
      }
    }
    userName = userName || 'usuario';

    try {
      await sendEmail({
        to: user.email,
        subject: 'Verifica tu cuenta - KitchCalc',
        html: getVerificationEmailHtml({
          verificationLink: webUrl,
          userName,
        }),
      });
    } catch (e) {
      console.error('[AUTH] sendVerificationEmail failed:', e);
    }
  };
}
