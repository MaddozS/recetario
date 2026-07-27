import { z } from "zod";

// Schema for the response of GET /api/auth/session.
// Documented contract; the API passes through what `auth.api.getSession`
// returns and does not enforce this at runtime. Permissive on optional
// Better-Auth fields (image, ipAddress, userAgent, additionalFields) so
// auth config changes do not break the response shape.
export const AuthSessionUserSchema = z.object({
  id: z.string(),
  email: z.string().nullable(),
  emailVerified: z.boolean().optional(),
  name: z.string().nullable(),
  image: z.string().nullable().optional(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
});

export const AuthSessionRecordSchema = z.object({
  id: z.string(),
  userId: z.string(),
  token: z.string(),
  expiresAt: z.coerce.date(),
  createdAt: z.coerce.date().optional(),
  updatedAt: z.coerce.date().optional(),
  ipAddress: z.string().nullable().optional(),
  userAgent: z.string().nullable().optional(),
});

export const AuthSessionResponseSchema = z.union([
  z.object({
    user: AuthSessionUserSchema,
    session: AuthSessionRecordSchema,
  }),
  z.null(),
]);

export type AuthSessionUser = z.infer<typeof AuthSessionUserSchema>;
export type AuthSessionRecord = z.infer<typeof AuthSessionRecordSchema>;
export type AuthSessionResponse = z.infer<typeof AuthSessionResponseSchema>;
