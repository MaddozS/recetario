import { prisma } from "@/lib/prisma";

export interface ResetPasswordTemplateData {
  resetLink: string;
  userName: string;
  expiryMinutes?: number;
}

export function getResetPasswordEmailHtml(data: ResetPasswordTemplateData): string {
  const resetLink = data.resetLink;
  const userName = data.userName || "usuario";
  const expiryMinutes = data.expiryMinutes || 10;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablece tu contraseña - KitchCalc</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color: #6366f1; padding: 32px 40px; text-align: center;">
              <img src="https://kitchcalc.com/logo.png" alt="KitchCalc" width="48" height="48" style="border-radius: 12px; margin-bottom: 16px;">
              <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0;">Restablece tu contraseña</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Hola ${userName},
              </p>
              <p style="color: #374151; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                Recibimos una solicitud para restablecer la contraseña de tu cuenta en KitchCalc. Haz clic en el botón de abajo para crear una nueva contraseña.
              </p>
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 0 0 32px 0;">
                Este enlace expira en <strong>${expiryMinutes} minutos</strong> y solo puede usarse una vez.
              </p>
              <!-- CTA Button -->
              <div style="text-align: center; margin: 32px 0;">
                <a href="${resetLink}" style="display: inline-block; background-color: #6366f1; color: #ffffff; font-size: 16px; font-weight: 600; text-decoration: none; padding: 16px 32px; border-radius: 8px;">
                  Restablecer contraseña
                </a>
              </div>
              <!-- Timer Badge -->
              <div style="text-align: center; margin: 24px 0; padding: 12px; background-color: #fef3c7; border-radius: 8px;">
                <span style="color: #92400e; font-size: 14px; font-weight: 600;">
                  ⏱️ Este enlace expira en ${expiryMinutes} minutos
                </span>
              </div>
              <!-- Security Note -->
              <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin: 24px 0 0 0;">
                Si no solicitaste este cambio, puedes ignorar este correo. Tu contraseña actual sigue siendo válida.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                KitchCalc - Tu asistente de costos de recetas<br>
                Este es un correo automático. Por favor no respondas a este mensaje.
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

export interface TokenValidationResult {
  valid: boolean;
  error?: "not_found" | "expired" | "used";
  userId?: string;
  expiresAt?: Date;
}

export async function createPasswordResetToken(
  userId: string,
  expiryMinutes = 10
): Promise<string> {
  const token = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

  await prisma.passwordResetToken.deleteMany({
    where: { userId },
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function validatePasswordResetToken(
  token: string
): Promise<TokenValidationResult> {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!resetToken) {
    return { valid: false, error: "not_found" };
  }

  if (resetToken.usedAt) {
    return { valid: false, error: "used" };
  }

  if (resetToken.expiresAt < new Date()) {
    return { valid: false, error: "expired" };
  }

  return {
    valid: true,
    userId: resetToken.userId,
    expiresAt: resetToken.expiresAt,
  };
}

export async function markTokenAsUsed(token: string): Promise<void> {
  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  });
}

export async function getRemainingSeconds(expiresAt: Date): Promise<number> {
  const now = Date.now();
  const expiry = expiresAt.getTime();
  return Math.max(0, Math.floor((expiry - now) / 1000));
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}