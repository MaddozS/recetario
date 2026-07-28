import { z } from "zod";

// Shape returned by `GET /api/auth/session`. The web app middleware parses
// this with Zod before building `Astro.locals.user`.
//
// Fields on `user` are best-effort: Better Auth populates its core fields
// (id, email, name, image) plus any `user.additionalFields` configured on
// the server (firstName, lastName, role). Unknown fields are ignored.
export const sessionUserSchema = z
  .object({
    id: z.string(),
    email: z.string().nullable().optional(),
    name: z.string().nullable().optional(),
    image: z.string().nullable().optional(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    role: z.string().optional(),
  })
  .passthrough();

export const sessionObjectSchema = z
  .object({
    id: z.string(),
    userId: z.string(),
    token: z.string(),
    expiresAt: z.string().nullable().optional(),
  })
  .passthrough();

export const sessionResponseSchema = z.union([
  z.object({
    user: sessionUserSchema,
    session: sessionObjectSchema,
  }),
  z.null(),
]);

export type SessionUser = z.infer<typeof sessionUserSchema>;
export type SessionObject = z.infer<typeof sessionObjectSchema>;
export type SessionResponse = z.infer<typeof sessionResponseSchema>;
