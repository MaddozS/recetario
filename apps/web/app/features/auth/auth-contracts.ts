import { z } from "zod";

/**
 * Respuestas de los endpoints de auth que consume la UI.
 *
 * Son shapes de transporte de Better Auth / rutas custom, no contrato de
 * dominio: se quedan en la feature para no hacer crecer `@recetario/types`
 * (que describe el API de la aplicación).
 */

/** `POST /api/auth/sign-in/social` → URL de autorización del proveedor. */
export const oauthStartSchema = z.object({
  url: z.string().optional(),
  redirect: z.boolean().optional(),
});

/** `POST /api/auth/forgot-password` (200 incluso si el email no existe). */
export const forgotPasswordResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
});

/** `POST /api/auth/reset-password`. */
export const resetPasswordResponseSchema = z.object({
  success: z.boolean().optional(),
  message: z.string().optional(),
});

/** `GET /api/auth/reset-password?token=` (los enlaces inválidos son 200). */
export const resetTokenValidationSchema = z.object({
  valid: z.boolean(),
  error: z.string().optional(),
  code: z.string().optional(),
  remainingSeconds: z.number().optional(),
});

export type ResetTokenValidation = z.infer<typeof resetTokenValidationSchema>;

/** `GET /api/auth/verify-email?token=`. */
export const verifyEmailResponseSchema = z.object({
  status: z.boolean(),
  user: z.unknown().nullable().optional(),
});
