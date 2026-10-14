import { z } from 'zod';

/**
 * Contratos de `/api/account/**`.
 *
 * Los cuerpos son JSON (no `FormData`): el consumidor es el cliente Nuxt y
 * comparte el envelope de error del resto del API. La política de contraseña se
 * valida en el handler con `validatePassword` (misma fuente que sign-up/reset);
 * aquí sólo se exige presencia y forma.
 */
export const accountNameUpdateSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
});

export const accountProfileResponseSchema = z.object({
  firstName: z.string(),
  lastName: z.string(),
});

export const accountPasswordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(1),
});

export const accountEmailChangeSchema = z.object({
  newEmail: z.string().email(),
  currentPassword: z.string().min(1),
});

export const accountOkResponseSchema = z.object({
  ok: z.literal(true),
});

export type AccountNameUpdate = z.infer<typeof accountNameUpdateSchema>;
export type AccountProfileResponse = z.infer<typeof accountProfileResponseSchema>;
export type AccountPasswordChange = z.infer<typeof accountPasswordChangeSchema>;
export type AccountEmailChange = z.infer<typeof accountEmailChangeSchema>;
