import { z } from 'zod';

export const auditActionValues = [
  'sign_in',
  'sign_up',
  'password_change',
  'password_reset',
  'email_change',
  'account_delete',
  'session_revoke',
] as const;

export const auditLogCreateSchema = z.object({
  action: z.enum(auditActionValues),
  ipAddress: z.string().max(64).nullable().optional(),
  userAgent: z.string().max(512).nullable().optional(),
});
